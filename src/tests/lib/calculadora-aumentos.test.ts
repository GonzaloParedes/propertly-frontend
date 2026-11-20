import {
  acotarMes,
  armarPedido,
  formatearMes,
  formatearMontoConCentavos,
  formatearPorcentaje,
  montoDesdeTexto,
  PRIMER_MES,
  sumarMeses,
  ultimoAjusteMaximo,
  validarFormulario,
} from "@/lib/calculadora-aumentos";

describe("calculadora de aumentos", () => {
  it("suma y resta meses cruzando el año", () => {
    expect(sumarMeses("2026-11", 3)).toBe("2027-02");
    expect(sumarMeses("2026-02", -3)).toBe("2025-11");
    expect(sumarMeses("2026-05", 0)).toBe("2026-05");
  });

  it("ofrece como último aumento el que ya rige este mes", () => {
    expect(ultimoAjusteMaximo(3, "2026-11-19")).toBe("2026-08");
    expect(ultimoAjusteMaximo(12, "2026-11-19")).toBe("2025-11");
  });

  it("acota el mes al rango permitido", () => {
    expect(acotarMes("2026-10", "2026-08")).toBe("2026-08");
    expect(acotarMes("2019-05", "2026-08")).toBe(PRIMER_MES);
    expect(acotarMes("2026-03", "2026-08")).toBe("2026-03");
  });

  it("lee el monto del campo ignorando los separadores", () => {
    expect(montoDesdeTexto("1.250.000")).toBe(1250000);
    expect(montoDesdeTexto("")).toBeNull();
    expect(montoDesdeTexto("0")).toBeNull();
  });

  it("pide el alquiler actual antes de calcular", () => {
    const form = { indice: "ICL" as const, monto: "", ultimoAjuste: "2026-05", frecuencia: 3 };
    expect(validarFormulario(form)).toBe("Ingrese el alquiler actual.");
    expect(validarFormulario({ ...form, monto: "500000" })).toBeNull();
  });

  it("arma el pedido con los nombres del backend", () => {
    expect(armarPedido({ indice: "IPC", monto: "500000", ultimoAjuste: "2026-05", frecuencia: 6 })).toEqual({
      index: "IPC",
      amount: 500000,
      lastAdjustment: "2026-05",
      frequencyMonths: 6,
    });
  });

  it("formatea meses, porcentajes y montos en castellano", () => {
    expect(formatearMes("2026-05")).toBe("mayo 2026");
    expect(formatearPorcentaje(12.3456)).toBe("12,35 %");
    expect(formatearMontoConCentavos(550615)).toBe("$ 550.615,00");
  });
});
