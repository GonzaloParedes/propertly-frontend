import {
  armarPedido,
  condicionesIniciales,
  mesesElegibles,
  resumenDeCondiciones,
  validarCondiciones,
  type CondicionesNuevas,
} from "@/lib/cambio-condiciones";
import type { ContractResponse } from "@/lib/backend-types";

function contrato(extra: Partial<ContractResponse> = {}): ContractResponse {
  return {
    endDate: "2027-02-28",
    currentRent: 500000,
    dueDay: 5,
    incrementMethod: "FIXED_PERCENTAGE",
    incrementValue: 8,
    incrementFrequencyMonths: 3,
    ...extra,
  } as ContractResponse;
}

const validas: CondicionesNuevas = {
  mes: "2026-10-01",
  alquiler: "700000",
  diaVencimiento: 5,
  metodo: "FIXED_PERCENTAGE",
  porcentaje: "10",
  frecuencia: 6,
};

describe("mesesElegibles", () => {
  it("va del mes siguiente al último que el contrato factura", () => {
    const meses = mesesElegibles(contrato(), "2026-09-28");
    expect(meses[0]).toEqual({ valor: "2026-10-01", etiqueta: "octubre 2026" });
    expect(meses.at(-1)?.valor).toBe("2027-02-01");
    expect(meses).toHaveLength(5);
  });

  it("cruza el fin de año", () => {
    const meses = mesesElegibles(contrato({ endDate: "2027-01-31" }), "2026-12-10");
    expect(meses.map((m) => m.valor)).toEqual(["2027-01-01"]);
  });

  it("no ofrece nada si el contrato termina este mes", () => {
    expect(mesesElegibles(contrato({ endDate: "2026-09-30" }), "2026-09-28")).toEqual([]);
  });

  it("un contrato que termina el día 1 no factura ese mes", () => {
    const meses = mesesElegibles(contrato({ endDate: "2026-11-01" }), "2026-09-28");
    expect(meses.map((m) => m.valor)).toEqual(["2026-10-01"]);
  });
});

describe("condicionesIniciales", () => {
  const meses = mesesElegibles(contrato(), "2026-09-28");

  it("parte de las condiciones actuales", () => {
    expect(condicionesIniciales(contrato(), meses)).toEqual({
      mes: "2026-10-01",
      alquiler: "500000",
      diaVencimiento: 5,
      metodo: "FIXED_PERCENTAGE",
      porcentaje: "8",
      frecuencia: 3,
    });
  });

  it("lee el índice cuando el contrato ajusta por índice", () => {
    const c = condicionesIniciales(
      contrato({ incrementMethod: "INDEX", incrementIndexName: "IPC", incrementValue: undefined }),
      meses
    );
    expect(c.metodo).toBe("IPC");
    expect(c.porcentaje).toBe("");
  });
});

describe("validarCondiciones", () => {
  const meses = mesesElegibles(contrato(), "2026-09-28");

  it("acepta condiciones completas", () => {
    expect(validarCondiciones(validas, meses)).toEqual({});
  });

  it("rechaza un mes fuera de la lista", () => {
    expect(validarCondiciones({ ...validas, mes: "2026-09-01" }, meses).mes).toBeDefined();
  });

  it("rechaza alquiler cero, día 31, frecuencia cero y porcentaje vacío", () => {
    const e = validarCondiciones(
      { ...validas, alquiler: "0", diaVencimiento: 31, frecuencia: 0, porcentaje: "" },
      meses
    );
    expect(Object.keys(e).sort()).toEqual(["alquiler", "diaVencimiento", "frecuencia", "porcentaje"]);
  });

  it("con índice no exige porcentaje", () => {
    expect(validarCondiciones({ ...validas, metodo: "ICL", porcentaje: "" }, meses)).toEqual({});
  });
});

describe("armarPedido", () => {
  it("con porcentaje manda el valor y no el índice", () => {
    expect(armarPedido(validas)).toEqual({
      effectiveFrom: "2026-10-01",
      rentBaseline: 700000,
      dueDay: 5,
      incrementMethod: "FIXED_PERCENTAGE",
      incrementFrequencyMonths: 6,
      incrementValue: 10,
    });
  });

  it("con índice manda el nombre y no el valor", () => {
    const pedido = armarPedido({ ...validas, metodo: "ICL", porcentaje: "10" });
    expect(pedido.incrementMethod).toBe("INDEX");
    expect(pedido.incrementIndexName).toBe("ICL");
    expect(pedido).not.toHaveProperty("incrementValue");
  });
});

describe("resumenDeCondiciones", () => {
  it("dice cada condición en una línea", () => {
    const lineas = resumenDeCondiciones(validas);
    expect(lineas[1]).toBe("Vence el día 5");
    expect(lineas[2]).toBe("Sube 10 % cada 6 meses");
  });
});
