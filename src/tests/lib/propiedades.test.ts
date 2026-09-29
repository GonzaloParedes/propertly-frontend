import {
  backendNoInformaContratos,
  buildFilasPropiedad,
  ciudadesDisponibles,
  contarFacetas,
  desdeDeLaVentana,
  estadoDePropiedad,
  filtrarPropiedades,
  FILTRO_VACIO,
  resumenPropiedades,
} from "@/lib/propiedades";
import type { InvoiceResponse, PropertyResponse } from "@/lib/backend-types";

const RIVADAVIA: PropertyResponse = {
  id: 1,
  street: "Av. Rivadavia",
  number: "2340",
  floorUnit: "5.º A",
  city: "CABA",
  province: "Ciudad Autónoma de Buenos Aires",
  category: "APARTMENT",
  bedrooms: 2,
  coveredArea: 68,
  activeContract: { id: 100, currentRent: 478691, status: "ACTIVE" },
};

const MITRE: PropertyResponse = {
  id: 2,
  street: "Mitre",
  number: "78",
  city: "San Isidro",
  province: "Buenos Aires",
  category: "COMMERCIAL_PREMISES",
  coveredArea: 52,
  activeContract: null,
};

const BELGRANO: PropertyResponse = {
  id: 3,
  street: "Belgrano",
  number: "445",
  city: "Morón",
  province: "Buenos Aires",
  category: "HOUSE",
  bedrooms: 5,
  petsAllowed: true,
  furnished: true,
  activeContract: { id: 300, currentRent: 430000, status: "ACTIVE" },
};

function cuota(contractId: number, extra: Partial<InvoiceResponse> = {}): InvoiceResponse {
  return {
    id: Math.random(),
    contractId,
    period: "2026-08-01",
    dueDate: "2026-08-10",
    baseAmount: 400000,
    total: 400000,
    status: "PENDING",
    confirmed: true,
    adjustments: [],
    payments: [],
    ...extra,
  };
}

// --- estado ---

describe("estadoDePropiedad", () => {
  it("sin contrato vigente está sin alquilar", () => {
    expect(estadoDePropiedad(MITRE, [])).toBe("Sin alquilar");
  });

  it("con contrato y sin nada pendiente está al día", () => {
    expect(estadoDePropiedad(RIVADAVIA, [cuota(100)])).toBe("Al día");
  });

  it("una cuota vencida la pone en vencida", () => {
    expect(estadoDePropiedad(RIVADAVIA, [cuota(100, { status: "DUE" })])).toBe("Vencida");
  });

  it("un pago esperando confirmación gana sobre la cuota vencida", () => {
    const conPago = cuota(100, {
      status: "DUE",
      payments: [
        { id: 9, invoiceId: 1, status: "AWAITING_CONFIRMATION", submittedByTenant: true },
      ],
    });
    expect(estadoDePropiedad(RIVADAVIA, [conPago])).toBe("Pago a confirmar");
  });

  it("un pago ya confirmado no deja la propiedad esperando", () => {
    const pagada = cuota(100, {
      status: "PAID",
      payments: [{ id: 9, invoiceId: 1, status: "CONFIRMED", submittedByTenant: false }],
    });
    expect(estadoDePropiedad(RIVADAVIA, [pagada])).toBe("Al día");
  });
});

// --- filas ---

describe("buildFilasPropiedad", () => {
  it("arma la fila con dirección, detalle y alquiler vigente", () => {
    const [fila] = buildFilasPropiedad([RIVADAVIA], []);
    expect(fila.direccion).toBe("Av. Rivadavia 2340, 5.º A");
    expect(fila.detalle).toBe("Departamento · CABA · 68 m²");
    expect(fila.alquiler).toBe("$ 478.691");
    expect(fila.contratoId).toBe(100);
  });

  it("sin contrato no inventa un alquiler", () => {
    const [fila] = buildFilasPropiedad([MITRE], []);
    expect(fila.alquiler).toBeNull();
    expect(fila.contratoId).toBeNull();
    expect(fila.estado).toBe("Sin alquilar");
  });

  it("le da a cada propiedad las cuotas de su propio contrato", () => {
    const filas = buildFilasPropiedad(
      [RIVADAVIA, BELGRANO],
      [cuota(100, { status: "DUE" }), cuota(300)]
    );
    expect(filas[0].estado).toBe("Vencida");
    expect(filas[1].estado).toBe("Al día");
  });

  it("una cuota de un contrato ajeno no ensucia la fila", () => {
    const [fila] = buildFilasPropiedad([RIVADAVIA], [cuota(999, { status: "DUE" })]);
    expect(fila.estado).toBe("Al día");
  });
});

describe("backendNoInformaContratos", () => {
  it("es cierto cuando ninguna trae la clave", () => {
    const sinClave = [{ ...RIVADAVIA }, { ...MITRE }].map((p) => {
      const copia = { ...p };
      delete copia.activeContract;
      return copia;
    });
    expect(backendNoInformaContratos(sinClave)).toBe(true);
  });

  it("es falso cuando la clave viene en null: eso sí es «sin contrato»", () => {
    expect(backendNoInformaContratos([MITRE])).toBe(false);
  });

  it("es falso sin propiedades: no hay nada que informar", () => {
    expect(backendNoInformaContratos([])).toBe(false);
  });
});

// --- filtros ---

describe("filtrarPropiedades", () => {
  const filas = buildFilasPropiedad([RIVADAVIA, MITRE, BELGRANO], []);

  it("sin filtros devuelve todo", () => {
    expect(filtrarPropiedades(filas, FILTRO_VACIO)).toHaveLength(3);
  });

  it("busca por dirección sin importar tildes ni mayúsculas", () => {
    expect(filtrarPropiedades(filas, { ...FILTRO_VACIO, texto: "MORON" })).toHaveLength(1);
    expect(filtrarPropiedades(filas, { ...FILTRO_VACIO, texto: "rivadavia" })).toHaveLength(1);
  });

  it("filtra por ciudad", () => {
    expect(filtrarPropiedades(filas, { ...FILTRO_VACIO, ciudades: ["CABA"] })).toHaveLength(1);
  });

  it("agrupa en «4+» todo lo de cuatro dormitorios para arriba", () => {
    const r = filtrarPropiedades(filas, { ...FILTRO_VACIO, dormitorios: ["4+"] });
    expect(r.map((f) => f.id)).toEqual([3]);
  });

  it("deja fuera del filtro de dormitorios a las que no los cargaron", () => {
    const r = filtrarPropiedades(filas, { ...FILTRO_VACIO, dormitorios: ["2"] });
    expect(r.map((f) => f.id)).toEqual([1]);
  });

  it("los extras se acumulan en vez de sumarse", () => {
    const ambos = filtrarPropiedades(filas, {
      ...FILTRO_VACIO,
      extras: ["mascotas", "amoblada"],
    });
    expect(ambos.map((f) => f.id)).toEqual([3]);
  });

  it("separa las alquiladas de las libres", () => {
    expect(filtrarPropiedades(filas, { ...FILTRO_VACIO, estado: "sinAlquilar" })).toHaveLength(1);
    expect(filtrarPropiedades(filas, { ...FILTRO_VACIO, estado: "conContrato" })).toHaveLength(2);
  });
});

describe("contarFacetas", () => {
  const filas = buildFilasPropiedad([RIVADAVIA, MITRE, BELGRANO], []);

  it("cuenta sobre el total cuando no hay otros filtros", () => {
    expect(contarFacetas(filas, FILTRO_VACIO)).toEqual({
      todas: 3,
      conContrato: 2,
      sinAlquilar: 1,
    });
  });

  it("cuenta sobre el resto de los filtros ya aplicados", () => {
    expect(contarFacetas(filas, { ...FILTRO_VACIO, ciudades: ["CABA"] })).toEqual({
      todas: 1,
      conContrato: 1,
      sinAlquilar: 0,
    });
  });

  it("no se deja afectar por la faceta que cuenta", () => {
    const conEstado = { ...FILTRO_VACIO, estado: "sinAlquilar" as const };
    expect(contarFacetas(filas, conEstado).conContrato).toBe(2);
  });
});

describe("ciudadesDisponibles", () => {
  it("las lista sin repetir y en orden", () => {
    const filas = buildFilasPropiedad([RIVADAVIA, MITRE, BELGRANO, RIVADAVIA], []);
    expect(ciudadesDisponibles(filas)).toEqual(["CABA", "Morón", "San Isidro"]);
  });
});

describe("resumenPropiedades", () => {
  it("sin propiedades lo dice", () => {
    expect(resumenPropiedades([])).toBe("Todavía no cargó ninguna propiedad.");
  });

  it("cuenta las que tienen contrato", () => {
    const filas = buildFilasPropiedad([RIVADAVIA, MITRE, BELGRANO], []);
    expect(resumenPropiedades(filas)).toBe("3 propiedades · 2 con contrato activo");
  });

  it("no dice «0 con contrato activo»", () => {
    expect(resumenPropiedades(buildFilasPropiedad([MITRE], []))).toBe(
      "1 propiedad · ninguna alquilada"
    );
  });
});

describe("desdeDeLaVentana", () => {
  it("retrocede doce meses hasta el día 1", () => {
    expect(desdeDeLaVentana("2026-09-28")).toBe("2025-09-01");
  });

  it("cruza el año para atrás sin romperse", () => {
    expect(desdeDeLaVentana("2026-01-15")).toBe("2025-01-01");
  });
});
