import { garantiaVacia } from "@/lib/garantias";
import {
  SIN_OTRAS_CONDICIONES,
  armarOtrasCondiciones,
  describirPunitorios,
  hayOtrasCondiciones,
  numeroDecimal,
  otrasCondicionesValidas,
  resumenDeGrupo,
  resumenDeOtrasCondiciones,
  soloDecimal,
  validarOtrasCondiciones,
  type OtrasCondiciones,
} from "@/lib/otras-condiciones";

const con = (cambios: Partial<OtrasCondiciones>): OtrasCondiciones => ({ ...SIN_OTRAS_CONDICIONES, ...cambios });

describe("numeroDecimal y soloDecimal", () => {
  it("acepta coma o punto decimal", () => {
    expect(numeroDecimal("0,5")).toBe(0.5);
    expect(numeroDecimal("0.5")).toBe(0.5);
    expect(numeroDecimal(" 12 ")).toBe(12);
  });

  it("lo que no es un número es NaN", () => {
    expect(numeroDecimal("")).toBeNaN();
    expect(numeroDecimal("abc")).toBeNaN();
    expect(numeroDecimal("1,2,3")).toBeNaN();
  });

  it("al escribir deja sólo dígitos y un separador", () => {
    expect(soloDecimal("1a2,3,4")).toBe("12,34");
    expect(soloDecimal("0.5.5")).toBe("0.55");
  });
});

describe("armarOtrasCondiciones", () => {
  it("sin nada cargado no manda nada", () => {
    expect(armarOtrasCondiciones(SIN_OTRAS_CONDICIONES)).toEqual({});
  });

  it("manda sólo los grupos que se cargaron", () => {
    expect(armarOtrasCondiciones(con({ deposito: "900000" }))).toEqual({ depositAmount: 900000 });
  });

  it("la comisión viaja sin quién la paga si no se eligió", () => {
    expect(armarOtrasCondiciones(con({ comision: "3,5" }))).toEqual({ commissionPercent: 3.5 });
    expect(armarOtrasCondiciones(con({ comision: "3", quienPagaComision: "SHARED" }))).toEqual({ commissionPercent: 3, commissionPayer: "SHARED" });
  });

  it("quién la paga sin porcentaje no viaja", () => {
    expect(armarOtrasCondiciones(con({ quienPagaComision: "TENANT" }))).toEqual({});
  });

  it("los punitorios viajan con su método y los días de gracia sólo si se cargaron", () => {
    expect(armarOtrasCondiciones(con({ punitorios: { method: "FIXED_ONCE", value: "20000", graceDays: "" } }))).toEqual({ lateFeeMethod: "FIXED_ONCE", lateFeeValue: 20000 });
    expect(armarOtrasCondiciones(con({ punitorios: { method: "PERCENT_PER_DAY", value: "0,5", graceDays: "0" } }))).toEqual({ lateFeeMethod: "PERCENT_PER_DAY", lateFeeValue: 0.5, lateFeeGraceDays: 0 });
  });

  it("las garantías viajan sólo si hay alguna", () => {
    const garantia = { ...garantiaVacia("SURETY_INSURANCE"), insurerName: " Aseguradora Sur " };
    expect(armarOtrasCondiciones(con({ garantias: [garantia] }))).toEqual({ guarantees: [{ type: "SURETY_INSURANCE", insurerName: "Aseguradora Sur" }] });
  });
});

describe("validarOtrasCondiciones", () => {
  it("lo vacío es válido: el paso es opcional", () => {
    expect(otrasCondicionesValidas(SIN_OTRAS_CONDICIONES)).toBe(true);
  });

  it("la comisión va de 0 a 100", () => {
    expect(validarOtrasCondiciones(con({ comision: "0" }))).toEqual({});
    expect(validarOtrasCondiciones(con({ comision: "100" }))).toEqual({});
    expect(validarOtrasCondiciones(con({ comision: "100,5" })).comision).toBeDefined();
    expect(validarOtrasCondiciones(con({ comision: "," })).comision).toBeDefined();
  });

  it("un método sin valor, o con valor cero, no es válido", () => {
    expect(validarOtrasCondiciones(con({ punitorios: { method: "FIXED_ONCE", value: "", graceDays: "" } })).punitorios).toBeDefined();
    expect(validarOtrasCondiciones(con({ punitorios: { method: "FIXED_ONCE", value: "0", graceDays: "" } })).punitorios).toBeDefined();
    expect(validarOtrasCondiciones(con({ punitorios: { method: "FIXED_ONCE", value: "1", graceDays: "" } }))).toEqual({});
  });

  it("una garantía incompleta hace inválido el conjunto", () => {
    expect(otrasCondicionesValidas(con({ garantias: [garantiaVacia("PERSONAL")] }))).toBe(false);
    expect(otrasCondicionesValidas(con({ garantias: [{ ...garantiaVacia("PERSONAL"), fullName: "Ana Gómez" }] }))).toBe(true);
  });
});

describe("resúmenes", () => {
  it("describe cada método en las palabras del propietario", () => {
    expect(describirPunitorios({ method: "PERCENT_PER_DAY", value: "0,5", graceDays: "" })).toBe("0,5 % por día");
    expect(describirPunitorios({ method: "PERCENT_PER_MONTH", value: "5", graceDays: "" })).toBe("5 % mensual");
    expect(describirPunitorios({ method: "PERCENT_PER_YEAR", value: "60", graceDays: "" })).toBe("60 % anual");
    expect(describirPunitorios({ method: "FIXED_PER_DAY", value: "5000", graceDays: "" })).toBe("$ 5.000 por día");
    expect(describirPunitorios({ method: "FIXED_ONCE", value: "20000", graceDays: "3" })).toBe("$ 20.000 una sola vez · 3 días de gracia");
    expect(describirPunitorios({ method: "FIXED_ONCE", value: "20000", graceDays: "1" })).toContain("1 día de gracia");
  });

  it("un grupo vacío dice «Sin cargar»", () => {
    expect(resumenDeGrupo(SIN_OTRAS_CONDICIONES, "deposito")).toBe("Sin cargar");
    expect(resumenDeOtrasCondiciones(SIN_OTRAS_CONDICIONES)).toBe("Sin cargar");
    expect(hayOtrasCondiciones(SIN_OTRAS_CONDICIONES)).toBe(false);
  });

  it("junta los grupos cargados en una línea", () => {
    const o = con({ deposito: "900000", comision: "3", quienPagaComision: "TENANT", garantias: [garantiaVacia("PERSONAL")] });
    expect(resumenDeOtrasCondiciones(o)).toBe("Depósito: $ 900.000 · Comisión de la inmobiliaria: 3 % · la paga el inquilino · Garantías: 1 garantía");
    expect(hayOtrasCondiciones(o)).toBe(true);
  });
});
