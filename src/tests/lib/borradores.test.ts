import {
  DIAS_DE_AVISO_DE_VENCIMIENTO,
  PASOS_DEL_DESVIO,
  SIN_ETIQUETA,
  VERSION_DEL_PAYLOAD,
  armarContenido,
  contenidoCanonico,
  deserializar,
  diasParaVencer,
  etiquetaDeBorrador,
  etiquetaDePropiedad,
  etiquetaDePropiedadEnCarga,
  nombreDePropiedadDelBorrador,
  filaDeBorrador,
  formularioDeInquilino,
  formularioDePropiedad,
  serializar,
  ubicacionCompleta,
  venceProximamente,
  type EstadoDelBorrador,
} from "@/lib/borradores";
import { garantiaVacia } from "@/lib/garantias";
import { SIN_DESVIO } from "@/tests/borradores";
import { SIN_OTRAS_CONDICIONES } from "@/lib/otras-condiciones";
import type { PropertyRequest } from "@/lib/backend-types";

const PROPIEDAD: PropertyRequest = { street: "Lavalle", number: "950", city: "CABA", province: "Buenos Aires", latitude: -34.6037, longitude: -58.3816, category: "APARTMENT", floorUnit: "3B" };

function estado(cambios: Partial<EstadoDelBorrador> = {}): EstadoDelBorrador {
  return {
    paso: 5,
    ...SIN_DESVIO,
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

const DIRECCION = { street: "Lavalle", number: "950", city: "CABA", province: "Buenos Aires", postalCode: "C1047", latitude: -34.6, longitude: -58.4 };

describe("el desvío y lo escrito sin confirmar (versión 2)", () => {
  const abierto = estado({
    paso: 1,
    propiedad: { id: null, nuevo: false, borrador: null },
    desvio: { tipo: "property", paso: 4 },
    formularioPropiedad: {
      direccion: DIRECCION, unidad: "3B", categoria: "APARTMENT", bedrooms: 2, bathrooms: 1, superficie: "58", mascotas: true, amoblada: false,
    },
    formularioInquilino: { nombre: "Ana", apellido: "", cuit: "20-30115482-9", correo: "", telefono: "" },
  });

  it("ida y vuelta de una propiedad nueva a medio cargar, en su cuarto paso y sin confirmar", () => {
    expect(deserializar(porElCable(serializar(abierto)))).toEqual(abierto);
  });

  it("guarda una dirección que todavía no está completa tal como se escribió", () => {
    const incompleta = estado({ ...abierto, formularioPropiedad: { ...abierto.formularioPropiedad, direccion: { ...DIRECCION, number: "", city: "" } } });
    expect(deserializar(porElCable(serializar(incompleta)))?.formularioPropiedad.direccion).toEqual({ ...DIRECCION, number: "", city: "" });
  });

  it("el desvío del inquilino vuelve con su único paso", () => {
    const deInquilino = estado({ desvio: { tipo: "tenant", paso: 1 } });
    expect(deserializar(porElCable(serializar(deInquilino)))?.desvio).toEqual({ tipo: "tenant", paso: 1 });
  });

  it.each([
    ["un paso de más", { tipo: "property", paso: 9 }, { tipo: "property", paso: PASOS_DEL_DESVIO.property }],
    ["un paso de menos", { tipo: "property", paso: 0 }, { tipo: "property", paso: 1 }],
    ["un paso que no es un número", { tipo: "property", paso: "2" }, { tipo: "property", paso: 1 }],
    ["un paso de más en el inquilino", { tipo: "tenant", paso: 3 }, { tipo: "tenant", paso: 1 }],
    ["un tipo desconocido", { tipo: "contract", paso: 1 }, null],
    ["algo que no es un objeto", "property", null],
  ])("saneado del desvío con %s", (_motivo, desvio, esperado) => {
    const payload = { ...(porElCable(serializar(abierto)) as object), desvio };
    expect(deserializar(payload)?.desvio).toEqual(esperado);
  });

  it("un campo roto del formulario vuelve vacío y no tira abajo el resto del borrador", () => {
    const payload = porElCable(serializar(abierto)) as { formularioPropiedad: Record<string, unknown> };
    const roto = {
      ...payload,
      formularioPropiedad: { ...payload.formularioPropiedad, categoria: "CASTILLO", bedrooms: -3, bathrooms: "dos", superficie: 58, mascotas: "sí", direccion: { street: "x" } },
    };
    expect(deserializar(roto)?.formularioPropiedad).toEqual({
      direccion: null, unidad: "3B", categoria: null, bedrooms: null, bathrooms: null, superficie: "", mascotas: false, amoblada: false,
    });
    expect(deserializar(roto)?.alquiler).toBe("450000");
  });

  it("sin formularios en un borrador de la versión actual, se rearman de lo confirmado", () => {
    const payload = porElCable(serializar(estado())) as Record<string, unknown>;
    delete payload.formularioPropiedad;
    delete payload.formularioInquilino;
    expect(deserializar(payload)?.formularioPropiedad).toEqual(formularioDePropiedad(PROPIEDAD));
  });
});

describe("un borrador de la versión 1", () => {
  /** Tal como lo guardaba la versión anterior: sin el desvío ni los formularios. */
  function enVersion1(cambios: Partial<EstadoDelBorrador> = {}) {
    const resto = Object.fromEntries(Object.entries(serializar(estado(cambios))).filter(([clave]) => !["desvio", "formularioPropiedad", "formularioInquilino"].includes(clave)));
    return porElCable({ ...resto, schemaVersion: 1 });
  }

  it("se abre en el contrato, sin desvío", () => {
    expect(deserializar(enVersion1())?.desvio).toBeNull();
  });

  it("rearma los formularios desde la propiedad y el inquilino confirmados", () => {
    const inquilino = { firstName: "Pablo", lastName: "Pérez", taxId: "20301154829", email: "p@e.com", phoneNumber: "1155600183" };
    const leido = deserializar(enVersion1({ inquilino: { id: null, nuevo: true, borrador: { pedido: inquilino, etiqueta: "Pablo Pérez" } } }));

    expect(leido?.formularioPropiedad).toEqual(formularioDePropiedad(PROPIEDAD));
    expect(leido?.formularioPropiedad.direccion?.street).toBe("Lavalle");
    expect(leido?.formularioInquilino).toEqual({ nombre: "Pablo", apellido: "Pérez", cuit: "20-30115482-9", correo: "p@e.com", telefono: "1155600183" });
  });

  it("sin nada confirmado, los formularios quedan vacíos", () => {
    const leido = deserializar(enVersion1({ propiedad: { id: 3, nuevo: false, borrador: null } }));
    expect(leido?.formularioPropiedad).toEqual(formularioDePropiedad(undefined));
    expect(leido?.formularioInquilino).toEqual(formularioDeInquilino(undefined));
  });

  it("al volver a guardarlo se escribe como versión 2", () => {
    const leido = deserializar(enVersion1())!;
    expect(serializar(leido).schemaVersion).toBe(VERSION_DEL_PAYLOAD);
    expect(VERSION_DEL_PAYLOAD).toBe(2);
  });
});

describe("la ubicación de una propiedad nueva", () => {
  it("está completa con calle, número, ciudad y provincia", () => {
    expect(ubicacionCompleta(DIRECCION)).toBe(true);
  });

  it.each([["calle", "street"], ["número", "number"], ["ciudad", "city"], ["provincia", "province"]])("sin %s no está completa, ni con espacios", (_nombre, campo) => {
    expect(ubicacionCompleta({ ...DIRECCION, [campo]: "" })).toBe(false);
    expect(ubicacionCompleta({ ...DIRECCION, [campo]: "   " })).toBe(false);
  });

  it("el código postal y las coordenadas no hacen falta", () => {
    expect(ubicacionCompleta({ ...DIRECCION, postalCode: "", latitude: null, longitude: null })).toBe(true);
  });

  it("sin dirección no está completa", () => {
    expect(ubicacionCompleta(null)).toBe(false);
  });

  it("la propiedad que se está cargando se nombra por su dirección sólo cuando la ubicación está completa", () => {
    const formulario = { ...formularioDePropiedad(undefined), direccion: DIRECCION };
    expect(etiquetaDePropiedadEnCarga(formulario)).toBe("Lavalle 950");
    expect(etiquetaDePropiedadEnCarga({ ...formulario, unidad: " 3B " })).toBe("Lavalle 950, 3B");
    expect(etiquetaDePropiedadEnCarga({ ...formulario, direccion: { ...DIRECCION, number: "" } })).toBeNull();
    expect(etiquetaDePropiedadEnCarga(formularioDePropiedad(undefined))).toBeNull();
  });

  it("lo confirmado o elegido manda sobre la propiedad que se está cargando", () => {
    const formulario = { ...formularioDePropiedad(undefined), direccion: DIRECCION };
    expect(nombreDePropiedadDelBorrador("Mitre 78", formulario)).toBe("Mitre 78");
    expect(nombreDePropiedadDelBorrador(null, formulario)).toBe("Lavalle 950");
    expect(nombreDePropiedadDelBorrador(null, { ...formulario, direccion: { ...DIRECCION, province: "" } })).toBeNull();
  });

  it("mientras no se sabe cómo se llama lo elegido, no se lo reemplaza por lo que se está cargando", () => {
    const formulario = { ...formularioDePropiedad(undefined), direccion: DIRECCION };
    expect(nombreDePropiedadDelBorrador(undefined, formulario)).toBeUndefined();
  });

  it("la etiqueta de una dirección lleva la unidad después de una coma", () => {
    expect(etiquetaDePropiedad(DIRECCION, "")).toBe("Lavalle 950");
    expect(etiquetaDePropiedad({ ...DIRECCION, street: " Lavalle ", number: " 950 " }, "3B")).toBe("Lavalle 950, 3B");
  });
});

describe("un borrador que no se puede leer", () => {
  it.each([
    ["no es un objeto", "texto"],
    ["es nulo", null],
    ["es una lista", []],
    ["es de otra versión", { ...serializar(estado()), schemaVersion: 3 }],
    ["es de una versión anterior que nunca existió", { ...serializar(estado()), schemaVersion: 0 }],
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
