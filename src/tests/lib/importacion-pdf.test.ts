import { ApiError } from "@/lib/api";
import type { ContractImportResponse } from "@/lib/backend-types";
import { campo, cita, lectura } from "@/tests/lectura-de-contrato";
import { ERROR } from "@/lib/error-codes";
import {
  accionesDeCampos,
  armarAlta,
  armarCierre,
  datosCompletos,
  itemsConErrorDelServidor,
  leerResultado,
  mensajeDeRechazo,
  MAX_BYTES,
  pasosDeLectura,
  pendientes,
  revisarArchivo,
  type Borrador,
  type Decisiones,
  type ItemId,
} from "@/lib/importacion-pdf";

const sinRevisar = new Set<ItemId>();
const sinSumar = new Set<ItemId>();

function pendientesDe(respuesta: ContractImportResponse, cambios: Partial<Borrador> = {}, decisiones: Decisiones = {}, revisados = sinRevisar) {
  const leida = leerResultado(respuesta);
  const borrador = { ...leida.borrador, ...cambios };
  return { leida, borrador, lista: pendientes(leida, borrador, decisiones, revisados, sinSumar) };
}

describe("revisarArchivo", () => {
  it("acepta un PDF de tamaño razonable", () => {
    expect(revisarArchivo({ name: "contrato.pdf", type: "application/pdf", size: 1_000_000 })).toBeNull();
  });

  it("acepta un PDF que el sistema no tipó, por la extensión", () => {
    expect(revisarArchivo({ name: "Contrato.PDF", type: "", size: 1000 })).toBeNull();
  });

  it("rechaza lo que no es PDF y pide el contrato como PDF", () => {
    expect(revisarArchivo({ name: "foto.jpg", type: "image/jpeg", size: 1000 })).toMatch(/no es un PDF/);
  });

  it("rechaza lo que pasa de 20 MB y dice cuánto pesa", () => {
    expect(revisarArchivo({ name: "grande.pdf", type: "application/pdf", size: MAX_BYTES + 1 })).toMatch(/máximo es 20 MB/);
  });
});

describe("mensajeDeRechazo", () => {
  it("usa el texto del tipo de problema que conoce", () => {
    expect(mensajeDeRechazo(new ApiError(400, "x", ERROR.IMPORT_FILE_ENCRYPTED))).toMatch(/contraseña/);
  });

  it("la cuota agotada y la lectura apagada tienen su tipo y su texto, y mandan a cargarlo a mano", () => {
    expect(mensajeDeRechazo(new ApiError(429, "Quota", ERROR.IMPORT_QUOTA_EXCEEDED))).toMatch(/usó todas las lecturas.*a mano/);
    expect(mensajeDeRechazo(new ApiError(503, "Off", ERROR.AI_IMPORTS_UNAVAILABLE))).toMatch(/no está disponible.*a mano/);
  });

  it("sin conexión con el servidor, lo dice en vez del mensaje genérico", () => {
    expect(mensajeDeRechazo(new TypeError("Failed to fetch"))).toMatch(/No pudimos conectarnos/);
  });

  it("ante algo desconocido, no muestra el texto técnico", () => {
    expect(mensajeDeRechazo(new ApiError(500, "NullPointerException"))).not.toContain("Null");
    expect(mensajeDeRechazo(new ApiError(404, "Not Found"))).toMatch(/Inténtelo de nuevo/);
  });
});

describe("pasosDeLectura", () => {
  const estados = (r: Parameters<typeof pasosDeLectura>[0]) => pasosDeLectura(r).map((p) => `${p.clave}:${p.estado}`);

  it("son tres pasos, en orden: no hay dos a la vez", () => {
    expect(pasosDeLectura({ status: "QUEUED", stage: null, pagesDone: null, pagesTotal: null }).map((p) => p.texto)).toEqual([
      "Abriendo el archivo", "Leyendo las páginas y buscando los datos", "Revisando lo que encontramos",
    ]);
    for (const stage of ["OPENING", "READING_PAGES", "FINDING_DATA", "CHECKING"] as const) {
      const enCurso = pasosDeLectura({ status: "PROCESSING", stage, pagesDone: 1, pagesTotal: 6 }).filter((p) => p.estado === "ahora");
      expect(enCurso).toHaveLength(1);
    }
  });

  it("en cola no hay nada en curso ni tildado", () => {
    expect(estados({ status: "QUEUED", stage: null, pagesDone: null, pagesTotal: null })).toEqual([
      "abrir:despues", "leer:despues", "revisar:despues",
    ]);
  });

  it("abriendo el archivo", () => {
    expect(estados({ status: "PROCESSING", stage: "OPENING", pagesDone: null, pagesTotal: null })).toEqual([
      "abrir:ahora", "leer:despues", "revisar:despues",
    ]);
  });

  it("leyendo: abrir tildado, la lectura en curso con el contador a la vista y la revisión sin tildar", () => {
    const pasos = pasosDeLectura({ status: "PROCESSING", stage: "READING_PAGES", pagesDone: 3, pagesTotal: 6 });
    expect(pasos.map((p) => `${p.clave}:${p.estado}`)).toEqual(["abrir:listo", "leer:ahora", "revisar:despues"]);
    expect(pasos[1].detalle).toBe("página 3 de 6");
  });

  it("buscando los datos con el OCR en marcha o terminado: sigue siendo el mismo paso, sin tildarse por su cuenta", () => {
    expect(estados({ status: "PROCESSING", stage: "FINDING_DATA", pagesDone: 6, pagesTotal: 6 })).toEqual([
      "abrir:listo", "leer:ahora", "revisar:despues",
    ]);
  });

  it("al llegar a la comprobación se tilda la lectura y sigue la revisión", () => {
    expect(estados({ status: "PROCESSING", stage: "CHECKING", pagesDone: 6, pagesTotal: 6 })).toEqual([
      "abrir:listo", "leer:listo", "revisar:ahora",
    ]);
  });

  it("sin el total de páginas, no inventa un contador", () => {
    const pasos = pasosDeLectura({ status: "PROCESSING", stage: "FINDING_DATA", pagesDone: null, pagesTotal: null });
    expect(pasos[1].detalle).toBeUndefined();
  });

  it("lista: todo tildado", () => {
    expect(estados({ status: "READY", stage: null, pagesDone: 6, pagesTotal: 6 })).toEqual([
      "abrir:listo", "leer:listo", "revisar:listo",
    ]);
  });
});

describe("leerResultado", () => {
  it("arma el borrador con lo que leyó el backend, en el formato de los formularios", () => {
    const { borrador } = leerResultado(lectura());
    expect(borrador).toMatchObject({
      calle: "Colón", numero: "2255", piso: "4.º D", ciudad: "Vicente López", provincia: "Buenos Aires",
      nombre: "Lucía", apellido: "Benítez", cuit: "27334567899",
      alquiler: "450000", moneda: "ARS", dia: "10", inicio: "2026-09-01", plazo: "36",
      metodo: "IPC", frecuencia: "4", propiedadId: null, inquilinoId: null,
    });
    expect(borrador.otras.deposito).toBe("450000");
  });

  it("un departamento con piso se sugiere como tal; el contrato no dice el tipo, así que se revisa", () => {
    const { borrador, items } = leerResultado(lectura());
    expect(borrador.categoria).toBe("APARTMENT");
    expect(items.tipo.estado).toBe("revisar");
  });

  it("un local comercial se sugiere como local", () => {
    const { borrador } = leerResultado(lectura({ "property.use": campo("COMMERCIAL") }));
    expect(borrador.categoria).toBe("COMMERCIAL_PREMISES");
  });

  it("el dato que la lectura interpretó queda en «revisar» con su nota; el literal, en «ok»", () => {
    const { items } = leerResultado(lectura());
    expect(items.vencimiento.estado).toBe("revisar");
    expect(items.vencimiento.nota).toBe("El contrato dice «del 1 al 10 de cada mes»");
    expect(items.alquiler.estado).toBe("ok");
    expect(items.plazo.estado).toBe("ok");
  });

  it("el correo y el teléfono que el contrato no trae «faltan»", () => {
    expect(leerResultado(lectura()).items.contacto.estado).toBe("falta");
  });

  it("una cita que no se pudo verificar manda el dato a revisar, con el motivo en español", () => {
    const { items } = leerResultado(lectura({
      "rent.initialAmount": campo(450000, "LITERAL", { evidence: [cita(2, "…", false)], validation: ["EVIDENCE_UNVERIFIED"] }),
    }));
    expect(items.alquiler.estado).toBe("revisar");
    expect(items.alquiler.motivos).toEqual(["No pudimos comprobar la cita en el documento."]);
  });

  it("no muestra la nota fija en inglés que agrega el backend", () => {
    const { items } = leerResultado(lectura({
      "rent.initialAmount": campo(450000, "INFERRED", { note: "Evidence could not be verified", validation: ["EVIDENCE_UNVERIFIED"] }),
    }));
    expect(items.alquiler.nota).toBeNull();
  });

  it("un aviso técnico que no conoce se muestra como una frase genérica, nunca crudo", () => {
    const { items } = leerResultado(lectura({ "rent.initialAmount": campo(450000, "INFERRED", { validation: ["algo: raro"] }) }));
    expect(items.alquiler.motivos).toEqual(["Conviene revisarlo."]);
  });

  it("un depósito que el contrato no trae no se muestra hasta que el propietario lo suma", () => {
    const { items } = leerResultado(lectura({ "deposit.amount": campo(null, "MISSING") }));
    expect(items.deposito.presente).toBe(false);
    expect(items.punitorios.presente).toBe(false);
  });

  it("propiedad e inquilino que ya existen quedan elegidos por defecto", () => {
    const { borrador, coincidencias } = leerResultado(lectura({}, { matches: { property: { id: 12, by: "ADDRESS" }, tenant: { id: 7, by: "TAX_ID" } } }));
    expect(borrador.propiedadId).toBe(12);
    expect(borrador.inquilinoId).toBe(7);
    expect(coincidencias).toEqual({ propiedadId: 12, inquilinoId: 7 });
  });

  it("una actualización por porcentaje fijo carga el valor; una por índice, el índice", () => {
    const porcentaje = leerResultado(lectura({ "increments.method": campo("FIXED_PERCENTAGE"), "increments.indexName": campo(null, "MISSING"), "increments.value": campo(8) }));
    expect(porcentaje.borrador).toMatchObject({ metodo: "FIXED_PERCENTAGE", valorDeActualizacion: "8" });
  });

  it("los garantes entran como garantías; una póliza usa el nombre como aseguradora", () => {
    const { borrador } = leerResultado(lectura({
      guarantors: campo([
        { fullName: "Ana Gómez", taxId: "27248910556", type: "PERSONAL", address: "Lavalle 950" },
        { fullName: "Aseguradora Sur", taxId: null, type: "SURETY_INSURANCE", address: null },
      ]),
    }));
    expect(borrador.otras.garantias[0]).toMatchObject({ type: "PERSONAL", fullName: "Ana Gómez", address: "Lavalle 950" });
    expect(borrador.otras.garantias[1]).toMatchObject({ type: "SURETY_INSURANCE", insurerName: "Aseguradora Sur", fullName: "" });
  });

  it("las garantías leídas siempre se revisan, aunque la lectura las dé por seguras", () => {
    const { items } = leerResultado(lectura({
      guarantors: campo([{ fullName: "Ana Gómez", taxId: "27248910556", type: "PERSONAL", address: "Lavalle 950" }]),
    }));
    expect(items.garantias.estado).toBe("revisar");
    expect(items.garantias.motivos.join(" ")).toMatch(/Se guardan con el contrato al crearlo/);
  });

  it("sin garantes en el contrato, no se muestran ni se piden", () => {
    const { items } = leerResultado(lectura());
    expect(items.garantias.presente).toBe(false);
  });

  it("sin resultado todavía, no inventa nada", () => {
    const { borrador, items } = leerResultado(lectura({}, { fields: null, unsupported: null, matches: null }));
    expect(borrador.alquiler).toBe("");
    expect(items.alquiler.estado).toBe("falta");
  });
});

describe("cláusulas que no se cargan tal cual", () => {
  it("dos inquilinos: «No se puede cargar así» con las dos citas; se resuelve indicando uno", () => {
    const respuesta = lectura({
      "tenant.firstName": campo(null, "UNSUPPORTED", { evidence: [cita(1, "Lucía Benítez y Mario Pérez")] }),
      "tenant.lastName": campo(null, "UNSUPPORTED", { evidence: [cita(1, "Lucía Benítez y Mario Pérez")] }),
      "tenant.taxId": campo(null, "UNSUPPORTED", { evidence: [cita(1, "Lucía Benítez y Mario Pérez")] }),
    }, { unsupported: [{ field: "tenants", reason: "MULTIPLE_TENANTS", evidence: [cita(1, "Lucía Benítez y Mario Pérez")] }] });
    const { leida, lista } = pendientesDe(respuesta);
    expect(leida.items.inquilino.estado).toBe("noSePuede");
    expect(leida.items.inquilino.noSePuede).toBe("variosInquilinos");
    expect(leida.items.inquilino.citas[0].texto).toContain("Mario Pérez");
    expect(lista.find((p) => p.id === "inquilino")).toMatchObject({ razon: "noSePuede", bloqueante: false });

    const resuelto = pendientesDe(respuesta, { nombre: "Lucía", apellido: "Benítez", cuit: "27334567899", correo: "l@x.com", telefono: "11 4455 2210" });
    expect(resuelto.lista.find((p) => p.id === "inquilino")).toBeUndefined();
  });

  it("varios campos que citan el mismo pasaje lo muestran una sola vez", () => {
    const mismo = [cita(1, "Lucía Benítez y Mario Pérez")];
    const { items } = leerResultado(lectura({
      "tenant.firstName": campo(null, "UNSUPPORTED", { evidence: mismo }),
      "tenant.lastName": campo(null, "UNSUPPORTED", { evidence: mismo }),
    }, { unsupported: [{ field: "tenants", reason: "MULTIPLE_TENANTS", evidence: mismo }] }));
    expect(items.inquilino.citas).toHaveLength(1);
  });

  it("alquiler escalonado: bloquea y no se resuelve acá", () => {
    const respuesta = lectura({ "rent.initialAmount": campo(null, "UNSUPPORTED", { evidence: [cita(2, "300.000 los primeros seis meses y 420.000 después")] }) });
    const { leida, lista } = pendientesDe(respuesta);
    expect(leida.items.alquiler.noSePuede).toBe("alquilerEscalonado");
    expect(lista.find((p) => p.id === "alquiler")).toMatchObject({ razon: "noSePuede", bloqueante: true });
  });

  it("un índice que no es ICL ni IPC: bloquea", () => {
    const respuesta = lectura({ "increments.method": campo(null, "UNSUPPORTED"), "increments.indexName": campo(null, "UNSUPPORTED") });
    expect(pendientesDe(respuesta).lista.find((p) => p.id === "actualizacion")).toMatchObject({ bloqueante: true });
  });

  it("vencimiento el día 30: se ofrece el 28 diciendo qué dice el contrato", () => {
    const respuesta = lectura({ "rent.dueDay": campo(30, "INFERRED", { validation: ["DUE_DAY_OUT_OF_RANGE"] }) });
    const { leida, lista, borrador } = pendientesDe(respuesta);
    expect(leida.items.vencimiento.noSePuede).toBe("diaMayorA28");
    expect(leida.items.vencimiento.diaDelContrato).toBe(30);
    expect(borrador.dia).toBe("");
    expect(lista.find((p) => p.id === "vencimiento")).toMatchObject({ razon: "noSePuede", bloqueante: false });

    const elegido = pendientesDe(respuesta, { dia: "28" }, { vencimiento: "usar28" });
    expect(elegido.lista.find((p) => p.id === "vencimiento")).toBeUndefined();
  });

  it("si la lectura dejó el día sin valor, lo busca en la cita", () => {
    const respuesta = lectura({ "rent.dueDay": campo(null, "UNSUPPORTED", { evidence: [cita(3, "hasta el día 31 de cada mes")] }) });
    expect(leerResultado(respuesta).items.vencimiento.diaDelContrato).toBe(31);
  });

  it("punitorios atados a una tasa bancaria: se puede crear sin punitorios", () => {
    const respuesta = lectura({ "lateFee.method": campo(null, "UNSUPPORTED", { evidence: [cita(4, "la tasa activa del Banco Nación")] }) });
    const { leida, lista } = pendientesDe(respuesta);
    expect(leida.items.punitorios.noSePuede).toBe("punitorios");
    expect(lista.find((p) => p.id === "punitorios")).toBeDefined();
    expect(pendientesDe(respuesta, {}, { punitorios: "sinPunitorios" }).lista.find((p) => p.id === "punitorios")).toBeUndefined();
  });

  it("un depósito en otra moneda que el alquiler no se propone como monto", () => {
    const respuesta = lectura({ "deposit.amount": campo(1000), "deposit.currency": campo("USD") });
    const { leida, borrador } = pendientesDe(respuesta);
    expect(leida.items.deposito.noSePuede).toBe("monedaDelDeposito");
    expect(borrador.otras.deposito).toBe("");
  });

  it("una cláusula que ningún item reconoce bloquea", () => {
    const respuesta = lectura({}, { unsupported: [{ field: "algo.raro", reason: "OTHER", evidence: [cita(5, "cláusula extraña")] }] });
    expect(pendientesDe(respuesta).lista.find((p) => p.id === "otro")).toMatchObject({ bloqueante: true });
  });
});

describe("pendientes", () => {
  it("lo revisable, lo que falta y nada más: cuenta cada cosa una vez", () => {
    const { lista } = pendientesDe(lectura());
    expect(lista.map((p) => `${p.id}:${p.razon}`)).toEqual([
      "tipo:revisar", "contacto:falta", "vencimiento:revisar", "deposito:revisar",
    ]);
  });

  it("«Está bien así» resuelve un dato a revisar", () => {
    const { lista } = pendientesDe(lectura(), {}, {}, new Set<ItemId>(["tipo", "vencimiento", "deposito"]));
    expect(lista.map((p) => p.id)).toEqual(["contacto"]);
  });

  it("completar el correo y el teléfono resuelve el contacto", () => {
    const { lista } = pendientesDe(lectura(), { correo: "lucia@correo.com", telefono: "11 4455 2210" }, {}, new Set<ItemId>(["tipo", "vencimiento", "deposito"]));
    expect(lista).toEqual([]);
  });

  it("un dato revisado que después queda inválido vuelve a faltar", () => {
    const { lista } = pendientesDe(lectura(), { alquiler: "" }, {}, new Set<ItemId>(["tipo", "vencimiento", "deposito"]));
    expect(lista.map((p) => `${p.id}:${p.razon}`)).toContain("alquiler:falta");
  });

  it("con una propiedad existente elegida, el tipo no se pregunta", () => {
    const { lista } = pendientesDe(lectura({}, { matches: { property: { id: 12, by: "ADDRESS" } } }));
    expect(lista.map((p) => p.id)).not.toContain("tipo");
  });

  it("un opcional que el contrato no trae solo cuenta si el propietario lo suma", () => {
    const respuesta = lectura({ "commission.percent": campo(null, "MISSING") });
    const leida = leerResultado(respuesta);
    const sumado = pendientes(leida, { ...leida.borrador, otras: { ...leida.borrador.otras, comision: "abc" } }, {}, sinRevisar, new Set<ItemId>(["comision"]));
    expect(sumado.map((p) => p.id)).toContain("comision");
    const sinSumar = pendientes(leida, { ...leida.borrador, otras: { ...leida.borrador.otras, comision: "abc" } }, {}, sinRevisar, new Set<ItemId>());
    expect(sinSumar.map((p) => p.id)).not.toContain("comision");
  });
});

describe("datosCompletos", () => {
  const base = leerResultado(lectura()).borrador;

  it("un CUIT con dígito verificador incorrecto no alcanza", () => {
    expect(datosCompletos("inquilino", { ...base, cuit: "27334567890" })).toBe(false);
    expect(datosCompletos("inquilino", base)).toBe(true);
  });

  it("el vencimiento va del 1 al 28", () => {
    expect(datosCompletos("vencimiento", { ...base, dia: "29" })).toBe(false);
    expect(datosCompletos("vencimiento", { ...base, dia: "28" })).toBe(true);
  });

  it("un porcentaje de actualización necesita su valor", () => {
    expect(datosCompletos("actualizacion", { ...base, metodo: "FIXED_PERCENTAGE", valorDeActualizacion: "" })).toBe(false);
    expect(datosCompletos("actualizacion", { ...base, metodo: "FIXED_PERCENTAGE", valorDeActualizacion: "8" })).toBe(true);
  });
});

describe("armarAlta", () => {
  const respuesta = lectura({ "tenant.email": campo("lucia@correo.com", "INFERRED"), "tenant.phone": campo("11 4455 2210", "INFERRED") });

  it("crea propiedad e inquilino nuevos con los datos revisados, en un solo pedido", () => {
    const { borrador } = pendientesDe(respuesta);
    const pedido = armarAlta(borrador, {}, { paidThrough: "2026-08" });
    expect(pedido.property).toEqual({
      new: { street: "Colón", number: "2255", floorUnit: "4.º D", city: "Vicente López", province: "Buenos Aires", postalCode: undefined, category: "APARTMENT" },
    });
    expect(pedido.tenant).toEqual({ new: { firstName: "Lucía", lastName: "Benítez", taxId: "27334567899", email: "lucia@correo.com", phoneNumber: "1144552210" } });
    expect(pedido.contract).toMatchObject({
      initialRentAmount: 450000, currency: "ARS", startDate: "2026-09-01", termMonths: 36, dueDay: 10,
      incrementMethod: "INDEX", incrementIndexName: "IPC", incrementFrequencyMonths: 4, depositAmount: 450000,
    });
    expect(pedido.elapsed).toEqual({ paidThrough: "2026-08" });
  });

  it("usa la propiedad y el inquilino que ya existen en vez de crearlos", () => {
    const { borrador } = pendientesDe(lectura({}, { matches: { property: { id: 12, by: "ADDRESS" }, tenant: { id: 7, by: "TAX_ID" } } }));
    const pedido = armarAlta(borrador, {}, undefined);
    expect(pedido.property).toEqual({ id: 12 });
    expect(pedido.tenant).toEqual({ id: 7 });
  });

  it("las garantías se mandan como `guarantees` del contrato, editadas o no, y no se aplican solas", () => {
    const { borrador } = pendientesDe(lectura({
      guarantors: campo([{ fullName: "Ana Gómez", taxId: "27248910556", type: "PERSONAL", address: "Lavalle 950" }]),
    }));
    const { contract } = armarAlta(borrador, {}, undefined);
    expect(contract.guarantees).toEqual([expect.objectContaining({ type: "PERSONAL", fullName: "Ana Gómez" })]);
  });

  it("«Crear uno nuevo» vuelve a mandar los datos leídos", () => {
    const { borrador } = pendientesDe(lectura({}, { matches: { tenant: { id: 7, by: "TAX_ID" } } }), { inquilinoId: null, correo: "a@b.com", telefono: "11 4455 2210" });
    expect(armarAlta(borrador, {}, undefined).tenant).toMatchObject({ new: { firstName: "Lucía" } });
  });

  it("un porcentaje fijo manda el valor y no el índice", () => {
    const { borrador } = pendientesDe(respuesta, { metodo: "FIXED_PERCENTAGE", valorDeActualizacion: "8" });
    const { contract } = armarAlta(borrador, {}, undefined);
    expect(contract).toMatchObject({ incrementMethod: "FIXED_PERCENTAGE", incrementValue: 8 });
    expect(contract).not.toHaveProperty("incrementIndexName");
  });

  it("«crear sin punitorios» y «sin depósito» no mandan esos datos", () => {
    const conRecargo = lectura({
      "deposit.amount": campo(1000), "deposit.currency": campo("USD"),
      "lateFee.method": campo("FIXED_ONCE"), "lateFee.value": campo(20000),
    });
    const { borrador } = pendientesDe(conRecargo);
    const { contract } = armarAlta(borrador, { punitorios: "sinPunitorios", deposito: "sinDeposito" }, undefined);
    expect(contract).not.toHaveProperty("lateFeeMethod");
    expect(contract).not.toHaveProperty("depositAmount");
  });
});

describe("cierre de la lectura", () => {
  const respuesta = lectura({
    "tenant.email": campo(null, "MISSING"),
    "tenant.phone": campo("11 4455 2210"),
    "deposit.amount": campo(450000, "INFERRED"),
  });

  it("cada dato lleva la acción que el propietario hizo: confirmó, corrigió, completó o lo dejó", () => {
    const leida = leerResultado(respuesta);
    const borrador = { ...leida.borrador, otras: { ...leida.borrador.otras, deposito: "500000" }, correo: "lucia@correo.com", telefono: "11 4455 2210" };
    const cierre = armarCierre(leida, borrador, {}, new Set<ItemId>(["vencimiento", "deposito"]), 77);
    expect(cierre.contractId).toBe(77);
    expect(cierre.fieldActions["rent.dueDay"]).toBe("CONFIRMED");
    expect(cierre.fieldActions["deposit.amount"]).toBe("CORRECTED");
    expect(cierre.fieldActions["tenant.email"]).toBe("FILLED");
    expect(cierre.fieldActions["rent.initialAmount"]).toBe("UNTOUCHED");
    expect(cierre.finalValues).toMatchObject({ "rent.initialAmount": 450000, "deposit.amount": 500000, "tenant.email": "lucia@correo.com", "rent.dueDay": 10 });
  });

  it("un dato en revisión que no se tocó queda sin tocar", () => {
    const leida = leerResultado(respuesta);
    const acciones = accionesDeCampos(leida, { "rent.dueDay": 10 }, sinRevisar);
    expect(acciones["rent.dueDay"]).toBe("UNTOUCHED");
  });

  it("el CUIT y el teléfono se comparan por sus dígitos", () => {
    const leida = leerResultado(lectura({ "tenant.taxId": campo("27-33456789-9"), "tenant.phone": campo("11 4455-2210") }));
    const acciones = accionesDeCampos(leida, { "tenant.taxId": "27334567899", "tenant.phone": "1144552210" }, sinRevisar);
    expect(acciones["tenant.taxId"]).toBe("UNTOUCHED");
    expect(acciones["tenant.phone"]).toBe("UNTOUCHED");
  });

  it("con inquilino existente no manda los datos de un inquilino nuevo", () => {
    const leida = leerResultado(lectura({}, { matches: { tenant: { id: 7, by: "TAX_ID" } } }));
    const cierre = armarCierre(leida, leida.borrador, {}, sinRevisar, 77);
    expect(Object.keys(cierre.finalValues).some((clave) => clave.startsWith("tenant."))).toBe(false);
  });
});

describe("itemsConErrorDelServidor", () => {
  it("ubica cada error por su prefijo, en el orden de la pantalla", () => {
    expect(itemsConErrorDelServidor({
      "contract.dueDay": "x", "tenant.new.email": "x", "property.street": "x", "contract.guarantees[0].fullName": "x",
    })).toEqual(["propiedad", "contacto", "vencimiento", "garantias"]);
  });

  it("una ruta desconocida no marca nada", () => {
    expect(itemsConErrorDelServidor({ "otra.cosa": "x" })).toEqual([]);
    expect(itemsConErrorDelServidor(null)).toEqual([]);
  });
});
