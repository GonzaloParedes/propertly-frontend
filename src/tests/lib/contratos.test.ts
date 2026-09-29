import {
  buildFilasContrato,
  contarContratos,
  describirActualizacion,
  estadoDeContrato,
  filtrarContratos,
  resumenContratos,
} from "@/lib/contratos";
import type { ContractResponse } from "@/lib/backend-types";

const HOY = "2026-09-07";

function contract(over: Partial<ContractResponse> = {}): ContractResponse {
  return {
    id: 100,
    property: { id: 10, street: "Av. Rivadavia", number: "2340", floorUnit: "5.º A",
      city: "CABA", province: "CABA", category: "APARTMENT" },
    tenant: { id: 1, firstName: "Jorge", lastName: "Paletta", taxId: "20224567899",
      email: "jorge@ejemplo.com", phoneNumber: "+5491144552210" },
    initialRentAmount: 400000, startDate: "2025-03-01", termMonths: 36, dueDay: 1,
    endDate: "2028-03-01", status: "ACTIVE", incrementMethod: "FIXED_PERCENTAGE",
    incrementFrequencyMonths: 3, incrementValue: 8, currentRent: 478691, ...over,
  };
}

// --- estado ---

describe("estadoDeContrato", () => {
  it("un contrato activo que termina lejos está vigente", () => {
    expect(estadoDeContrato(contract({ endDate: "2028-03-01" }), HOY)).toBe("Vigente");
  });

  // Tres meses antes es cuando se empieza a hablar la renovación.
  it("dentro de los tres meses del fin pasa a por terminar", () => {
    expect(estadoDeContrato(contract({ endDate: "2026-11-30" }), HOY)).toBe("Por terminar");
    expect(estadoDeContrato(contract({ endDate: "2026-12-08" }), HOY)).toBe("Vigente");
  });

  it("distingue los tres finales que el backend modela", () => {
    expect(estadoDeContrato(contract({ status: "TERMINATED" }), HOY)).toBe("Finalizado");
    expect(estadoDeContrato(contract({ status: "EXPIRED" }), HOY)).toBe("Vencido");
    expect(estadoDeContrato(contract({ status: "SUPERSEDED" }), HOY)).toBe("Reemplazado");
  });
});

// --- cómo sube ---

describe("describirActualizacion", () => {
  it("describe los tres métodos, aunque el asistente sólo cargue porcentajes", () => {
    expect(describirActualizacion(contract())).toBe("Sube 8 % cada 3 meses");
    expect(describirActualizacion(contract({
      incrementMethod: "INDEX", incrementIndexName: "ICL", incrementValue: undefined,
      incrementFrequencyMonths: 6,
    }))).toBe("Ajusta por ICL cada 6 meses");
    expect(describirActualizacion(contract({
      incrementMethod: "FIXED_AMOUNT", incrementValue: 35000, incrementFrequencyMonths: 6,
    }))).toBe("Sube $ 35.000 cada 6 meses");
  });

  it("dice «mes» en singular cuando la frecuencia es mensual", () => {
    expect(describirActualizacion(contract({ incrementFrequencyMonths: 1 }))).toContain("cada 1 mes");
  });
});

// --- filas ---

describe("buildFilasContrato", () => {
  it("arma la fila con lo que la lista muestra", () => {
    const [fila] = buildFilasContrato([contract()], HOY);
    expect(fila).toMatchObject({
      direccion: "Av. Rivadavia 2340, 5.º A",
      inquilino: "Jorge Paletta",
      actualizacion: "Sube 8 % cada 3 meses",
      fin: "01/03/2028",
      alquiler: "$ 478.691",
      estado: "Vigente",
    });
  });

  // Si se rescindió antes, la fecha que importa es la efectiva, no la pactada.
  it("cuando hay rescisión anticipada manda la fecha real de fin", () => {
    const [fila] = buildFilasContrato(
      [contract({ status: "TERMINATED", endDate: "2028-03-01", actualEndDate: "2026-06-30" })],
      HOY
    );
    expect(fila.fin).toBe("30/06/2026");
  });

  it("pone arriba los que siguen corriendo, y entre ellos el que termina antes", () => {
    const filas = buildFilasContrato(
      [
        contract({ id: 1, status: "TERMINATED", endDate: "2026-01-01" }),
        contract({ id: 2, endDate: "2028-03-01" }),
        contract({ id: 3, endDate: "2026-11-30" }),
      ],
      HOY
    );
    expect(filas.map((f) => f.id)).toEqual([3, 2, 1]);
  });

  it("expone el sucesor de un contrato reemplazado", () => {
    const [fila] = buildFilasContrato(
      [contract({ status: "SUPERSEDED", successorContractId: 200 })],
      HOY
    );
    expect(fila.sucesorId).toBe(200);
  });
});

// --- filtros ---

describe("filtros y conteos", () => {
  const filas = buildFilasContrato(
    [
      contract({ id: 1, endDate: "2028-03-01" }),
      contract({ id: 2, endDate: "2026-10-15" }),
      contract({ id: 3, status: "TERMINATED" }),
      contract({ id: 4, status: "SUPERSEDED" }),
      contract({ id: 5, status: "SCHEDULED", startDate: "2026-10-01" }),
    ],
    HOY
  );

  // «Por terminar» es un subconjunto de los vigentes, no un grupo aparte: el
  // contrato sigue rigiendo.
  it("los que están por terminar siguen contando como vigentes", () => {
    expect(contarContratos(filas)).toEqual({ vigentes: 2, porTerminar: 1, programados: 1, finalizados: 2 });
  });

  it("un contrato reemplazado cuenta entre los finalizados", () => {
    expect(filtrarContratos(filas, "finalizados").map((f) => f.id)).toEqual([3, 4]);
  });
});

describe("contrato programado", () => {
  it("se llama «Programado», aunque termine lejos", () => {
    expect(estadoDeContrato(contract({ status: "SCHEDULED" }), HOY)).toBe("Programado");
  });

  it("no cuenta como vigente ni como finalizado", () => {
    const filas = buildFilasContrato([contract({ id: 5, status: "SCHEDULED" })], HOY);
    expect(filtrarContratos(filas, "vigentes")).toEqual([]);
    expect(filtrarContratos(filas, "finalizados")).toEqual([]);
    expect(filtrarContratos(filas, "programados").map((f) => f.id)).toEqual([5]);
  });
});

describe("resumenContratos", () => {
  it("avisa cuántos están por terminar", () => {
    const filas = buildFilasContrato(
      [contract({ id: 1, endDate: "2028-03-01" }), contract({ id: 2, endDate: "2026-10-15" })],
      HOY
    );
    expect(resumenContratos(filas)).toBe("2 vigentes · 1 por terminar");
  });

  it("no menciona los que están por terminar si no hay", () => {
    expect(resumenContratos(buildFilasContrato([contract()], HOY))).toBe("1 vigente");
  });

  it("no inventa un resumen sin contratos", () => {
    expect(resumenContratos([])).toBe("Todavía no cargó ningún contrato.");
  });
});
