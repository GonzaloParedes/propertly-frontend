import {
  aniosDelCalendario,
  buildFilasInquilino,
  buildImportesPendientesInquilino,
  mesesDelCalendario,
  ordenarCuotas,
  puedeSubirComprobante,
} from "@/lib/portal-inquilino";
import type { InvoiceResponse, PaymentResponse, TenantCalendarInvoiceResponse, TenantCalendarPreInvoiceResponse } from "@/lib/backend-types";

function cuota(over: Partial<InvoiceResponse> = {}): InvoiceResponse {
  return {
    id: 1000,
    contractId: 100,
    period: "2026-09-01",
    dueDate: "2026-09-10",
    baseAmount: 478691,
    total: 478691,
    status: "PENDING",
    confirmed: true,
    adjustments: [],
    payments: [],
    ...over,
  };
}

function pago(over: Partial<PaymentResponse> = {}): PaymentResponse {
  return {
    id: 1,
    invoiceId: 1000,
    status: "AWAITING_CONFIRMATION",
    submittedByTenant: true,
    ...over,
  };
}

// --- puedeSubirComprobante ---

describe("puedeSubirComprobante", () => {
  it("una cuota confirmada sin pagos deja subir", () => {
    expect(puedeSubirComprobante(cuota())).toBe(true);
  });

  // Regla ya decidida: sin confirmar, ni el botón se ofrece.
  it("una cuota sin confirmar no deja subir", () => {
    expect(puedeSubirComprobante(cuota({ confirmed: false }))).toBe(false);
  });

  it("con un pago esperando confirmación no deja subir otro", () => {
    const conPago = cuota({ payments: [pago({ status: "AWAITING_CONFIRMATION" })] });
    expect(puedeSubirComprobante(conPago)).toBe(false);
  });

  it("con un pago ya confirmado no deja subir otro", () => {
    const conPago = cuota({ payments: [pago({ status: "CONFIRMED" })] });
    expect(puedeSubirComprobante(conPago)).toBe(false);
  });

  // El backend excluye REJECTED al chequear si hay un pago activo: es lo que
  // permite reintentar después de un rechazo.
  it("con el último pago rechazado, sí deja subir de nuevo", () => {
    const rechazado = cuota({ payments: [pago({ status: "REJECTED" })] });
    expect(puedeSubirComprobante(rechazado)).toBe(true);
  });
});

// --- buildFilasInquilino ---

describe("buildFilasInquilino", () => {
  it("arma la fila con período, vencimiento, monto y estado", () => {
    const [fila] = buildFilasInquilino([cuota({ status: "DUE" })]);
    expect(fila.periodo).toBe("septiembre 2026");
    expect(fila.vencimiento).toBe("10/09/2026");
    expect(fila.monto).toBe("$ 478.691");
    expect(fila.estado).toBe("Vencida");
  });

  it("usa el mismo criterio de estado que Cobranzas: un pago esperando gana", () => {
    const conPago = cuota({ status: "DUE", payments: [pago()] });
    expect(buildFilasInquilino([conPago])[0].estado).toBe("Pago a confirmar");
  });

  it("elige el pago más reciente cuando hay más de uno", () => {
    const cuotaConHistorial = cuota({
      payments: [
        pago({ id: 1, status: "REJECTED" }),
        pago({ id: 2, status: "AWAITING_CONFIRMATION" }),
      ],
    });
    expect(buildFilasInquilino([cuotaConHistorial])[0].pago?.id).toBe(2);
  });

  it("sin pagos, la fila no tiene ninguno que mostrar", () => {
    expect(buildFilasInquilino([cuota()])[0].pago).toBeNull();
  });

  it("una lista vacía da una lista vacía", () => {
    expect(buildFilasInquilino([])).toEqual([]);
  });

  it("usa canSubmitPayment del calendario en vez de derivar un permiso propio", () => {
    const delCalendario: TenantCalendarInvoiceResponse = { ...cuota(), canSubmitPayment: false };
    expect(buildFilasInquilino([delCalendario])[0].puedeSubirComprobante).toBe(false);
  });
});

describe("mesesDelCalendario", () => {
  const coverage = [
    { startDate: "2025-06-15", effectiveEndDate: "2025-09-30" },
    { startDate: "2025-10-01", effectiveEndDate: "2027-05-31" },
  ];

  it("distingue los meses antes, dentro y después de la cadena", () => {
    const meses = mesesDelCalendario(2025, coverage, []);
    expect(meses[0].estado).toBe("antes-del-contrato");
    expect(meses[5].estado).toBe("sin-cuota-generada");
    expect(meses[11].estado).toBe("sin-cuota-generada");
    expect(mesesDelCalendario(2028, coverage, [])[0].estado).toBe("despues-del-contrato");
  });

  it("distingue un hueco entre tramos de una cadena de los meses con cobertura", () => {
    const conHueco = [
      { startDate: "2025-01-01", effectiveEndDate: "2025-03-31" },
      { startDate: "2025-05-01", effectiveEndDate: "2025-12-31" },
    ];
    expect(mesesDelCalendario(2025, conHueco, [])[3].estado).toBe("sin-contrato-vigente");
  });

  it("marca el primer mes de cada sucesor y conserva una cuota histórica", () => {
    const filas = buildFilasInquilino([cuota({ period: "2025-09-01", dueDate: "2025-10-10", status: "DUE" })]);
    const meses = mesesDelCalendario(2025, coverage, filas);

    expect(meses[8].estado).toBe("cuota");
    expect(meses[9].cambioDeCondiciones).toBe(true);
  });

  it("muestra una pre-cuota como importe pendiente y prioriza la factura emitida", () => {
    const preInvoices: TenantCalendarPreInvoiceResponse[] = [{ contractId: 2, period: "2025-10-01", amount: 450000 }];
    const importes = buildImportesPendientesInquilino(preInvoices);
    expect(mesesDelCalendario(2025, coverage, [], importes)[9].estado).toBe("importe-pendiente-confirmacion");
    expect(mesesDelCalendario(2025, coverage, buildFilasInquilino([cuota({ period: "2025-10-01" })]), importes)[9].estado).toBe("cuota");
  });

  it("incluye años de cobertura y de una cuota histórica fuera del intervalo", () => {
    const filas = buildFilasInquilino([cuota({ period: "2024-12-01" })]);
    expect(aniosDelCalendario(coverage, filas)).toEqual([2024, 2025, 2026, 2027]);
  });
});

// --- ordenarCuotas ---

describe("ordenarCuotas", () => {
  it("pone las que requieren atención antes que las pagadas", () => {
    const filas = buildFilasInquilino([
      cuota({ id: 1, status: "PAID" }),
      cuota({ id: 2, status: "DUE" }),
      cuota({ id: 3, status: "PENDING" }),
    ]);
    expect(ordenarCuotas(filas).map((f) => f.estado)).toEqual([
      "Vencida",
      "A vencer",
      "Pagada",
    ]);
  });

  it("un pago a confirmar va antes que una pagada pero después de las vencidas", () => {
    const filas = buildFilasInquilino([
      cuota({ id: 1, status: "PAID" }),
      cuota({ id: 2, status: "PENDING", payments: [pago()] }),
      cuota({ id: 3, status: "DUE" }),
    ]);
    expect(ordenarCuotas(filas).map((f) => f.estado)).toEqual([
      "Vencida",
      "Pago a confirmar",
      "Pagada",
    ]);
  });

  it("dentro del mismo estado, ordena por vencimiento", () => {
    const filas = buildFilasInquilino([
      cuota({ id: 1, status: "DUE", dueDate: "2026-09-20" }),
      cuota({ id: 2, status: "DUE", dueDate: "2026-09-05" }),
    ]);
    expect(ordenarCuotas(filas).map((f) => f.vencimientoISO)).toEqual([
      "2026-09-05",
      "2026-09-20",
    ]);
  });

  it("no muta el array original", () => {
    const filas = buildFilasInquilino([cuota({ id: 1, status: "PAID" }), cuota({ id: 2, status: "DUE" })]);
    const original = [...filas];
    ordenarCuotas(filas);
    expect(filas).toEqual(original);
  });
});
