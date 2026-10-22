import { ApiError } from "@/lib/api";
import { CENTRO_DE_ARGENTINA } from "@/lib/geo";
import type {
  ContractImportCompletionRequest,
  ContractImportResponse,
  ContractOnboardingRequest,
  ContractTerms,
  Currency,
  ElapsedDecision,
  ImportEvidence,
  ImportField,
  ImportFieldAction,
  PropertyCategory,
  PropertyRequest,
  TenantRequest,
} from "@/lib/backend-types";
import { correoValido } from "@/lib/correo";
import { cuitValido, soloDigitos } from "@/lib/cuit";
import { copyDeError } from "@/lib/error-codes";
import { armarGarantias, garantiaVacia, hayErrores, MAX_GARANTIAS, validarGarantias, type GarantiaBorrador } from "@/lib/garantias";
import {
  armarOtrasCondiciones,
  numeroDecimal,
  SIN_OTRAS_CONDICIONES,
  validarOtrasCondiciones,
  type OtrasCondiciones,
} from "@/lib/otras-condiciones";
import { soloDigitosTelefono, telefonoValido } from "@/lib/telefono";

/**
 * La lectura de un contrato firmado, del lado del front. El backend devuelve cada dato con su
 * estado y la cita de donde salió; acá se decide qué le pide la pantalla al propietario y se arma
 * lo que se manda al crear. Nada de esto toca la red ni el DOM.
 */

// --- Subir el archivo ---------------------------------------------------------------------------

/** Lo que el backend acepta. Acá sólo se usa para avisar antes de subir: el backend decide. */
export const MAX_BYTES = 20 * 1024 * 1024;

export function formatearBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`;
}

/** Un aviso si el archivo no sirve, o null. Sólo da una respuesta rápida: no valida el contenido. */
export function revisarArchivo(archivo: Pick<File, "name" | "type" | "size">): string | null {
  const esPdf = archivo.type === "application/pdf" || archivo.name.toLowerCase().endsWith(".pdf");
  if (!esPdf) return "Ese archivo no es un PDF. Si tiene el contrato en papel, escanéelo y guárdelo como PDF.";
  if (archivo.size > MAX_BYTES) return `El archivo pesa ${formatearBytes(archivo.size)}. El máximo es 20 MB.`;
  return null;
}

/**
 * Lo que se le dice al propietario cuando no se pudo subir el archivo: cada rechazo llega con su
 * `type` (archivo inválido, cuota agotada, lectura apagada). Sin respuesta del servidor, se dice
 * que no hubo conexión.
 */
export function mensajeDeRechazo(err: unknown): string {
  if (!(err instanceof ApiError)) return "No pudimos conectarnos. Revise su conexión e inténtelo de nuevo.";
  return copyDeError(err, { fallback: "No pudimos subir el archivo. Inténtelo de nuevo." });
}

// --- La espera ----------------------------------------------------------------------------------

export interface PasoDeLectura {
  clave: "abrir" | "leer" | "revisar";
  texto: string;
  estado: "listo" | "ahora" | "despues";
  /** «página 3 de 6», sólo en el paso de la lectura y cuando el backend ya la informó. */
  detalle?: string;
}

/**
 * Cada tilde sigue una etapa que el backend ya informó, nunca un reloj. Por dentro el OCR local
 * (`READING_PAGES`) y la lectura del modelo (`FINDING_DATA`) corren en paralelo, y ninguna prueba que
 * la otra terminó: para el propietario son un solo paso, «Leyendo las páginas y buscando los datos»,
 * que se tilda al llegar a `CHECKING`. Así la lista avanza en orden, sin dos pasos a la vez.
 */
export function pasosDeLectura(lectura: Pick<ContractImportResponse, "status" | "stage" | "pagesDone" | "pagesTotal">): PasoDeLectura[] {
  const { status, stage, pagesDone, pagesTotal } = lectura;
  const lista = status === "READY" || status === "COMPLETED";
  const revisando = stage === "CHECKING";
  const hechos: Record<PasoDeLectura["clave"], boolean> = {
    abrir: lista || (stage !== null && stage !== "OPENING"),
    leer: lista || revisando,
    revisar: lista,
  };
  const textos: Record<PasoDeLectura["clave"], string> = {
    abrir: "Abriendo el archivo",
    leer: "Leyendo las páginas y buscando los datos",
    revisar: "Revisando lo que encontramos",
  };
  const enCurso = pasoEnCurso(lista, stage);
  const contador = contadorDePaginas(pagesDone, pagesTotal);
  return (["abrir", "leer", "revisar"] as const).map((clave) => ({
    clave,
    texto: textos[clave],
    estado: estadoDePaso(hechos[clave], clave === enCurso),
    detalle: clave === "leer" && enCurso === "leer" ? contador : undefined,
  }));
}

/** Sin etapa todavía (en cola) nada está en curso, para no afirmar que ya se está leyendo. */
function pasoEnCurso(lista: boolean, stage: ContractImportResponse["stage"]): PasoDeLectura["clave"] | null {
  if (lista) return null;
  if (stage === "OPENING") return "abrir";
  if (stage === "READING_PAGES" || stage === "FINDING_DATA") return "leer";
  return stage === "CHECKING" ? "revisar" : null;
}

function contadorDePaginas(pagesDone: number | null, pagesTotal: number | null): string | undefined {
  if (pagesTotal === null || pagesTotal <= 0) return undefined;
  if (pagesDone !== null && pagesDone > 0) return `página ${Math.min(pagesDone, pagesTotal)} de ${pagesTotal}`;
  return `${pagesTotal} páginas`;
}

function estadoDePaso(listo: boolean, enCurso: boolean): PasoDeLectura["estado"] {
  if (listo) return "listo";
  return enCurso ? "ahora" : "despues";
}

// --- Qué se le pide al propietario --------------------------------------------------------------

export type ItemId =
  | "propiedad"
  | "tipo"
  | "inquilino"
  | "contacto"
  | "alquiler"
  | "vencimiento"
  | "plazo"
  | "actualizacion"
  | "deposito"
  | "comision"
  | "punitorios"
  | "garantias"
  | "otro";

/** El orden en que se muestran, agrupados como en la pantalla. */
export const ORDEN_DE_ITEMS: ItemId[] = [
  "propiedad", "tipo", "inquilino", "contacto",
  "alquiler", "vencimiento", "plazo", "actualizacion",
  "deposito", "comision", "punitorios", "garantias", "otro",
];

/** `ok` sale tal cual del contrato; `revisar` lo interpretó la lectura; `falta` no está; `noSePuede` la app no lo representa. */
export type EstadoDeItem = "ok" | "revisar" | "falta" | "noSePuede";

export interface Cita {
  pagina: number;
  texto: string;
  verificada: boolean;
}

/** Por qué una cláusula no se puede cargar tal cual, y por lo tanto qué se le ofrece. */
export type MotivoNoSePuede =
  | "variosInquilinos"
  | "alquilerEscalonado"
  | "indice"
  | "diaMayorA28"
  | "punitorios"
  | "monedaDelDeposito"
  | "otro";

export interface ItemLeido {
  id: ItemId;
  estado: EstadoDeItem;
  /** Las claves del catálogo del backend que alimentan este item. */
  claves: string[];
  citas: Cita[];
  /** Frases en español sobre por qué conviene mirarlo. */
  motivos: string[];
  /** Lo que escribió la lectura al interpretar. Texto de un archivo: se muestra como texto plano. */
  nota: string | null;
  /** Un item opcional que el contrato no menciona no se muestra hasta que el propietario lo suma. */
  presente: boolean;
  noSePuede: MotivoNoSePuede | null;
  /** Para `diaMayorA28`: el día que figura en el contrato, si se pudo leer. */
  diaDelContrato: number | null;
}

/** Hacia dónde se actualiza el alquiler, como lo elige el propietario. */
export type MetodoDeActualizacion = "FIXED_PERCENTAGE" | "FIXED_AMOUNT" | "ICL" | "IPC";

/** Todo lo que el propietario revisa, en texto como se escribe. Arranca con lo que leyó el backend. */
export interface Borrador {
  propiedadId: number | null;
  calle: string;
  numero: string;
  piso: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
  categoria: PropertyCategory | null;
  inquilinoId: number | null;
  nombre: string;
  apellido: string;
  cuit: string;
  correo: string;
  telefono: string;
  /** Sólo dígitos. */
  alquiler: string;
  moneda: Currency;
  /** Sólo dígitos. */
  dia: string;
  /** `aaaa-mm-dd`. */
  inicio: string;
  /** Sólo dígitos. */
  plazo: string;
  metodo: MetodoDeActualizacion | null;
  /** Porcentaje o monto, según el método. */
  valorDeActualizacion: string;
  /** Sólo dígitos. */
  frecuencia: string;
  otras: OtrasCondiciones;
}

/** Lo que el propietario eligió ante una cláusula que no se carga tal cual. */
export type Decision = "usar28" | "sinPunitorios" | "sinDeposito";
export type Decisiones = Partial<Record<ItemId, Decision>>;

export interface Lectura {
  importId: number;
  borrador: Borrador;
  items: Record<ItemId, ItemLeido>;
  /** Los valores tal como los leyó el backend, por clave del catálogo: sirven para saber qué cambió el propietario. */
  originales: Record<string, unknown>;
  coincidencias: { propiedadId: number | null; inquilinoId: number | null };
}

const MOTIVOS: Record<string, string> = {
  EVIDENCE_UNVERIFIED: "No pudimos comprobar la cita en el documento.",
  DUE_DAY_OUT_OF_RANGE: "El día no está entre el 1 y el 28.",
  "invalid tax ID": "El CUIT no parece válido.",
  "above 100%": "El porcentaje supera el 100 %.",
  "must be positive": "El número tiene que ser mayor que cero.",
  "must be nonnegative": "El número no puede ser negativo.",
  "inconsistent with start date and term": "La fecha de fin no coincide con el inicio y el plazo.",
  "required for index method": "Falta decir a qué índice se actualiza.",
  "required for fixed method": "Falta el valor de la actualización.",
};

const MOTIVO_DE_GARANTIAS = "Las garantías se leyeron del contrato: confirme que son las correctas. Se guardan con el contrato al crearlo.";

/** La nota fija que agrega el propio backend cuando no pudo verificar una cita, en inglés. */
const NOTA_DEL_BACKEND = "Evidence could not be verified";

type Campos = Record<string, ImportField>;

const valorDe = (campos: Campos, clave: string): unknown => {
  const valor = campos[clave]?.value;
  return valor === undefined ? null : valor;
};

/** Sólo un dato escalar tiene texto; un objeto no se convierte en «[object Object]». */
const textoPlano = (valor: unknown): string =>
  typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean" ? String(valor) : "";

const texto = (valor: unknown): string => textoPlano(valor).trim();
const digitos = (valor: unknown): string => {
  const n = typeof valor === "number" ? valor : Number(textoPlano(valor).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) && texto(valor) !== "" ? String(Math.round(n)) : "";
};
const numeroTexto = (valor: unknown): string => {
  const n = typeof valor === "number" ? valor : Number(valor);
  return valor !== null && valor !== "" && Number.isFinite(n) ? String(n) : "";
};

function citasDe(evidencia: ImportEvidence[] | undefined): Cita[] {
  return (evidencia ?? []).map((e) => ({ pagina: e.page, texto: e.quote, verificada: e.verified }));
}

/** Qué categoría sugiere la lectura: el contrato dice «vivienda» o «comercial», no «PH» ni «departamento». */
export function categoriaSugerida(uso: unknown, piso: string): PropertyCategory | null {
  if (uso === "COMMERCIAL") return "COMMERCIAL_PREMISES";
  if (uso === "DWELLING") return piso.trim() ? "APARTMENT" : "HOUSE";
  return null;
}

function garantiasDe(valor: unknown): GarantiaBorrador[] {
  if (!Array.isArray(valor)) return [];
  return valor.slice(0, MAX_GARANTIAS).flatMap((entrada): GarantiaBorrador[] => {
    if (typeof entrada !== "object" || entrada === null) return [];
    const dato = entrada as Record<string, unknown>;
    const tipo = dato.type === "PROPERTY" || dato.type === "SURETY_INSURANCE" ? dato.type : "PERSONAL";
    const garantia = garantiaVacia(tipo);
    // Una póliza no tiene «nombre»: el nombre que leyó la lectura es el de la aseguradora.
    if (tipo === "SURETY_INSURANCE") return [{ ...garantia, insurerName: texto(dato.fullName) }];
    return [{ ...garantia, fullName: texto(dato.fullName), taxId: texto(dato.taxId), address: texto(dato.address) }];
  });
}

function actualizacionDe(campos: Campos): Pick<Borrador, "metodo" | "valorDeActualizacion"> {
  const metodo = valorDe(campos, "increments.method");
  const indice = valorDe(campos, "increments.indexName");
  const valor = numeroTexto(valorDe(campos, "increments.value"));
  if (metodo === "FIXED_PERCENTAGE" || metodo === "FIXED_AMOUNT") return { metodo, valorDeActualizacion: valor };
  if (metodo === "INDEX" && (indice === "ICL" || indice === "IPC")) return { metodo: indice, valorDeActualizacion: "" };
  return { metodo: null, valorDeActualizacion: "" };
}

function otrasDe(campos: Campos): OtrasCondiciones {
  const metodo = valorDe(campos, "lateFee.method");
  const metodosDeRecargo = ["PERCENT_PER_DAY", "PERCENT_PER_MONTH", "PERCENT_PER_YEAR", "FIXED_PER_DAY", "FIXED_ONCE"];
  const pagador = valorDe(campos, "commission.payer");
  return {
    deposito: digitos(valorDe(campos, "deposit.amount")),
    comision: numeroTexto(valorDe(campos, "commission.percent")),
    quienPagaComision: pagador === "LANDLORD" || pagador === "TENANT" || pagador === "SHARED" ? pagador : null,
    punitorios: {
      method: typeof metodo === "string" && metodosDeRecargo.includes(metodo) ? (metodo as OtrasCondiciones["punitorios"]["method"]) : null,
      value: numeroTexto(valorDe(campos, "lateFee.value")),
      graceDays: digitos(valorDe(campos, "lateFee.graceDays")),
    },
    garantias: garantiasDe(valorDe(campos, "guarantors")),
  };
}

// --- Cláusulas que la app no puede cargar ---------------------------------------------------------

function clasificarNoSePuede(campo: string, motivo: string): { item: ItemId; motivo: MotivoNoSePuede } {
  if (motivo === "MULTIPLE_TENANTS" || campo.startsWith("tenant")) return { item: "inquilino", motivo: "variosInquilinos" };
  if (motivo === "DEPOSIT_CURRENCY_DIFFERS" || campo.startsWith("deposit")) return { item: "deposito", motivo: "monedaDelDeposito" };
  if (campo === "rent.dueDay") return { item: "vencimiento", motivo: "diaMayorA28" };
  if (campo.startsWith("rent")) return { item: "alquiler", motivo: "alquilerEscalonado" };
  if (campo.startsWith("increments")) return { item: "actualizacion", motivo: "indice" };
  if (campo.startsWith("lateFee")) return { item: "punitorios", motivo: "punitorios" };
  return { item: "otro", motivo: "otro" };
}

/** «El contrato dice 30»: el día sale del valor si vino, o de la cita si la lectura lo dejó sin valor. */
function diaDeLaCita(citas: Cita[]): number | null {
  for (const cita of citas) {
    const hallado = /\b(29|30|31)\b/.exec(cita.texto);
    if (hallado) return Number(hallado[1]);
  }
  return null;
}

// --- De la lectura al borrador --------------------------------------------------------------------

const CLAVES_DE: Record<ItemId, string[]> = {
  propiedad: ["property.street", "property.number", "property.floorUnit", "property.city", "property.province", "property.postalCode"],
  tipo: ["property.use"],
  inquilino: ["tenant.firstName", "tenant.lastName", "tenant.taxId"],
  contacto: ["tenant.email", "tenant.phone"],
  alquiler: ["rent.initialAmount", "rent.currency"],
  vencimiento: ["rent.dueDay"],
  plazo: ["dates.startDate", "dates.termMonths"],
  actualizacion: ["increments.method", "increments.indexName", "increments.value", "increments.frequencyMonths"],
  deposito: ["deposit.amount", "deposit.currency"],
  comision: ["commission.percent", "commission.payer"],
  punitorios: ["lateFee.method", "lateFee.value", "lateFee.graceDays"],
  garantias: ["guarantors"],
  otro: [],
};

/** Las claves cuya ausencia hace que el item «falte»: las demás del item son complementarias. */
const OBLIGATORIAS: Partial<Record<ItemId, string[]>> = {
  propiedad: ["property.street", "property.number", "property.city", "property.province"],
  inquilino: ["tenant.firstName", "tenant.lastName", "tenant.taxId"],
  contacto: ["tenant.email", "tenant.phone"],
  alquiler: ["rent.initialAmount", "rent.currency"],
  vencimiento: ["rent.dueDay"],
  plazo: ["dates.startDate", "dates.termMonths"],
  actualizacion: ["increments.method", "increments.frequencyMonths"],
};

/** La clave que dice si un item opcional está en el contrato. */
const CLAVE_DE_PRESENCIA: Partial<Record<ItemId, string>> = {
  deposito: "deposit.amount",
  comision: "commission.percent",
  punitorios: "lateFee.method",
  garantias: "guarantors",
};

function hayValor(valor: unknown): boolean {
  if (valor === null || valor === undefined || valor === "") return false;
  return !Array.isArray(valor) || valor.length > 0;
}

function motivosDe(campos: Campos, claves: string[]): string[] {
  const frases = claves.flatMap((clave) => campos[clave]?.validation ?? []).map((codigo) => MOTIVOS[codigo] ?? "Conviene revisarlo.");
  return [...new Set(frases)];
}

function estadoDe(id: ItemId, campos: Campos, claves: string[]): EstadoDeItem {
  const obligatorias = OBLIGATORIAS[id] ?? [];
  const delItem = claves.map((clave) => campos[clave]).filter((campo): campo is ImportField => campo !== undefined);
  if (delItem.some((campo) => campo.status === "UNSUPPORTED")) return "noSePuede";
  if (obligatorias.some((clave) => !hayValor(campos[clave]?.value))) return "falta";
  const sinConfirmar = delItem.some(
    (campo) =>
      hayValor(campo.value) &&
      (campo.status === "INFERRED" || (campo.validation ?? []).length > 0 || (campo.evidence ?? []).some((e) => !e.verified))
  );
  return sinConfirmar ? "revisar" : "ok";
}

type SinSoporte = { motivo: MotivoNoSePuede; citas: Cita[] };

function borradorDe(importacion: ContractImportResponse, campos: Campos): Borrador {
  const piso = texto(valorDe(campos, "property.floorUnit"));
  return {
    propiedadId: importacion.matches?.property?.id ?? null,
    calle: texto(valorDe(campos, "property.street")),
    numero: texto(valorDe(campos, "property.number")),
    piso,
    ciudad: texto(valorDe(campos, "property.city")),
    provincia: texto(valorDe(campos, "property.province")),
    codigoPostal: texto(valorDe(campos, "property.postalCode")),
    categoria: categoriaSugerida(valorDe(campos, "property.use"), piso),
    inquilinoId: importacion.matches?.tenant?.id ?? null,
    nombre: texto(valorDe(campos, "tenant.firstName")),
    apellido: texto(valorDe(campos, "tenant.lastName")),
    cuit: soloDigitos(texto(valorDe(campos, "tenant.taxId"))),
    correo: texto(valorDe(campos, "tenant.email")),
    telefono: texto(valorDe(campos, "tenant.phone")),
    alquiler: digitos(valorDe(campos, "rent.initialAmount")),
    moneda: valorDe(campos, "rent.currency") === "USD" ? "USD" : "ARS",
    dia: digitos(valorDe(campos, "rent.dueDay")),
    inicio: texto(valorDe(campos, "dates.startDate")),
    plazo: digitos(valorDe(campos, "dates.termMonths")),
    ...actualizacionDe(campos),
    frecuencia: digitos(valorDe(campos, "increments.frequencyMonths")),
    otras: otrasDe(campos),
  };
}

/**
 * Lo que la app no puede guardar tal cual se saca del borrador y queda marcado:
 * un día de vencimiento mayor a 28 y un depósito en otra moneda que el alquiler.
 */
function apartarLoQueNoSePuedeGuardar(campos: Campos, borrador: Borrador): { diaFueraDeRango: number | null; depositoEnOtraMoneda: boolean } {
  const diaLeido = Number(borrador.dia);
  const diaFueraDeRango = borrador.dia !== "" && (diaLeido < 1 || diaLeido > 28) ? diaLeido : null;
  if (diaFueraDeRango !== null) borrador.dia = "";

  const monedaDelDeposito = valorDe(campos, "deposit.currency");
  const depositoEnOtraMoneda =
    (monedaDelDeposito === "ARS" || monedaDelDeposito === "USD") &&
    hayValor(valorDe(campos, "deposit.amount")) &&
    monedaDelDeposito !== borrador.moneda;
  if (depositoEnOtraMoneda) borrador.otras = { ...borrador.otras, deposito: "" };

  return { diaFueraDeRango, depositoEnOtraMoneda };
}

function sumarSinSoporte(noSePuede: Map<ItemId, SinSoporte>, item: ItemId, motivo: MotivoNoSePuede, citas: Cita[]) {
  const previo = noSePuede.get(item);
  // Varios campos de una misma cláusula citan el mismo pasaje: se muestra una vez.
  const todas = [...(previo?.citas ?? []), ...citas];
  const unicas = todas.filter((cita, i) => todas.findIndex((otra) => otra.pagina === cita.pagina && otra.texto === cita.texto) === i);
  noSePuede.set(item, { motivo: previo?.motivo ?? motivo, citas: unicas });
}

/** Las cláusulas sin soporte, por item: las del campo (`status: UNSUPPORTED`), las de la lista aparte y las que apartó el borrador. */
function sinSoporteDe(
  campos: Campos,
  lista: ContractImportResponse["unsupported"],
  apartado: ReturnType<typeof apartarLoQueNoSePuedeGuardar>
): Map<ItemId, SinSoporte> {
  const noSePuede = new Map<ItemId, SinSoporte>();
  for (const entrada of Array.isArray(lista) ? lista : []) {
    const { item, motivo } = clasificarNoSePuede(entrada.field, entrada.reason);
    sumarSinSoporte(noSePuede, item, motivo, citasDe(entrada.evidence));
  }
  for (const [clave, campo] of Object.entries(campos)) {
    if (campo.status !== "UNSUPPORTED") continue;
    const { item, motivo } = clasificarNoSePuede(clave, "");
    if (item !== "otro") sumarSinSoporte(noSePuede, item, motivo, citasDe(campo.evidence));
  }
  if (apartado.diaFueraDeRango !== null) sumarSinSoporte(noSePuede, "vencimiento", "diaMayorA28", citasDe(campos["rent.dueDay"]?.evidence));
  if (apartado.depositoEnOtraMoneda) sumarSinSoporte(noSePuede, "deposito", "monedaDelDeposito", citasDe(campos["deposit.amount"]?.evidence));
  return noSePuede;
}

function estadoYPresenciaDe(
  id: ItemId,
  campos: Campos,
  claves: string[],
  borrador: Borrador,
  sinSoporte: SinSoporte | null
): { estado: EstadoDeItem; presente: boolean } {
  if (id === "tipo") {
    // El contrato dice «vivienda» o «comercial», no el tipo de propiedad que usa la app: siempre se mira.
    return { estado: borrador.categoria === null ? "falta" : "revisar", presente: borrador.propiedadId === null };
  }
  const estado: EstadoDeItem = sinSoporte ? "noSePuede" : estadoDe(id, campos, claves);
  if (id === "otro") return { estado, presente: sinSoporte !== null };
  const claveDePresencia = CLAVE_DE_PRESENCIA[id];
  const presente = claveDePresencia === undefined || hayValor(campos[claveDePresencia]?.value) || sinSoporte !== null;
  return { estado, presente };
}

function itemLeidoDe(
  id: ItemId,
  { campos, borrador, sinSoporte, diaDelContratoLeido }: Readonly<{
    campos: Campos;
    borrador: Borrador;
    sinSoporte: SinSoporte | null;
    diaDelContratoLeido: number | null;
  }>
): ItemLeido {
  const claves = CLAVES_DE[id];
  const base = estadoYPresenciaDe(id, campos, claves, borrador, sinSoporte);
  const { presente } = base;
  // Las garantías leídas son datos de revisión, no garantías definitivas: se confirman antes de crear
  // el contrato, y recién se guardan con él (`guarantees`), no por cerrar la lectura.
  const garantiasLeidas = id === "garantias" && presente && sinSoporte === null;
  const estado: EstadoDeItem = garantiasLeidas && base.estado === "ok" ? "revisar" : base.estado;
  const citas = sinSoporte ? sinSoporte.citas : claves.flatMap((clave) => citasDe(campos[clave]?.evidence)).slice(0, 3);
  const nota = claves.map((clave) => campos[clave]?.note).find((n): n is string => !!n && n !== NOTA_DEL_BACKEND);
  const motivos = estado === "revisar" ? motivosDe(campos, claves) : [];
  if (estado === "revisar" && garantiasLeidas) motivos.push(MOTIVO_DE_GARANTIAS);
  return {
    id,
    estado,
    claves,
    citas,
    motivos,
    nota: nota ?? null,
    presente,
    noSePuede: sinSoporte?.motivo ?? null,
    diaDelContrato: id === "vencimiento" && sinSoporte ? diaDelContratoLeido ?? diaDeLaCita(sinSoporte.citas) : null,
  };
}

export function leerResultado(importacion: ContractImportResponse): Lectura {
  const campos: Campos = importacion.fields ?? {};
  const borrador = borradorDe(importacion, campos);
  const apartado = apartarLoQueNoSePuedeGuardar(campos, borrador);
  const noSePuede = sinSoporteDe(campos, importacion.unsupported, apartado);

  const items = {} as Record<ItemId, ItemLeido>;
  for (const id of ORDEN_DE_ITEMS) {
    items[id] = itemLeidoDe(id, { campos, borrador, sinSoporte: noSePuede.get(id) ?? null, diaDelContratoLeido: apartado.diaFueraDeRango });
  }

  const originales: Record<string, unknown> = {};
  for (const [clave, campo] of Object.entries(campos)) originales[clave] = campo.value ?? null;

  return {
    importId: importacion.id,
    borrador,
    items,
    originales,
    coincidencias: { propiedadId: importacion.matches?.property?.id ?? null, inquilinoId: importacion.matches?.tenant?.id ?? null },
  };
}

// --- Qué falta resolver ---------------------------------------------------------------------------

/** El item tiene datos completos y válidos para crear el contrato (independiente de lo que dijo la lectura). */
export function datosCompletos(id: ItemId, b: Borrador): boolean {
  switch (id) {
    case "propiedad":
      return b.propiedadId !== null || [b.calle, b.numero, b.ciudad, b.provincia].every((v) => v.trim() !== "");
    case "tipo":
      return b.propiedadId !== null || b.categoria !== null;
    case "inquilino":
      return b.inquilinoId !== null || (b.nombre.trim() !== "" && b.apellido.trim() !== "" && cuitValido(b.cuit));
    case "contacto":
      return b.inquilinoId !== null || (correoValido(b.correo) && telefonoValido(b.telefono));
    case "alquiler":
      return Number(b.alquiler) > 0;
    case "vencimiento":
      return Number(b.dia) >= 1 && Number(b.dia) <= 28;
    case "plazo":
      return /^\d{4}-\d{2}-\d{2}$/.test(b.inicio) && Number(b.plazo) >= 1;
    case "actualizacion": {
      if (b.metodo === null || Number(b.frecuencia) < 1) return false;
      const conValor = b.metodo === "FIXED_PERCENTAGE" || b.metodo === "FIXED_AMOUNT";
      return !conValor || numeroDecimal(b.valorDeActualizacion) > 0;
    }
    case "deposito":
      return true;
    case "comision":
      return validarOtrasCondiciones(b.otras).comision === undefined;
    case "punitorios":
      return validarOtrasCondiciones(b.otras).punitorios === undefined;
    case "garantias":
      return !hayErrores(validarGarantias(b.otras.garantias));
    case "otro":
      return false;
  }
}

export interface Pendiente {
  id: ItemId;
  /** Por qué sigue pendiente. */
  razon: "revisar" | "falta" | "noSePuede";
  /** No se resuelve en esta pantalla: sólo cargándolo a mano. */
  bloqueante: boolean;
}

const BLOQUEANTES: ReadonlySet<MotivoNoSePuede> = new Set(["alquilerEscalonado", "indice", "otro"]);

function pendienteSinSoporte(id: ItemId, motivo: MotivoNoSePuede, b: Borrador, decisiones: Decisiones): Pendiente[] {
  if (BLOQUEANTES.has(motivo)) return [{ id, razon: "noSePuede", bloqueante: true }];
  const resuelto = motivo === "variosInquilinos" ? datosCompletos("inquilino", b) : decisiones[id] !== undefined;
  return resuelto ? [] : [{ id, razon: "noSePuede", bloqueante: false }];
}

/**
 * Los items que todavía impiden crear el contrato. Un item opcional que el contrato no trae y el
 * propietario no sumó no cuenta. `revisados`: los que el propietario confirmó o corrigió.
 */
export function pendientes(lectura: Lectura, b: Borrador, decisiones: Decisiones, revisados: ReadonlySet<ItemId>, sumados: ReadonlySet<ItemId>): Pendiente[] {
  return ORDEN_DE_ITEMS.flatMap((id): Pendiente[] => {
    const item = lectura.items[id];
    const opcional = CLAVE_DE_PRESENCIA[id] !== undefined;
    if (id === "tipo" && b.propiedadId !== null) return [];
    if (opcional && !item.presente && !sumados.has(id)) return [];
    if (id === "otro" && !item.presente) return [];
    if (item.estado === "noSePuede") return pendienteSinSoporte(id, item.noSePuede!, b, decisiones);
    if (!datosCompletos(id, b)) return [{ id, razon: "falta", bloqueante: false }];
    return item.estado === "revisar" && !revisados.has(id) ? [{ id, razon: "revisar", bloqueante: false }] : [];
  });
}

// --- Armar lo que se manda ------------------------------------------------------------------------

/** Aplica lo que el propietario eligió ante una cláusula sin soporte: ese dato no viaja. */
function conDecisiones(b: Borrador, decisiones: Decisiones): Borrador {
  let otras = b.otras;
  if (decisiones.punitorios === "sinPunitorios") otras = { ...otras, punitorios: SIN_OTRAS_CONDICIONES.punitorios };
  if (decisiones.deposito === "sinDeposito") otras = { ...otras, deposito: "" };
  return otras === b.otras ? b : { ...b, otras };
}

function armarPropiedad(b: Borrador): PropertyRequest {
  return {
    street: b.calle.trim(),
    number: b.numero.trim(),
    floorUnit: b.piso.trim() || undefined,
    city: b.ciudad.trim(),
    province: b.provincia.trim(),
    postalCode: b.codigoPostal.trim() || undefined,
    // La importación por PDF no trae coordenadas ni tiene mapa todavía: cae al
    // centro del país (la ubicación "desconocida" canónica, igual que el backfill
    // del backend), para corregirla después editando la propiedad. ALQ-92.
    latitude: CENTRO_DE_ARGENTINA.latitude,
    longitude: CENTRO_DE_ARGENTINA.longitude,
    category: b.categoria!,
  };
}

function armarInquilino(b: Borrador): TenantRequest {
  return {
    firstName: b.nombre.trim(),
    lastName: b.apellido.trim(),
    taxId: soloDigitos(b.cuit),
    email: b.correo.trim(),
    phoneNumber: soloDigitosTelefono(b.telefono),
  };
}

function datosDeActualizacion(b: Borrador): Pick<ContractTerms, "incrementMethod" | "incrementValue" | "incrementIndexName"> {
  if (b.metodo === "FIXED_PERCENTAGE" || b.metodo === "FIXED_AMOUNT") {
    return { incrementMethod: b.metodo, incrementValue: numeroDecimal(b.valorDeActualizacion) };
  }
  return { incrementMethod: "INDEX", incrementIndexName: b.metodo ?? undefined };
}

/** El pedido de `POST /contracts/onboarding` con lo ya revisado. */
export function armarAlta(borrador: Borrador, decisiones: Decisiones, elapsed: ElapsedDecision | undefined): ContractOnboardingRequest {
  const b = conDecisiones(borrador, decisiones);
  return {
    property: b.propiedadId !== null ? { id: b.propiedadId } : { new: armarPropiedad(b) },
    tenant: b.inquilinoId !== null ? { id: b.inquilinoId } : { new: armarInquilino(b) },
    contract: {
      initialRentAmount: Number(b.alquiler),
      currency: b.moneda,
      startDate: b.inicio,
      termMonths: Number(b.plazo),
      dueDay: Number(b.dia),
      incrementFrequencyMonths: Number(b.frecuencia),
      ...datosDeActualizacion(b),
      ...armarOtrasCondiciones(b.otras),
    },
    elapsed,
  };
}

/** Los valores finales, por la misma clave del catálogo con la que llegaron. */
export function valoresFinales(borrador: Borrador, decisiones: Decisiones): Record<string, unknown> {
  const b = conDecisiones(borrador, decisiones);
  const otras = armarOtrasCondiciones(b.otras);
  const valores: Record<string, unknown> = {
    "rent.initialAmount": Number(b.alquiler),
    "rent.currency": b.moneda,
    "rent.dueDay": Number(b.dia),
    "dates.startDate": b.inicio,
    "dates.termMonths": Number(b.plazo),
    "increments.frequencyMonths": Number(b.frecuencia),
  };
  if (b.metodo === "FIXED_PERCENTAGE" || b.metodo === "FIXED_AMOUNT") {
    valores["increments.method"] = b.metodo;
    valores["increments.value"] = numeroDecimal(b.valorDeActualizacion);
  } else if (b.metodo !== null) {
    valores["increments.method"] = "INDEX";
    valores["increments.indexName"] = b.metodo;
  }
  if (b.propiedadId === null) {
    Object.assign(valores, {
      "property.street": b.calle.trim(),
      "property.number": b.numero.trim(),
      "property.floorUnit": b.piso.trim() || null,
      "property.city": b.ciudad.trim(),
      "property.province": b.provincia.trim(),
      "property.postalCode": b.codigoPostal.trim() || null,
      "property.category": b.categoria,
    });
  }
  if (b.inquilinoId === null) {
    Object.assign(valores, {
      "tenant.firstName": b.nombre.trim(),
      "tenant.lastName": b.apellido.trim(),
      "tenant.taxId": soloDigitos(b.cuit),
      "tenant.email": b.correo.trim(),
      "tenant.phone": soloDigitosTelefono(b.telefono),
    });
  }
  if (otras.depositAmount !== undefined) valores["deposit.amount"] = otras.depositAmount;
  if (otras.commissionPercent !== undefined) valores["commission.percent"] = otras.commissionPercent;
  if (otras.commissionPayer !== undefined) valores["commission.payer"] = otras.commissionPayer;
  if (otras.lateFeeMethod !== undefined) {
    valores["lateFee.method"] = otras.lateFeeMethod;
    valores["lateFee.value"] = otras.lateFeeValue;
    if (otras.lateFeeGraceDays !== undefined) valores["lateFee.graceDays"] = otras.lateFeeGraceDays;
  }
  if (b.otras.garantias.length > 0) valores.guarantors = armarGarantias(b.otras.garantias);
  return valores;
}

/** A qué item pertenece cada clave que se manda: para decir «confirmó» sólo de lo que el propietario confirmó. */
function itemDeClave(clave: string): ItemId | null {
  if (clave === "property.category") return "tipo";
  return ORDEN_DE_ITEMS.find((id) => CLAVES_DE[id].includes(clave)) ?? null;
}

function normalizado(clave: string, valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (Array.isArray(valor)) return JSON.stringify(valor);
  if (clave === "tenant.taxId" || clave === "tenant.phone") return textoPlano(valor).replace(/\D/g, "");
  if (typeof valor === "number") return String(valor);
  const comoNumero = Number(valor);
  if (typeof valor === "string" && valor.trim() !== "" && Number.isFinite(comoNumero)) return String(comoNumero);
  return textoPlano(valor).trim();
}

/**
 * Qué hizo el propietario con cada dato que se manda:
 * `FILLED` si la lectura no lo trajo, `CORRECTED` si lo cambió, `CONFIRMED` si lo marcó como bueno
 * estando en revisión, y `UNTOUCHED` si lo dejó como estaba.
 */
export function accionesDeCampos(lectura: Lectura, finales: Record<string, unknown>, revisados: ReadonlySet<ItemId>): Record<string, ImportFieldAction> {
  const acciones: Record<string, ImportFieldAction> = {};
  for (const [clave, final] of Object.entries(finales)) {
    if (final === null || final === undefined || final === "") continue;
    const original = lectura.originales[clave];
    if (!hayValor(original)) {
      acciones[clave] = "FILLED";
    } else if (normalizado(clave, original) !== normalizado(clave, final)) {
      acciones[clave] = "CORRECTED";
    } else {
      const item = itemDeClave(clave);
      acciones[clave] = item !== null && lectura.items[item].estado !== "ok" && revisados.has(item) ? "CONFIRMED" : "UNTOUCHED";
    }
  }
  return acciones;
}

/** El cierre de la lectura una vez creado el contrato. */
export function armarCierre(lectura: Lectura, borrador: Borrador, decisiones: Decisiones, revisados: ReadonlySet<ItemId>, contractId: number): ContractImportCompletionRequest {
  const finales = valoresFinales(borrador, decisiones);
  const sinNulos = Object.fromEntries(Object.entries(finales).filter(([, valor]) => valor !== null && valor !== undefined && valor !== ""));
  return { contractId, finalValues: sinNulos, fieldActions: accionesDeCampos(lectura, sinNulos, revisados) };
}

// --- A qué item pertenece un error del servidor -----------------------------------------------------

const ITEM_DE_CAMPO_DE_CONTRATO: Record<string, ItemId> = {
  initialRentAmount: "alquiler",
  currency: "alquiler",
  dueDay: "vencimiento",
  startDate: "plazo",
  termMonths: "plazo",
  incrementMethod: "actualizacion",
  incrementValue: "actualizacion",
  incrementIndexName: "actualizacion",
  incrementFrequencyMonths: "actualizacion",
  depositAmount: "deposito",
  commissionPercent: "comision",
  commissionPayer: "comision",
  lateFeeMethod: "punitorios",
  lateFeeValue: "punitorios",
  lateFeeGraceDays: "punitorios",
  guarantees: "garantias",
};

/** Los items con error del servidor, para marcarlos en la revisión. Una ruta desconocida no marca nada. */
export function itemsConErrorDelServidor(fieldErrors: Record<string, string> | null | undefined): ItemId[] {
  const marcados = new Set<ItemId>();
  for (const ruta of Object.keys(fieldErrors ?? {})) {
    const [seccion, ...resto] = ruta.split(".");
    const camino = resto[0] === "new" ? resto.slice(1) : resto;
    const campo = (camino[0] ?? "").replace(/\[\d+\]$/, "");
    if (seccion === "property") marcados.add(campo === "category" ? "tipo" : "propiedad");
    else if (seccion === "tenant") marcados.add(campo === "email" || campo === "phoneNumber" ? "contacto" : "inquilino");
    else if (seccion === "contract" && ITEM_DE_CAMPO_DE_CONTRATO[campo]) marcados.add(ITEM_DE_CAMPO_DE_CONTRATO[campo]);
  }
  return ORDEN_DE_ITEMS.filter((id) => marcados.has(id));
}
