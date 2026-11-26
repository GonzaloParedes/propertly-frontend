import {
  avisoDeCuotasSinConfirmar,
  buildFilasCobranza,
  cobradoDelMes,
  contarPorFiltro,
  estadoDeCuota,
  filtrar,
  plazoDeCuota,
  resumenCobranzas,
  resumenDeRecargo,
} from "@/lib/cobranzas";
import { vistaDeRecargo } from "@/lib/recargo";
import type {
  ContractResponse,
  InvoiceResponse,
  LateFeeResponse,
  PaymentResponse,
  PropertyResponse,
  TenantResponse,
} from "@/lib/backend-types";

function tenant(over: Partial<TenantResponse> = {}): TenantResponse {
  return {
    id: 1, firstName: "Jorge", lastName: "Paletta", taxId: "20224567899",
    email: "jorge@ejemplo.com", phoneNumber: "+5491144552210", ...over,
  };
}

function property(over: Partial<PropertyResponse> = {}): PropertyResponse {
  return {
    id: 10, street: "Av. Rivadavia", number: "2340", floorUnit: "5.º A",
    city: "CABA", province: "CABA", latitude: -34.6037, longitude: -58.3816, category: "APARTMENT", ...over,
  };
}

function contract(over: Partial<ContractResponse> = {}): ContractResponse {
  return {
    id: 100, property: property(), tenant: tenant(), initialRentAmount: 400000,
    startDate: "2025-03-01", termMonths: 36, dueDay: 1, endDate: "2028-03-01",
    status: "ACTIVE", incrementMethod: "FIXED_PERCENTAGE", incrementFrequencyMonths: 3,
    currentRent: 478691, tenantNotificationsEnabled: true, ...over,
  };
}

function payment(over: Partial<PaymentResponse> = {}): PaymentResponse {
  return { id: 500, invoiceId: 1000, status: "CONFIRMED", submittedByTenant: false, ...over };
}

function invoice(over: Partial<InvoiceResponse> = {}): InvoiceResponse {
  return {
    id: 1000, contractId: 100, period: "2026-08-01", dueDate: "2026-08-10",
    baseAmount: 478691, total: 478691, amountDue: 478691, lateFee: null, status: "PENDING", confirmed: true,
    adjustments: [], payments: [], ...over,
  };
}

// --- estado ---

describe("estadoDeCuota", () => {
  it("traduce los tres estados de la cuota", () => {
    expect(estadoDeCuota(invoice({ status: "PENDING" }))).toBe("A vencer");
    expect(estadoDeCuota(invoice({ status: "DUE" }))).toBe("Vencida");
    expect(estadoDeCuota(invoice({ status: "PAID" }))).toBe("Pagada");
  });

  // Lo que falta ahí es un click del propietario, no un reclamo al inquilino.
  it("un comprobante esperando le gana a la cuota vencida", () => {
    const cuota = invoice({
      status: "DUE",
      payments: [payment({ status: "AWAITING_CONFIRMATION", submittedByTenant: true })],
    });
    expect(estadoDeCuota(cuota)).toBe("Pago a confirmar");
  });

  it("un pago rechazado no cambia el estado de la cuota", () => {
    const cuota = invoice({ status: "DUE", payments: [payment({ status: "REJECTED" })] });
    expect(estadoDeCuota(cuota)).toBe("Vencida");
  });
});

// --- acción ---

describe("la acción de cada fila", () => {
  const fila = (over: Partial<InvoiceResponse>) =>
    buildFilasCobranza([invoice(over)], [contract()])[0];

  it("con un comprobante esperando, se revisa", () => {
    expect(fila({ payments: [payment({ status: "AWAITING_CONFIRMATION" })] }).accion).toBe("revisar");
  });

  // El backend rechaza el pago de una cuota sin confirmar, así que confirmar
  // tiene que ir antes que registrar.
  it("sin confirmar, se confirma antes que nada", () => {
    expect(fila({ confirmed: false, status: "DUE" }).accion).toBe("confirmar");
  });

  it("confirmada y sin pagar, se registra el pago", () => {
    expect(fila({ confirmed: true, status: "DUE" }).accion).toBe("registrar");
  });

  it("pagada, sólo queda bajar el comprobante", () => {
    const f = fila({ status: "PAID", payments: [payment({ status: "CONFIRMED" })] });
    expect(f.accion).toBe("comprobante");
    expect(f.pagoConfirmado?.id).toBe(500);
  });
});

// --- las filas ---

describe("buildFilasCobranza", () => {
  it("nombra la fila por la propiedad y el inquilino de su contrato", () => {
    const [fila] = buildFilasCobranza([invoice()], [contract()]);
    expect(fila.direccion).toBe("Av. Rivadavia 2340, 5.º A");
    expect(fila.inquilino).toBe("Jorge Paletta");
    expect(fila.periodo).toBe("agosto 2026");
    expect(fila.monto).toBe("$ 478.691");
  });

  // ALQ-187: un contrato en dólares mostraba sus cuotas como pesos.
  it("muestra el monto en la moneda del contrato", () => {
    const [fila] = buildFilasCobranza([invoice({ currency: "USD", amountDue: 1200, total: 1200 })], [contract({ currency: "USD" })]);
    expect(fila.monto).toBe("US$ 1.200");
    expect(fila.moneda).toBe("USD");
  });

  it("con un backend sin moneda en la cuota, usa la del contrato", () => {
    const [fila] = buildFilasCobranza([invoice({ amountDue: 1200, total: 1200 })], [contract({ currency: "USD" })]);
    expect(fila.monto).toBe("US$ 1.200");
  });

  // El backend manda LocalDate sin zona; pasarlo por new Date() lo correría un
  // día para atrás en Argentina.
  it("no corre la fecha de vencimiento un día", () => {
    const [fila] = buildFilasCobranza([invoice({ dueDate: "2026-08-01" })], [contract()]);
    expect(fila.vencimiento).toBe("01/08/2026");
  });

  it("ordena por vencimiento, lo más reciente arriba", () => {
    const filas = buildFilasCobranza(
      [
        invoice({ id: 1, dueDate: "2026-06-10" }),
        invoice({ id: 2, dueDate: "2026-08-10" }),
        invoice({ id: 3, dueDate: "2026-07-10" }),
      ],
      [contract()]
    );
    expect(filas.map((f) => f.invoiceId)).toEqual([2, 3, 1]);
  });

  it("no se cae si la cuota apunta a un contrato que no vino en la lista", () => {
    const [fila] = buildFilasCobranza([invoice({ contractId: 999 })], [contract()]);
    expect(fila.direccion).toBe("—");
    expect(fila.inquilino).toBe("—");
  });
});

// --- filtros ---

describe("filtros y conteos", () => {
  const filas = buildFilasCobranza(
    [
      invoice({ id: 1, status: "DUE" }),
      invoice({ id: 2, status: "PENDING" }),
      invoice({ id: 3, status: "PAID", payments: [payment()] }),
      invoice({ id: 4, status: "DUE", payments: [payment({ status: "AWAITING_CONFIRMATION" })] }),
    ],
    [contract()]
  );

  it("cuenta cada filtro sobre el total", () => {
    expect(contarPorFiltro(filas)).toEqual({ todas: 4, vencidas: 1, aVencer: 2, pagadas: 1 });
  });

  // Un comprobante sin confirmar no es plata cobrada.
  it("el pago a confirmar cuenta como por cobrar, no como pagada", () => {
    expect(filtrar(filas, "pagadas").map((f) => f.invoiceId)).toEqual([3]);
    expect(filtrar(filas, "aVencer").map((f) => f.invoiceId)).toContain(4);
  });
});

describe("resumenCobranzas", () => {
  it("dice lo que hay en vez de afirmar un mes fijo", () => {
    const filas = buildFilasCobranza(
      [invoice({ id: 1, status: "DUE" }), invoice({ id: 2, status: "PENDING" })],
      [contract()]
    );
    expect(resumenCobranzas(filas)).toBe("2 cuotas · 1 vencida · 1 por cobrar");
  });

  it("avisa cuando está todo cobrado", () => {
    const filas = buildFilasCobranza([invoice({ status: "PAID" })], [contract()]);
    expect(resumenCobranzas(filas)).toBe("1 cuota · todo cobrado");
  });

  it("no inventa un resumen si no hay cuotas", () => {
    expect(resumenCobranzas([])).toBe("Todavía no hay cuotas emitidas.");
  });
});

// --- lo que dice la columna «Vence» ---

describe("plazoDeCuota", () => {
  const HOY = "2026-08-25";
  const filaCon = (over: Partial<InvoiceResponse>) => buildFilasCobranza([invoice(over)], [contract()], HOY)[0];

  it("vencida: cuántos días hace, en rojo, y las tres formas de decirlo", () => {
    const { plazo } = filaCon({ status: "DUE", dueDate: "2026-08-10" });

    expect(plazo).toEqual({
      fecha: "10/08/2026", relativo: "hace 15 días", vencida: true,
      largo: "Venció el 10/08, hace 15 días", corto: "venció 10/08",
    });
  });

  it("vencida ayer: «ayer», no «hace 1 días»", () => {
    expect(filaCon({ status: "DUE", dueDate: "2026-08-24" }).plazo.relativo).toBe("ayer");
  });

  it("a vencer: en cuántos días, sin rojo", () => {
    const { plazo } = filaCon({ status: "PENDING", dueDate: "2026-08-28" });

    expect(plazo).toMatchObject({ relativo: "en 3 días", vencida: false, largo: "Vence el 28/08, en 3 días", corto: "vence 28/08" });
  });

  it("vence hoy y vence mañana", () => {
    expect(filaCon({ status: "PENDING", dueDate: "2026-08-25" }).plazo).toMatchObject({ relativo: "hoy", largo: "Vence hoy" });
    expect(filaCon({ status: "PENDING", dueDate: "2026-08-26" }).plazo.relativo).toBe("mañana");
  });

  it("pagada: dice el día del pago, en hora argentina, no el de vencimiento", () => {
    const { plazo } = filaCon({
      status: "PAID", dueDate: "2026-08-05",
      // 01:30 UTC del 05/08 todavía es 04/08 en Buenos Aires.
      payments: [payment({ submittedAt: "2026-08-05T01:30:00Z" })],
    });

    expect(plazo).toMatchObject({ fecha: "05/08/2026", relativo: "pagada el 04/08", vencida: false, largo: "Pagada el 04/08", corto: "pagada el 04/08" });
  });

  it("con un comprobante esperando: «pagó el…», aunque la cuota esté vencida", () => {
    const { plazo } = filaCon({
      status: "DUE", dueDate: "2026-08-10",
      payments: [payment({ status: "AWAITING_CONFIRMATION", submittedAt: "2026-08-09T15:00:00Z" })],
    });

    expect(plazo).toMatchObject({ relativo: "pagó el 09/08", vencida: false, largo: "Pagó el 09/08" });
  });

  it("un pago sin fecha (el del alta) sólo dice que está pagada", () => {
    const { plazo } = filaCon({ status: "PAID", payments: [payment({ origin: "ONBOARDING", hasReceipt: false })] });

    expect(plazo.relativo).toBe("pagada");
  });

  it("de otro año, la fecha corta incluye el año para no confundirse", () => {
    expect(filaCon({ status: "DUE", dueDate: "2025-12-10" }).plazo.corto).toBe("venció 10/12/2025");
  });

  it("se calcula con los datos de la fila, sin volver a pedir nada", () => {
    const fila = filaCon({ status: "DUE", dueDate: "2026-08-10" });

    expect(plazoDeCuota(fila, "2026-08-11").relativo).toBe("ayer");
  });

  it("una cuota que cambia con los días hace que la pantalla se vuelva a leer a medianoche", () => {
    expect(filaCon({ status: "DUE" }).dependeDelDia).toBe(true);
    expect(filaCon({ status: "PENDING", dueDate: "2026-09-10" }).dependeDelDia).toBe(true);
    expect(filaCon({ status: "PAID", payments: [payment()] }).dependeDelDia).toBe(false);
  });
});

// --- la línea de recargo de la tabla ---

describe("resumenDeRecargo", () => {
  const lateFee = (over: Partial<LateFeeResponse> = {}): LateFeeResponse => ({
    method: "PERCENT_PER_DAY", value: 1.5, accruesFrom: "2026-08-11", asOf: "2026-08-14", daysLate: 3,
    amount: 6750, nextDayAmount: 9000, state: "ACCRUING", overridden: false, ...over,
  });
  const resumen = (over: Partial<LateFeeResponse>, amountDue = 485441) =>
    resumenDeRecargo(vistaDeRecargo(invoice({ lateFee: lateFee(over), amountDue }), "propietario"));

  it("sin recargo no hay línea", () => {
    expect(resumenDeRecargo(null)).toBeNull();
  });

  // El monto de la fila ya es lo que se adeuda hoy: «+» lo contaría dos veces.
  it("corriendo: dice que el importe lo incluye, en tono de advertencia", () => {
    expect(resumen({})).toEqual({ texto: "incluye $ 6.750 de recargo", tono: "adv" });
  });

  it("antes de empezar: desde cuándo corre, sin sumar nada", () => {
    expect(resumen({ state: "NOT_STARTED", amount: 0, nextDayAmount: 2250, accruesFrom: "2026-08-16" }, 478691))
      .toEqual({ texto: "Recargo desde el 16/08", tono: "neutro" });
  });

  it("perdonado por el propietario", () => {
    expect(resumen({ overridden: true, amount: 0, nextDayAmount: 0 }, 478691))
      .toEqual({ texto: "Recargo perdonado", tono: "neutro" });
  });
});

// --- el aviso de arriba de la tabla ---

describe("avisoDeCuotasSinConfirmar", () => {
  const HOY = "2026-08-25";
  const punitorios: LateFeeResponse = {
    method: "FIXED_PER_DAY", value: 1250, accruesFrom: "2026-08-11", asOf: "2026-08-14", daysLate: 3,
    amount: 6750, nextDayAmount: 8000, state: "ACCRUING", overridden: false,
  };
  const filas = (...cuotas: InvoiceResponse[]) => buildFilasCobranza(cuotas, [contract()], HOY);

  it("sin cuotas sin confirmar no hay aviso", () => {
    expect(avisoDeCuotasSinConfirmar(filas(invoice()))).toBeNull();
  });

  it("una: nombra la propiedad, cuenta que el recargo corre y deja confirmar desde el aviso", () => {
    const [fila] = filas(invoice({ confirmed: false, status: "DUE", lateFee: punitorios }));
    const aviso = avisoDeCuotasSinConfirmar([fila]);

    expect(aviso).toEqual({
      urgente: true,
      titulo: "Av. Rivadavia 2340, 5.º A tiene el importe sin confirmar.",
      detalle: "El inquilino no puede pagarla en el portal hasta que lo confirme. El recargo por atraso corre igual.",
      cuota: fila,
    });
  });

  it("sin punitorios no habla de recargo", () => {
    expect(avisoDeCuotasSinConfirmar(filas(invoice({ confirmed: false })))?.detalle).not.toMatch(/recargo/);
  });

  it("varias: las cuenta y no ofrece ninguna en particular", () => {
    const aviso = avisoDeCuotasSinConfirmar(filas(
      invoice({ id: 1, confirmed: false, dueDate: "2099-01-10" }),
      invoice({ id: 2, confirmed: false, dueDate: "2099-01-10" }),
      invoice({ id: 3, confirmed: true }),
    ));

    expect(aviso).toMatchObject({ urgente: false, titulo: "2 cuotas tienen el importe sin confirmar.", cuota: null });
  });

  it("es urgente si alguna ya venció", () => {
    const aviso = avisoDeCuotasSinConfirmar(filas(
      invoice({ id: 1, confirmed: false, dueDate: "2099-01-10" }),
      invoice({ id: 2, confirmed: false, dueDate: "2026-08-10" }),
    ));

    expect(aviso?.urgente).toBe(true);
  });
});

// --- «Cobrado del mes» ---

describe("cobradoDelMes", () => {
  const HOY = "2026-08-25";
  const filas = (...cuotas: InvoiceResponse[]) => buildFilasCobranza(cuotas, [contract()], HOY);

  it("lo pagado contra lo que se adeuda de las cuotas del mes", () => {
    const resultado = cobradoDelMes(filas(
      invoice({ id: 1, status: "DUE", amountDue: 488491, total: 478691 }),
      invoice({ id: 2, status: "PAID", dueDate: "2026-08-05", amountDue: 430000, total: 430000, payments: [payment()] }),
    ));

    expect(resultado).toEqual({ cobrado: "$ 430.000", total: "$ 918.491" });
  });

  // Un comprobante sin confirmar no es plata cobrada.
  it("un pago esperando revisión todavía no cuenta como cobrado", () => {
    const resultado = cobradoDelMes(filas(invoice({ payments: [payment({ status: "AWAITING_CONFIRMATION" })] })));

    expect(resultado).toEqual({ cobrado: "$ 0", total: "$ 478.691" });
  });

  it("deja afuera las cuotas de otros meses", () => {
    const resultado = cobradoDelMes(filas(
      invoice({ id: 1, dueDate: "2026-07-10", status: "PAID", payments: [payment()] }),
      invoice({ id: 2, dueDate: "2026-08-10" }),
    ));

    expect(resultado?.total).toBe("$ 478.691");
  });

  it("no mezcla pesos con dólares", () => {
    const usd = contract({ id: 101, currency: "USD" });
    const cuotas = [invoice({ id: 1, contractId: 100 }), invoice({ id: 2, contractId: 101, amountDue: 1200, total: 1200 })];
    const resultado = cobradoDelMes(buildFilasCobranza(cuotas, [contract(), usd], HOY));

    expect(resultado?.total).toBe("$ 478.691 · US$ 1.200");
  });

  it("sin cuotas del mes no hay nada que mostrar", () => {
    expect(cobradoDelMes(filas(invoice({ dueDate: "2026-06-10" })))).toBeNull();
    expect(cobradoDelMes([])).toBeNull();
  });
});
