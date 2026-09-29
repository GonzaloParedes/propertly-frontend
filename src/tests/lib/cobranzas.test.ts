import {
  buildFilasCobranza,
  contarPorFiltro,
  estadoDeCuota,
  filtrar,
  resumenCobranzas,
} from "@/lib/cobranzas";
import type {
  ContractResponse,
  InvoiceResponse,
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
    city: "CABA", province: "CABA", category: "APARTMENT", ...over,
  };
}

function contract(over: Partial<ContractResponse> = {}): ContractResponse {
  return {
    id: 100, property: property(), tenant: tenant(), initialRentAmount: 400000,
    startDate: "2025-03-01", termMonths: 36, dueDay: 1, endDate: "2028-03-01",
    status: "ACTIVE", incrementMethod: "FIXED_PERCENTAGE", incrementFrequencyMonths: 3,
    currentRent: 478691, ...over,
  };
}

function payment(over: Partial<PaymentResponse> = {}): PaymentResponse {
  return { id: 500, invoiceId: 1000, status: "CONFIRMED", submittedByTenant: false, ...over };
}

function invoice(over: Partial<InvoiceResponse> = {}): InvoiceResponse {
  return {
    id: 1000, contractId: 100, period: "2026-08-01", dueDate: "2026-08-10",
    baseAmount: 478691, total: 478691, status: "PENDING", confirmed: true,
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
