import {
  DIAS_DE_AVISO_DE_VENCIMIENTO,
  SIN_ETIQUETA,
  VERSION_DEL_PAYLOAD,
  armarContenido,
  contenidoCanonico,
  deserializar,
  diasParaVencer,
  etiquetaDeBorrador,
  filaDeBorrador,
  serializar,
  venceProximamente,
  type EstadoDelBorrador,
} from "@/lib/borradores";
import { garantiaVacia } from "@/lib/garantias";
import { SIN_OTRAS_CONDICIONES } from "@/lib/otras-condiciones";
import type { PropertyRequest } from "@/lib/backend-types";

const PROPIEDAD: PropertyRequest = { street: "Lavalle", number: "950", city: "CABA", province: "Buenos Aires", category: "APARTMENT", floorUnit: "3B" };

function estado(cambios: Partial<EstadoDelBorrador> = {}): EstadoDelBorrador {
  return {
    paso: 5,
    propiedad: { id: null, nuevo: true, borrador: { pedido: PROPIEDAD, etiqueta: "Lavalle 950, 3B" } },
    inquilino: { id: 7, nuevo: false, borrador: null },
    alquiler: "450000",
    diaVencimiento: 10,
    plazo: 24,
    inicio: "2026-11-01",
    metodo: "FIXED_PERCENTAGE",
    porcentaje: "8",
    frecuencia: 6,
    otras: SIN_OTRAS_CONDICIONES,
    pagadoHasta: "",
    ...cambios,
  };
}

/** Lo que llegaría del backend: pasa por JSON, como en la vida real. */
const porElCable = (valor: unknown) => JSON.parse(JSON.stringify(valor)) as unknown;

describe("serializar y deserializar", () => {
  it("ida y vuelta de un contrato a medias, con la propiedad nueva y el inquilino existente", () => {
    const original = estado();
    expect(deserializar(porElCable(serializar(original)))).toEqual(original);
  });

  it("conserva lo que se escribió a medias tal cual, sin convertirlo", () => {
    const original = estado({ alquiler: "45", porcentaje: "8.", inicio: "", paso: 3 });
    expect(deserializar(porElCable(serializar(original)))).toEqual(original);
  });

  it("un contrato sin nada elegido también vuelve", () => {
    const vacio = estado({
      paso: 1,
      propiedad: { id: null, nuevo: false, borrador: null },
      inquilino: { id: null, nuevo: false, borrador: null },
      alquiler: "",
      inicio: "",
    });
    expect(deserializar(porElCable(serializar(vacio)))).toEqual(vacio);
  });

  it("lleva la versión del formato", () => {
    expect(serializar(estado()).schemaVersion).toBe(VERSION_DEL_PAYLOAD);
  });

  it("las otras condiciones vuelven completas, con los punitorios y la comisión", () => {
    const otras = {
      deposito: "900000",
      comision: "4,5",
      quienPagaComision: "SHARED" as const,
      punitorios: { method: "PERCENT_PER_DAY" as const, value: "0,5", graceDays: "3" },
      garantias: [],
    };
    expect(deserializar(porElCable(serializar(estado({ otras }))))?.otras).toEqual(otras);
  });

  it("las garantías no llevan el id de la pantalla y vuelven con ids nuevos y distintos", () => {
    const a = { ...garantiaVacia("PERSONAL"), fullName: "Bob Ray", phoneNumber: "1155600183" };
    const b = { ...garantiaVacia("PERSONAL"), fullName: "Ana Ray" };
    const payload = porElCable(serializar(estado({ otras: { ...SIN_OTRAS_CONDICIONES, garantias: [a, b] } }))) as { otras: { garantias: Record<string, unknown>[] } };

    expect(payload.otras.garantias.every((garantia) => !("id" in garantia))).toBe(true);

    const vuelta = deserializar(payload)!.otras.garantias;
    expect(vuelta.map((g) => g.fullName)).toEqual(["Bob Ray", "Ana Ray"]);
    expect(vuelta[0].phoneNumber).toBe("1155600183");
    expect(new Set(vuelta.map((g) => g.id)).size).toBe(2);
    expect(vuelta.map((g) => g.id)).not.toContain(a.id);
  });

  it("descarta garantías de un tipo desconocido y corta en el máximo", () => {
    const base = porElCable(serializar(estado())) as { otras: Record<string, unknown> };
    const garantias = [
      ...Array.from({ length: 5 }, () => ({ type: "PERSONAL", fullName: "x" })),
      { type: "MARCIANA", fullName: "y" },
      "no es un objeto",
    ];
    const vuelta = deserializar({ ...base, otras: { ...base.otras, garantias } });
    expect(vuelta?.otras.garantias).toHaveLength(3);
  });
});

describe("un borrador que no se puede leer", () => {
  it.each([
    ["no es un objeto", "texto"],
    ["es nulo", null],
    ["es una lista", []],
    ["es de otra versión", { ...serializar(estado()), schemaVersion: 2 }],
    ["no tiene versión", Object.fromEntries(Object.entries(serializar(estado())).filter(([clave]) => clave !== "schemaVersion"))],
    ["tiene el paso fuera de rango", { ...serializar(estado()), paso: 9 }],
    ["tiene el vencimiento fuera de rango", { ...serializar(estado()), diaVencimiento: 31 }],
    ["tiene un método desconocido", { ...serializar(estado()), metodo: "UVA" }],
    ["tiene el alquiler como número", { ...serializar(estado()), alquiler: 450000 }],
    ["tiene una propiedad nueva incompleta", { ...serializar(estado()), propiedad: { id: null, nuevo: true, borrador: { pedido: { street: "x" }, etiqueta: "x" } } }],
    ["tiene un id que no es un número", { ...serializar(estado()), inquilino: { id: "7", nuevo: false, borrador: null } }],
    ["no tiene las otras condiciones", { ...serializar(estado()), otras: null }],
  ])("%s: devuelve null y no rompe", (_motivo, payload) => {
    expect(deserializar(porElCable(payload))).toBeNull();
  });

  it("un borrador marcado como nuevo pero sin datos no queda elegido", () => {
    const payload = { ...serializar(estado()), inquilino: { id: null, nuevo: true, borrador: null } };
    expect(deserializar(porElCable(payload))?.inquilino.nuevo).toBe(false);
  });
});

describe("etiquetaDeBorrador", () => {
  it("nombra la propiedad y el inquilino", () => {
    expect(etiquetaDeBorrador("Lavalle 950", "Pérez")).toBe("Lavalle 950 · Pérez");
  });

  it("con uno solo, nombra el que se sabe", () => {
    expect(etiquetaDeBorrador("Lavalle 950", null)).toBe("Lavalle 950");
    expect(etiquetaDeBorrador(null, "Pérez")).toBe("Pérez");
    expect(etiquetaDeBorrador("  ", "Pérez")).toBe("Pérez");
  });

  it("sin ninguno, dice que no hay ni propiedad ni inquilino", () => {
    expect(etiquetaDeBorrador(null, null)).toBe(SIN_ETIQUETA);
    expect(SIN_ETIQUETA).toBe("Contrato sin propiedad ni inquilino");
  });

  it("no pasa del largo que acepta el backend", () => {
    const etiqueta = etiquetaDeBorrador("a".repeat(200), "b");
    expect(etiqueta.length).toBeLessThanOrEqual(160);
    expect(etiqueta.endsWith("…")).toBe(true);
  });

  it("armarContenido junta la etiqueta y el payload", () => {
    const contenido = armarContenido(estado(), "Lavalle 950, 3B", "Diego Ferrari");
    expect(contenido.label).toBe("Lavalle 950, 3B · Diego Ferrari");
    expect(contenido.payload.paso).toBe(5);
  });
});

describe("vencimiento", () => {
  const ahora = new Date("2026-10-15T12:00:00Z");

  it("cuenta los días que faltan, redondeando hacia arriba", () => {
    expect(diasParaVencer("2026-10-25T12:00:00Z", ahora)).toBe(10);
    expect(diasParaVencer("2026-10-25T18:00:00Z", ahora)).toBe(11);
    expect(diasParaVencer("2026-10-15T12:00:00Z", ahora)).toBe(0);
    expect(diasParaVencer("2026-10-10T12:00:00Z", ahora)).toBe(-5);
  });

  it("avisa a partir de los 15 días y no antes", () => {
    expect(DIAS_DE_AVISO_DE_VENCIMIENTO).toBe(15);
    expect(venceProximamente("2026-10-30T12:00:00Z", ahora)).toBe(true);
    expect(venceProximamente("2026-10-30T12:00:01Z", ahora)).toBe(false);
    expect(venceProximamente("2027-01-13T12:00:00Z", ahora)).toBe(false);
    expect(venceProximamente("2026-10-20T12:00:00Z", ahora)).toBe(true);
  });
});

describe("contenidoCanonico", () => {
  it("no depende del orden en que vengan las claves, a ningún nivel", () => {
    const a = { label: "x", payload: { b: 1, a: { d: [{ z: 1, y: 2 }], c: null } } };
    const b = { payload: { a: { c: null, d: [{ y: 2, z: 1 }] }, b: 1 }, label: "x" };
    expect(contenidoCanonico(a)).toBe(contenidoCanonico(b));
  });

  it("distingue contenidos distintos, y el orden de una lista importa", () => {
    expect(contenidoCanonico({ label: "x", payload: { a: 1 } })).not.toBe(contenidoCanonico({ label: "x", payload: { a: 2 } }));
    expect(contenidoCanonico({ label: "x", payload: { l: [1, 2] } })).not.toBe(contenidoCanonico({ label: "x", payload: { l: [2, 1] } }));
  });

  it("lo que guardó el backend, reordenado, coincide con lo que se mandó", () => {
    const enviado = armarContenido(estado(), "Lavalle 950", "Diego");
    const devuelto = JSON.parse(JSON.stringify(enviado), (_clave, valor: unknown) =>
      valor && typeof valor === "object" && !Array.isArray(valor)
        ? Object.fromEntries(Object.entries(valor).reverse())
        : valor);
    expect(contenidoCanonico(devuelto)).toBe(contenidoCanonico(enviado));
  });
});

describe("filaDeBorrador", () => {
  const resumen = (cambios: Partial<Parameters<typeof filaDeBorrador>[0]> = {}) => ({
    id: 4, label: "Lavalle 950 · Pérez", version: 2,
    createdAt: "2026-07-01T12:00:00Z", updatedAt: "2026-10-12T15:00:00Z", expiresAt: "2027-01-10T15:00:00Z",
    document: null, ...cambios,
  });
  const ahora = new Date("2026-10-15T15:00:00Z");

  it("dice hace cuánto se editó y no habla de vencimiento si falta mucho", () => {
    expect(filaDeBorrador(resumen(), ahora)).toEqual({ id: 4, etiqueta: "Lavalle 950 · Pérez", conPdf: false, editado: "hace 3 días", vence: null });
  });

  it("usa «hoy» y «ayer» como el resto de Inicio", () => {
    expect(filaDeBorrador(resumen({ updatedAt: "2026-10-15T09:00:00Z" }), ahora).editado).toBe("hoy");
    expect(filaDeBorrador(resumen({ updatedAt: "2026-10-14T09:00:00Z" }), ahora).editado).toBe("ayer");
  });

  it("desde los 15 días antes dice el día en que se descarta, con la fecha argentina", () => {
    const fila = filaDeBorrador(resumen({ expiresAt: "2026-10-25T02:30:00Z" }), ahora);
    expect(fila.vence).toBe("24/10/2026"); // las 23:30 del 24 en Buenos Aires
    expect(filaDeBorrador(resumen({ expiresAt: "2026-10-30T15:00:00Z" }), ahora).vence).toBe("30/10/2026");
    expect(filaDeBorrador(resumen({ expiresAt: "2026-10-31T15:00:00Z" }), ahora).vence).toBeNull();
  });

  it("marca si trae un PDF", () => {
    const documento = { fileName: "c.pdf", sizeBytes: 10, pages: 1, uploadedAt: "2026-10-12T15:00:00Z" };
    expect(filaDeBorrador(resumen({ document: documento }), ahora).conPdf).toBe(true);
  });
});
