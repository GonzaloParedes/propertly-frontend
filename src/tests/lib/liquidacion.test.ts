import { armarLiquidacion, numeroDeCuota, puedeEmitirLiquidacion } from "@/lib/liquidacion";
import type { ContractResponse, InvoiceResponse, LateFeeResponse, PaymentResponse } from "@/lib/backend-types";

const CONTRATO = {
  id: 100,
  property: { id: 10, street: "Av. Rivadavia", number: "2340", floorUnit: "5.º A", city: "CABA", province: "CABA" },
  tenant: { id: 1, firstName: "Jorge", lastName: "Paletta", taxId: "20224567899" },
  initialRentAmount: 400000, startDate: "2025-03-01", termMonths: 36, dueDay: 1,
  endDate: "2028-03-01", status: "ACTIVE", incrementMethod: "FIXED_PERCENTAGE",
} as ContractResponse;

const DUENO = { firstName: "Marta", lastName: "Gómez", taxId: "27123456780" };

const pago = (over: Partial<PaymentResponse> = {}): PaymentResponse => ({
  id: 500, invoiceId: 1000, status: "CONFIRMED", submittedByTenant: true, origin: "TENANT",
  hasReceipt: true, receiptFileName: "transferencia.pdf", submittedAt: "2026-08-08T15:30:00Z", ...over,
});

const cuota = (over: Partial<InvoiceResponse> = {}): InvoiceResponse => ({
  id: 1000, contractId: 100, period: "2026-08-01", dueDate: "2026-08-10",
  baseAmount: 450000, total: 450000, amountDue: 450000, lateFee: null, status: "PAID", confirmed: true,
  adjustments: [], payments: [pago()], ...over,
});

const recargo = (over: Partial<LateFeeResponse> = {}): LateFeeResponse => ({
  method: "PERCENT_PER_DAY", value: 0.1, accruesFrom: "2026-08-11", asOf: "2026-08-14", daysLate: 4,
  amount: 4500, nextDayAmount: 4500, state: "SETTLED", overridden: false, ...over,
});

const armar = (invoice: InvoiceResponse, contract = CONTRATO) =>
  armarLiquidacion({ invoice, contract, owner: DUENO, hoyISO: "2026-08-20" });

describe("puedeEmitirLiquidacion", () => {
  it("acepta una cuota pagada con un pago confirmado del inquilino", () => {
    expect(puedeEmitirLiquidacion(cuota())).toBe(true);
  });

  it("acepta el pago confirmado del propietario", () => {
    expect(puedeEmitirLiquidacion(cuota({ payments: [pago({ origin: "LANDLORD", submittedByTenant: false })] }))).toBe(true);
  });

  it("trata un pago sin origen como no del alta", () => {
    expect(puedeEmitirLiquidacion(cuota({ payments: [pago({ origin: undefined })] }))).toBe(true);
  });

  it("rechaza un pago del alta", () => {
    expect(puedeEmitirLiquidacion(cuota({ payments: [pago({ origin: "ONBOARDING" })] }))).toBe(false);
  });

  it("rechaza una cuota que no está pagada", () => {
    expect(puedeEmitirLiquidacion(cuota({ status: "DUE" }))).toBe(false);
  });

  it("rechaza una cuota sin pago confirmado", () => {
    expect(puedeEmitirLiquidacion(cuota({ payments: [pago({ status: "REJECTED" })] }))).toBe(false);
    expect(puedeEmitirLiquidacion(cuota({ payments: [] }))).toBe(false);
  });
});

describe("numeroDeCuota", () => {
  it("cuenta el mes de inicio como la cuota 1", () => {
    expect(numeroDeCuota("2025-03-01", "2025-03-01")).toBe(1);
  });

  it("cruza el cambio de año", () => {
    expect(numeroDeCuota("2025-11-15", "2026-02-01")).toBe(4);
  });

  it("cuenta la última cuota del plazo", () => {
    expect(numeroDeCuota("2025-03-01", "2028-02-01")).toBe(36);
  });
});

describe("armarLiquidacion", () => {
  it("arma una cuota simple sin tabla de conceptos", () => {
    const l = armar(cuota());

    expect(l).toMatchObject({
      numero: "N° 00000500",
      fechaEmision: "20/08/2026",
      emisor: { nombre: "Marta Gómez", taxId: "27-12345678-0" },
      inquilino: { nombre: "Jorge Paletta", taxId: "20-22456789-9" },
      periodo: "agosto 2026",
      cuota: { numero: 18, total: 36 },
      direccion: "Av. Rivadavia 2340, 5.º A",
      vigencia: { desde: "01/03/2025", hasta: "01/03/2028" },
      moneda: "ARS",
      montoPagado: "$ 450.000",
      montoEnLetras: "Son pesos cuatrocientos cincuenta mil con 00/100",
      fechaPago: "08/08/2026",
      comprobante: "transferencia.pdf",
      conceptos: null,
      nombreArchivo: "liquidacion-2026-08-500.pdf",
    });
  });

  it("usa amountDue como monto pagado, sin recalcular", () => {
    const l = armar(cuota({ total: 450000, amountDue: 454500, lateFee: recargo() }));
    expect(l.montoPagado).toBe("$ 454.500");
  });

  it("lista la cuota base, los ajustes y el recargo, y suman el monto pagado", () => {
    const invoice = cuota({
      baseAmount: 450000,
      total: 450000 - 45000 + 20000,
      amountDue: 450000 - 45000 + 20000 + 4500,
      adjustments: [
        { id: 1, name: "Quita pactada", kind: "DISCOUNT", valueType: "PERCENTAGE", value: 10 },
        { id: 2, name: "Expensas extraordinarias", kind: "SURCHARGE", valueType: "FIXED_AMOUNT", value: 20000 },
      ],
      lateFee: recargo(),
    });
    const l = armar(invoice);

    expect(l.conceptos).toEqual([
      { descripcion: "Alquiler agosto 2026", monto: "$ 450.000", extra: false },
      { descripcion: "Quita pactada", detalle: "10 % del importe base", monto: "− $ 45.000", extra: true },
      { descripcion: "Expensas extraordinarias", monto: "+ $ 20.000", extra: true },
      { descripcion: "Recargo por atraso", detalle: "4 días de atraso", monto: "+ $ 4.500", extra: true },
    ]);
    // Los importes con signo suman lo que el backend dice que se pagó.
    const suma = 450000 + -45000 + 20000 + 4500;
    expect(suma).toBe(invoice.amountDue);
    expect(l.montoPagado).toBe("$ 429.500");
  });

  it("lista conceptos con sólo un recargo saldado", () => {
    const l = armar(cuota({ amountDue: 454500, lateFee: recargo({ daysLate: 1 }) }));
    expect(l.conceptos?.map((c) => c.descripcion)).toEqual(["Alquiler agosto 2026", "Recargo por atraso"]);
    expect(l.conceptos?.[1].detalle).toBe("1 día de atraso");
  });

  it("no lista conceptos si el recargo existe pero es cero", () => {
    expect(armar(cuota({ lateFee: recargo({ amount: 0, daysLate: 0 }) })).conceptos).toBeNull();
  });

  it("omite el CUIT del inquilino si no lo tiene", () => {
    const l = armar(cuota(), { ...CONTRATO, tenant: { ...CONTRATO.tenant, taxId: null } });
    expect(l.inquilino).toEqual({ nombre: "Jorge Paletta" });
  });

  it("omite el CUIT del propietario si no lo tiene", () => {
    const l = armarLiquidacion({ invoice: cuota(), contract: CONTRATO, owner: { firstName: "Marta", lastName: "Gómez" } });
    expect(l.emisor).toEqual({ nombre: "Marta Gómez" });
  });

  it("omite el comprobante y la fecha de pago si el pago no los trae", () => {
    const l = armar(cuota({ payments: [pago({ receiptFileName: undefined, submittedAt: undefined })] }));
    expect(l.comprobante).toBeUndefined();
    expect(l.fechaPago).toBeUndefined();
  });

  it("toma la fecha de pago en Argentina, no en UTC", () => {
    const l = armar(cuota({ payments: [pago({ submittedAt: "2026-08-09T01:30:00Z" })] }));
    expect(l.fechaPago).toBe("08/08/2026");
  });

  it("usa la moneda del contrato y las palabras en dólares", () => {
    const l = armar(cuota({ baseAmount: 1200, total: 1200, amountDue: 1200 }), { ...CONTRATO, currency: "USD" });
    expect(l.moneda).toBe("USD");
    expect(l.montoPagado).toBe("US$ 1.200");
    expect(l.montoEnLetras).toBe("Son dólares estadounidenses mil doscientos con 00/100");
  });

  it("muestra los centavos cuando el monto los tiene", () => {
    const l = armar(cuota({ amountDue: 454500.5 }));
    expect(l.montoPagado).toBe("$ 454.500,50");
    expect(l.montoEnLetras).toBe("Son pesos cuatrocientos cincuenta y cuatro mil quinientos con 50/100");
  });

  it("nombra a una persona jurídica por su razón social", () => {
    const l = armar(cuota(), {
      ...CONTRATO,
      tenant: { ...CONTRATO.tenant, legalEntity: true, businessName: "Paletta SRL" },
    });
    expect(l.inquilino.nombre).toBe("Paletta SRL");
  });

  it("falla si la cuota no es liquidable", () => {
    expect(() => armar(cuota({ status: "DUE" }))).toThrow();
  });
});
