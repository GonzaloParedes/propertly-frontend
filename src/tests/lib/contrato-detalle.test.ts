import {
  comoSeActualiza,
  condicionesComerciales,
  descripcionDocumento,
  formatearImporte,
  historialDeAumentos,
  proximaActualizacion,
  vigenciaEnFechas,
} from "@/lib/contrato-detalle";
import type { ContractResponse } from "@/lib/backend-types";

const CONTRATO: ContractResponse = {
  id: 100,
  property: {
    id: 10,
    street: "Av. Rivadavia",
    number: "2340",
    city: "CABA",
    province: "CABA",
    category: "APARTMENT",
  },
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
  incrementValue: 8,
  currentRent: 478691,
};

describe("formatearImporte", () => {
  it("sin moneda son pesos", () => {
    expect(formatearImporte(478691, undefined)).toBe("$ 478.691");
  });

  it("respeta la moneda del contrato", () => {
    expect(formatearImporte(1200, "USD")).toBe("US$ 1.200");
  });
});

// --- Vigencia ---

describe("vigenciaEnFechas", () => {
  // En fechas y no en meses: `termMonths` queda corto en contratos renegociados.
  it("dice el período en fechas", () => {
    expect(vigenciaEnFechas(CONTRATO)).toBe("del 01/03/2025 al 29/02/2028");
  });

  it("cuando terminó antes, manda la fecha real y se aclara la prevista", () => {
    const terminado = { ...CONTRATO, status: "TERMINATED" as const, actualEndDate: "2027-06-30" };
    expect(vigenciaEnFechas(terminado)).toBe(
      "del 01/03/2025 al 30/06/2027 · terminó antes del 29/02/2028 previsto"
    );
  });

  it("si la fecha real coincide con la prevista, no aclara nada", () => {
    expect(vigenciaEnFechas({ ...CONTRATO, actualEndDate: "2028-02-29" })).toBe(
      "del 01/03/2025 al 29/02/2028"
    );
  });
});

// --- Próxima actualización ---

describe("proximaActualizacion", () => {
  it("devuelve fecha e importe cuando los dos vienen", () => {
    const r = proximaActualizacion({
      ...CONTRATO,
      nextIncrementDate: "2026-11-01",
      nextIncrementRent: 517000,
    });
    expect(r).toEqual({ fecha: "01/11/2026", importe: "$ 517.000" });
  });

  it("sin importe devuelve sólo la fecha: el índice todavía no se publicó", () => {
    const r = proximaActualizacion({ ...CONTRATO, nextIncrementDate: "2026-11-01" });
    expect(r).toEqual({ fecha: "01/11/2026", importe: null });
  });

  it("sin fecha no hay hito que mostrar", () => {
    expect(proximaActualizacion(CONTRATO)).toBeNull();
  });
});

describe("comoSeActualiza", () => {
  it("por porcentaje", () => {
    expect(comoSeActualiza(CONTRATO)).toBe("Sube 8 % cada 3 meses");
  });

  it("por índice", () => {
    const porIndice = {
      ...CONTRATO,
      incrementMethod: "INDEX" as const,
      incrementIndexName: "ICL",
      incrementFrequencyMonths: 6,
      incrementValue: undefined,
    };
    expect(comoSeActualiza(porIndice)).toBe("Ajusta por ICL cada 6 meses");
  });

  it("por monto fijo, en la moneda del contrato", () => {
    const porMonto = {
      ...CONTRATO,
      incrementMethod: "FIXED_AMOUNT" as const,
      incrementValue: 35000,
    };
    expect(comoSeActualiza(porMonto)).toBe("Sube $ 35.000 cada 3 meses");
  });

  it("un solo mes se dice en singular", () => {
    expect(comoSeActualiza({ ...CONTRATO, incrementFrequencyMonths: 1 })).toContain("cada 1 mes");
  });
});

// --- Condiciones comerciales ---

describe("condicionesComerciales", () => {
  it("un contrato sin condiciones cargadas no devuelve ninguna", () => {
    expect(condicionesComerciales(CONTRATO)).toEqual([]);
  });

  it("lista el depósito con su tipo", () => {
    const c = condicionesComerciales({
      ...CONTRATO,
      depositAmount: 478691,
      depositType: "SURETY_INSURANCE",
    });
    expect(c).toContainEqual({
      etiqueta: "Depósito",
      valor: "$ 478.691 · Seguro de caución",
    });
  });

  it("el tipo de depósito sin monto también se muestra", () => {
    const c = condicionesComerciales({ ...CONTRATO, depositType: "PROPERTY_GUARANTEE" });
    expect(c).toContainEqual({ etiqueta: "Depósito", valor: "Garantía propietaria" });
  });

  it("la comisión dice quién la paga", () => {
    const c = condicionesComerciales({
      ...CONTRATO,
      commissionPercent: 5,
      commissionPayer: "TENANT",
    });
    expect(c).toContainEqual({ etiqueta: "Comisión", valor: "5 % · la paga el inquilino" });
  });

  it("los punitorios incluyen los días de gracia", () => {
    const c = condicionesComerciales({
      ...CONTRATO,
      lateFeeType: "PERCENTAGE",
      lateFeeValue: 2,
      lateFeeGraceDays: 5,
    });
    expect(c).toContainEqual({
      etiqueta: "Punitorios",
      valor: "2 % por mora · tras 5 días de gracia",
    });
  });

  // Un `false` cargado sí es una decisión; un campo vacío no.
  it("la renovación se muestra tanto si es sí como si es no", () => {
    expect(condicionesComerciales({ ...CONTRATO, autoRenewal: false })).toContainEqual({
      etiqueta: "Renovación",
      valor: "No se renueva automáticamente",
    });
    expect(condicionesComerciales({ ...CONTRATO, autoRenewal: true })).toContainEqual({
      etiqueta: "Renovación",
      valor: "Automática",
    });
  });

  it("la moneda sólo aparece si no es la de siempre, y va primero", () => {
    expect(condicionesComerciales({ ...CONTRATO, currency: "ARS" })).toEqual([]);
    const enDolares = condicionesComerciales({ ...CONTRATO, currency: "USD", depositAmount: 1200 });
    expect(enDolares[0]).toEqual({ etiqueta: "Moneda", valor: "Dólares (USD)" });
    expect(enDolares[1].valor).toContain("US$ 1.200");
  });
});

// --- Historial ---

describe("historialDeAumentos", () => {
  it("los ordena del más reciente al más viejo", () => {
    const r = historialDeAumentos(
      [
        { periodNumber: 1, appliedAt: "2025-06-01", sourceValue: 8, resultingRent: 432000 },
        { periodNumber: 2, appliedAt: "2025-09-01", sourceValue: 8, resultingRent: 466560 },
      ],
      undefined
    );
    expect(r.map((l) => l.fecha)).toEqual(["01/09/2025", "01/06/2025"]);
    expect(r[0].resultado).toBe("$ 466.560");
  });

  it("los de índice dicen qué período se usó", () => {
    const [linea] = historialDeAumentos(
      [
        {
          periodNumber: 1,
          appliedAt: "2025-06-01",
          sourceValue: 1.2,
          resultingRent: 432000,
          indexWindowStartPeriod: "2024-12-01",
          indexWindowEndPeriod: "2025-05-01",
        },
      ],
      undefined
    );
    expect(linea.ventana).toBe("índice de 01/12/2024 a 01/05/2025");
  });

  it("los de porcentaje no tienen ventana", () => {
    const [linea] = historialDeAumentos(
      [{ periodNumber: 1, appliedAt: "2025-06-01", sourceValue: 8, resultingRent: 432000 }],
      undefined
    );
    expect(linea.ventana).toBeNull();
  });

  it("sin aumentos devuelve una lista vacía", () => {
    expect(historialDeAumentos([], undefined)).toEqual([]);
  });
});

// --- Documento ---

describe("descripcionDocumento", () => {
  it("dice tipo, tamaño y fecha", () => {
    const c = {
      ...CONTRATO,
      documentContentType: "application/pdf",
      documentSizeBytes: 2_516_582,
      documentUploadedAt: "2025-03-01T10:00:00Z",
    };
    expect(descripcionDocumento(c)).toBe("PDF · 2,4 MB · cargado el 01/03/2025");
  });

  it("sin fecha omite esa parte en vez de inventarla", () => {
    const c = { ...CONTRATO, documentContentType: "application/pdf", documentSizeBytes: 2_516_582 };
    expect(descripcionDocumento(c)).toBe("PDF · 2,4 MB");
  });

  it("reconoce una imagen", () => {
    expect(descripcionDocumento({ ...CONTRATO, documentContentType: "image/jpeg" })).toBe("Imagen");
  });
});
