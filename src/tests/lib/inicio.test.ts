import {
  avisosPendientes,
  contratosVigentes,
  periodoCorriente,
  periodoSiguiente,
  proporciones,
  proyeccionDelMes,
  resumenDeCartera,
  resumenDeCobranza,
} from "@/lib/inicio";
import type {
  ContractResponse,
  InvoiceResponse,
  PreInvoiceResponse,
  PropertyResponse,
} from "@/lib/backend-types";

const HOY = "2026-09-28";

const PROPIEDAD: PropertyResponse = {
  id: 10,
  street: "Av. Rivadavia",
  number: "2340",
  floorUnit: "5.º A",
  city: "CABA",
  province: "CABA",
  category: "APARTMENT",
};

const CONTRATO: ContractResponse = {
  id: 100,
  property: PROPIEDAD,
  tenant: {
    id: 1,
    firstName: "Jorge",
    lastName: "Paletta",
    taxId: "20224567899",
    email: "jorge@ejemplo.com",
    phoneNumber: "+5491144552210",
  },
  initialRentAmount: 400000,
  startDate: "2025-03-01",
  termMonths: 36,
  dueDay: 10,
  endDate: "2028-02-29",
  status: "ACTIVE",
  incrementMethod: "FIXED_PERCENTAGE",
  incrementFrequencyMonths: 3,
  currentRent: 478691,
};

function cuota(extra: Partial<InvoiceResponse> = {}): InvoiceResponse {
  return {
    id: 1,
    contractId: 100,
    period: "2026-09-01",
    dueDate: "2026-09-10",
    baseAmount: 100000,
    total: 100000,
    status: "PENDING",
    confirmed: true,
    adjustments: [],
    payments: [],
    ...extra,
  };
}

// --- Períodos ---

describe("períodos", () => {
  it("el corriente es el día 1 del mes, como fecha completa", () => {
    expect(periodoCorriente(HOY)).toBe("2026-09-01");
  });

  it("el siguiente cruza el año sin romperse", () => {
    expect(periodoSiguiente("2026-12-15")).toBe("2027-01-01");
    expect(periodoSiguiente(HOY)).toBe("2026-10-01");
  });
});

// --- Cobranza ---

describe("resumenDeCobranza", () => {
  it("reparte los montos entre los tres estados", () => {
    const r = resumenDeCobranza([
      cuota({ id: 1, status: "PAID", total: 430000, payments: [{ id: 1, invoiceId: 1, status: "CONFIRMED", submittedByTenant: false }] }),
      cuota({ id: 2, status: "PENDING", total: 505000 }),
      cuota({ id: 3, status: "DUE", total: 478691 }),
    ]);
    expect(r.cobrado).toBe(430000);
    expect(r.aVencer).toBe(505000);
    expect(r.vencido).toBe(478691);
    expect(r.emitido).toBe(1413691);
    expect(r.cobradas).toBe(1);
    expect(r.cuotas).toBe(3);
  });

  it("un pago esperando confirmación no cuenta como cobrado", () => {
    const esperando = cuota({
      status: "DUE",
      total: 520000,
      payments: [{ id: 9, invoiceId: 1, status: "AWAITING_CONFIRMATION", submittedByTenant: true }],
    });
    const r = resumenDeCobranza([esperando]);
    expect(r.cobrado).toBe(0);
    expect(r.vencido).toBe(520000);
  });

  it("uno esperando pero no vencido todavía cuenta por vencer", () => {
    const esperando = cuota({
      status: "PENDING",
      total: 520000,
      payments: [{ id: 9, invoiceId: 1, status: "AWAITING_CONFIRMATION", submittedByTenant: true }],
    });
    expect(resumenDeCobranza([esperando]).aVencer).toBe(520000);
  });

  it("un mes sin cuotas no inventa montos", () => {
    expect(resumenDeCobranza([])).toEqual({
      cobrado: 0,
      aVencer: 0,
      vencido: 0,
      emitido: 0,
      cuotas: 0,
      cobradas: 0,
    });
  });
});

describe("proporciones", () => {
  it("reparte en porcentaje sobre lo emitido", () => {
    const p = proporciones({
      cobrado: 250,
      aVencer: 250,
      vencido: 500,
      emitido: 1000,
      cuotas: 3,
      cobradas: 1,
    });
    expect(p).toEqual({ cobrado: 25, aVencer: 25, vencido: 50 });
  });

  it("sin nada emitido no divide por cero", () => {
    const p = proporciones({ cobrado: 0, aVencer: 0, vencido: 0, emitido: 0, cuotas: 0, cobradas: 0 });
    expect(p).toEqual({ cobrado: 0, aVencer: 0, vencido: 0 });
  });
});

// --- Proyección ---

describe("proyeccionDelMes", () => {
  const pre = (contractId: number, amount: number): PreInvoiceResponse => ({
    contractId,
    period: "2026-10-01",
    amount,
  });

  it("suma las proyecciones cuando están todas", () => {
    const r = proyeccionDelMes([pre(100, 478691), pre(200, 520000)], [
      CONTRATO,
      { ...CONTRATO, id: 200 },
    ]);
    expect(r.total).toBe(998691);
    expect(r.aDefinir).toBe(0);
  });

  it("cuenta aparte el contrato sin proyección, sin estimarlo", () => {
    const r = proyeccionDelMes([pre(100, 478691)], [CONTRATO, { ...CONTRATO, id: 200 }]);
    expect(r.total).toBe(478691);
    expect(r.aDefinir).toBe(1);
  });

  // Un «$ 0» diría que no va a cobrar nada, que es lo contrario de «no se sabe».
  it("sin ninguna proyección no devuelve total", () => {
    const r = proyeccionDelMes([], [CONTRATO, { ...CONTRATO, id: 200 }]);
    expect(r.total).toBeNull();
    expect(r.aDefinir).toBe(2);
  });

  it("no cuenta como pendientes los contratos que ya no están vigentes", () => {
    const r = proyeccionDelMes([pre(100, 478691)], [
      CONTRATO,
      { ...CONTRATO, id: 200, status: "TERMINATED" },
    ]);
    expect(r.aDefinir).toBe(0);
  });
});

// --- Avisos ---

describe("avisosPendientes", () => {
  it("sin nada pendiente no devuelve avisos", () => {
    expect(avisosPendientes([cuota({ status: "PAID" })], [CONTRATO], HOY)).toEqual([]);
  });

  it("nombra al inquilino, la propiedad y desde cuándo espera el comprobante", () => {
    const esperando = cuota({
      total: 520000,
      payments: [
        {
          id: 9,
          invoiceId: 1,
          status: "AWAITING_CONFIRMATION",
          submittedByTenant: true,
          submittedAt: "2026-09-19T10:00:00Z",
        },
      ],
    });
    const [aviso] = avisosPendientes([esperando], [CONTRATO], HOY);
    expect(aviso.tono).toBe("info");
    expect(aviso.titulo).toContain("Jorge Paletta");
    expect(aviso.cuerpo).toContain("Av. Rivadavia 2340, 5.º A");
    expect(aviso.cuerpo).toContain("$ 520.000");
    expect(aviso.cuerpo).toContain("hace 9 días");
  });

  it("sin la fecha del comprobante el aviso se muestra igual", () => {
    const esperando = cuota({
      payments: [{ id: 9, invoiceId: 1, status: "AWAITING_CONFIRMATION", submittedByTenant: true }],
    });
    const [aviso] = avisosPendientes([esperando], [CONTRATO], HOY);
    expect(aviso.titulo).toContain("Jorge Paletta");
    expect(aviso.cuerpo).not.toContain("Subió el comprobante");
  });

  it("explica por qué una cuota sin confirmar bloquea el cobro", () => {
    const [aviso] = avisosPendientes([cuota({ confirmed: false })], [CONTRATO], HOY);
    expect(aviso.tono).toBe("warn");
    expect(aviso.cuerpo).toContain("no se puede registrar un pago");
  });

  it("agrupa las vencidas en un solo aviso con el total", () => {
    const avisos = avisosPendientes(
      [
        cuota({ id: 1, status: "DUE", total: 478691, dueDate: "2026-09-10" }),
        cuota({ id: 2, status: "DUE", total: 520000, dueDate: "2026-09-20" }),
      ],
      [CONTRATO],
      HOY
    );
    const vencidas = avisos.find((a) => a.id === "vencidas");
    expect(vencidas?.titulo).toBe("2 cuotas vencidas sin pago");
    expect(vencidas?.cuerpo).toContain("$ 998.691");
    // La más antigua mide el atraso real.
    expect(vencidas?.cuerpo).toContain("hace 18 días");
  });

  it("una sola vencida se dice en singular", () => {
    const avisos = avisosPendientes([cuota({ status: "DUE" })], [CONTRATO], HOY);
    expect(avisos.find((a) => a.id === "vencidas")?.titulo).toBe("Una cuota vencida sin pago");
  });

  it("los tres tipos conviven, y el más urgente va primero", () => {
    const avisos = avisosPendientes(
      [
        cuota({ id: 1, status: "DUE" }),
        cuota({ id: 2, confirmed: false }),
        cuota({
          id: 3,
          payments: [
            { id: 9, invoiceId: 3, status: "AWAITING_CONFIRMATION", submittedByTenant: true },
          ],
        }),
      ],
      [CONTRATO],
      HOY
    );
    expect(avisos.map((a) => a.tono)).toEqual(["info", "warn", "bad"]);
  });

  it("no se rompe si no encuentra el contrato de la cuota", () => {
    const [aviso] = avisosPendientes([cuota({ contractId: 999, confirmed: false })], [], HOY);
    expect(aviso.titulo).toContain("Una propiedad");
  });
});

// --- Cartera y contratos ---

describe("resumenDeCartera", () => {
  it("separa las alquiladas de las libres", () => {
    const r = resumenDeCartera([
      { ...PROPIEDAD, id: 1, activeContract: { id: 100, currentRent: 1, status: "ACTIVE" } },
      { ...PROPIEDAD, id: 2, activeContract: null },
    ]);
    expect(r).toEqual({ total: 2, conContrato: 1, sinAlquilar: 1 });
  });

  it("sin propiedades da todo en cero", () => {
    expect(resumenDeCartera([])).toEqual({ total: 0, conContrato: 0, sinAlquilar: 0 });
  });
});

describe("contratosVigentes", () => {
  it("deja fuera los que terminaron, vencieron o fueron reemplazados", () => {
    const r = contratosVigentes([
      CONTRATO,
      { ...CONTRATO, id: 2, status: "TERMINATED" },
      { ...CONTRATO, id: 3, status: "EXPIRED" },
      { ...CONTRATO, id: 4, status: "SUPERSEDED" },
    ]);
    expect(r.map((c) => c.id)).toEqual([100]);
  });
});
