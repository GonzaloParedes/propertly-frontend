import {
  buildTenantRows,
  estadoDeCuotas,
  formatearDireccion,
  formatearMonto,
  resumenInquilinos,
} from "@/lib/tenant-rows";
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
    id: 10, street: "Av. Rivadavia", number: "2340", city: "CABA", province: "CABA",
    category: "APARTMENT", ...over,
  };
}

function contract(over: Partial<ContractResponse> = {}): ContractResponse {
  return {
    id: 100, property: property(), tenant: tenant(), initialRentAmount: 400000,
    startDate: "2025-03-01", termMonths: 36, dueDay: 1, endDate: "2028-02-29", status: "ACTIVE",
    incrementMethod: "FIXED_PERCENTAGE", incrementFrequencyMonths: 3, currentRent: 478691,
    ...over,
  };
}

function invoice(over: Partial<InvoiceResponse> = {}): InvoiceResponse {
  return {
    id: 1000, contractId: 100, period: "2026-08-01", dueDate: "2026-08-01",
    baseAmount: 478691, total: 478691, status: "PENDING", confirmed: true,
    adjustments: [], payments: [], ...over,
  };
}

function payment(over: Partial<PaymentResponse> = {}): PaymentResponse {
  return { id: 1, invoiceId: 1000, status: "AWAITING_CONFIRMATION", submittedByTenant: true, ...over };
}

// --- Formato ---

describe("formatearDireccion", () => {
  it("junta calle y número", () => {
    expect(formatearDireccion(property())).toBe("Av. Rivadavia 2340");
  });

  it("suma el piso y depto cuando está", () => {
    expect(formatearDireccion(property({ floorUnit: "5.º A" }))).toBe("Av. Rivadavia 2340, 5.º A");
  });
});

describe("formatearMonto", () => {
  it("usa el separador de miles argentino y sin decimales", () => {
    expect(formatearMonto(478691)).toBe("$ 478.691");
  });
});

// --- Estado a partir de las cuotas ---

describe("estadoDeCuotas", () => {
  it("sin cuotas todavía, está al día", () => {
    expect(estadoDeCuotas([])).toBe("Al día");
  });

  it("todas pagas, está al día", () => {
    expect(estadoDeCuotas([invoice({ status: "PAID" })])).toBe("Al día");
  });

  it("una cuota por vencer", () => {
    expect(estadoDeCuotas([invoice({ status: "PENDING" })])).toBe("A vencer");
  });

  it("una cuota vencida gana sobre una por vencer", () => {
    expect(
      estadoDeCuotas([invoice({ status: "PENDING" }), invoice({ id: 2, status: "DUE" })])
    ).toBe("Vencida");
  });

  it("una cuota con comprobante esperando confirmación", () => {
    expect(
      estadoDeCuotas([invoice({ status: "PENDING", payments: [payment()] })])
    ).toBe("Pago a confirmar");
  });

  it("si la cuota vencida ya tiene comprobante, lo que falta es confirmarlo", () => {
    expect(
      estadoDeCuotas([invoice({ status: "DUE", payments: [payment()] })])
    ).toBe("Pago a confirmar");
  });

  it("una vencida sin comprobante no queda tapada por otra que sí lo tiene", () => {
    expect(
      estadoDeCuotas([
        invoice({ id: 1, status: "DUE" }),
        invoice({ id: 2, status: "DUE", payments: [payment()] }),
      ])
    ).toBe("Vencida");
  });

  it("un pago ya confirmado no deja el chip en «Pago a confirmar»", () => {
    expect(
      estadoDeCuotas([invoice({ status: "PAID", payments: [payment({ status: "CONFIRMED" })] })])
    ).toBe("Al día");
  });
});

// --- Armado de filas ---

describe("buildTenantRows", () => {
  it("cruza inquilino, contrato y cuotas en una fila", () => {
    const rows = buildTenantRows(
      [tenant()],
      [contract({ property: property({ floorUnit: "5.º A" }) })],
      [invoice({ status: "DUE" })]
    );

    expect(rows).toEqual([{
      id: 1,
      nombre: "Jorge Paletta",
      // Separados además del completo: el formulario de edición los pide en dos
      // campos, y partir el nombre por el espacio erra con apellidos compuestos.
      nombrePila: "Jorge",
      apellido: "Paletta",
      cuit: "20-22456789-9",
      email: "jorge@ejemplo.com",
      telefono: "+5491144552210",
      contratoId: 100,
      direccion: "Av. Rivadavia 2340, 5.º A",
      alquiler: "$ 478.691",
      estado: "Vencida",
    }]);
  });

  it("el inquilino sin contrato queda sin dirección, sin monto y sin contrato", () => {
    const rows = buildTenantRows([tenant()], [], []);

    expect(rows[0]).toMatchObject({
      contratoId: null,
      direccion: null,
      alquiler: null,
      estado: "Sin contrato",
    });
  });

  it("ignora los contratos que ya no están vigentes", () => {
    const rows = buildTenantRows(
      [tenant()],
      [contract({ status: "TERMINATED" }), contract({ id: 101, status: "SUPERSEDED" })],
      []
    );

    expect(rows[0].contratoId).toBeNull();
    expect(rows[0].estado).toBe("Sin contrato");
  });

  it("no le cuelga a un inquilino las cuotas del contrato de otro", () => {
    const rows = buildTenantRows(
      [tenant({ id: 1 }), tenant({ id: 2, firstName: "Marta", lastName: "Suárez" })],
      [
        contract({ id: 100, tenant: tenant({ id: 1 }) }),
        contract({ id: 200, tenant: tenant({ id: 2 }) }),
      ],
      [invoice({ contractId: 200, status: "DUE" })]
    );

    expect(rows[0].estado).toBe("Al día");
    expect(rows[1].estado).toBe("Vencida");
  });

  it("muestra el documento tal cual si no es un CUIT de 11 dígitos", () => {
    // El backend acepta DNI de 7-8 dígitos, que no se separa en tres grupos.
    const rows = buildTenantRows([tenant({ taxId: "22456789" })], [], []);
    expect(rows[0].cuit).toBe("22456789");
  });
});

// --- Bajada de la cabecera ---

describe("resumenInquilinos", () => {
  it("cuenta nomás cuando todos tienen contrato", () => {
    const rows = buildTenantRows([tenant({ id: 1 }), tenant({ id: 2 })], [
      contract({ id: 100, tenant: tenant({ id: 1 }) }),
      contract({ id: 200, tenant: tenant({ id: 2 }) }),
    ], []);
    expect(resumenInquilinos(rows)).toBe("2 inquilinos");
  });

  it("avisa cuántos no tienen contrato", () => {
    const rows = buildTenantRows([tenant({ id: 1 }), tenant({ id: 2 })], [
      contract({ id: 100, tenant: tenant({ id: 1 }) }),
    ], []);
    expect(resumenInquilinos(rows)).toBe("2 inquilinos · 1 sin contrato");
  });

  it("usa el singular con uno solo", () => {
    expect(resumenInquilinos(buildTenantRows([tenant()], [], []))).toBe("1 inquilino · 1 sin contrato");
  });

  it("con la lista vacía no inventa nada", () => {
    expect(resumenInquilinos([])).toBe("0 inquilinos");
  });
});
