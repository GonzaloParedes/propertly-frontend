import type { CommissionPayer, ContractDraftSummary, GuaranteeType, LateFeeMethod, PropertyCategory, PropertyRequest, TenantRequest } from "@/lib/backend-types";
import { formatearCuit } from "@/lib/cuit";
import { formatearFecha, hoyEnArgentina } from "@/lib/formato";
import { hace } from "@/lib/inicio";
import { MAX_GARANTIAS, garantiaVacia, type GarantiaBorrador } from "@/lib/garantias";
import { SIN_OTRAS_CONDICIONES, type OtrasCondiciones } from "@/lib/otras-condiciones";
import { CATEGORIAS } from "@/lib/propiedad";
import type { RespuestaPagadoHasta } from "@/lib/transcurridos";

/**
 * El contrato a medio cargar, tal como se guarda en el backend. El backend no lo lee: es un objeto
 * JSON que escribe y entiende este módulo, y por eso lleva `schemaVersion`. Cada cambio del
 * asistente que altere esta forma tiene que subir la versión, o un borrador viejo se abriría roto.
 */
export const VERSION_DEL_PAYLOAD = 2;

/** La versión anterior, que sigue pudiéndose leer: no guardaba el desvío ni lo que se escribía en él sin confirmar. */
const VERSION_ANTERIOR = 1;

/** Cuántos borradores admite el backend por propietario. Un 409 con el límite real lo confirma. */
export const LIMITE_DE_BORRADORES = 3;

/** Desde cuántos días antes del vencimiento el aviso del borrador lo dice. */
export const DIAS_DE_AVISO_DE_VENCIMIENTO = 15;

/** Lo mismo que acepta el backend en la etiqueta de un borrador. */
const LARGO_MAXIMO_DE_ETIQUETA = 160;

export const SIN_ETIQUETA = "Contrato sin propiedad ni inquilino";

export type MetodoDeActualizacion = "FIXED_PERCENTAGE" | "ICL" | "IPC";

/** Un registro nuevo que sólo existe como pedido hasta «Crear contrato», con cómo se lo nombra. */
export type NuevoEnBorrador<T> = { pedido: T; etiqueta: string };

/** Lo elegido en el paso de propiedad o de inquilino: uno que ya existe, o el nuevo que se está armando. */
export type ElegidoEnBorrador<T> = { id: number | null; nuevo: boolean; borrador: NuevoEnBorrador<T> | null };

// El código postal es opcional y se puede cargar a mano; las coordenadas sólo
// vienen del buscador y viajan juntas o no viajan.
export type Direccion = {
  street: string; number: string; city: string; province: string;
  postalCode: string; latitude: number | null; longitude: number | null;
};

/** En qué desvío estaba el propietario (cargar una propiedad o un inquilino nuevos) y en cuál de sus pasos. */
export type DesvioDelBorrador = { tipo: "property" | "tenant"; paso: number };

/** Cuántos pasos tiene cada desvío: el de propiedad son cuatro, el de inquilino uno. */
export const PASOS_DEL_DESVIO: Record<DesvioDelBorrador["tipo"], number> = { property: 4, tenant: 1 };

/** Lo escrito en la carga de una propiedad nueva, esté confirmada o no. */
export type FormularioDePropiedad = {
  direccion: Direccion | null; unidad: string; categoria: PropertyCategory | null;
  bedrooms: number | null; bathrooms: number | null; superficie: string; mascotas: boolean; amoblada: boolean;
};

/** Lo escrito en la carga de un inquilino nuevo, esté confirmado o no. */
export type FormularioDeInquilino = { nombre: string; apellido: string; cuit: string; correo: string; telefono: string };

/** Lo que el asistente de «Nuevo contrato» va juntando, y lo único que hace falta para retomarlo. */
export type EstadoDelBorrador = {
  /** El paso del contrato en el que quedó el propietario. */
  paso: number;
  /** Si estaba cargando una propiedad o un inquilino nuevos, cuál y en qué paso; null si estaba en el contrato. */
  desvio: DesvioDelBorrador | null;
  formularioPropiedad: FormularioDePropiedad;
  formularioInquilino: FormularioDeInquilino;
  propiedad: ElegidoEnBorrador<PropertyRequest>;
  inquilino: ElegidoEnBorrador<TenantRequest>;
  /** Sólo dígitos, como se escribe. */
  alquiler: string;
  diaVencimiento: number;
  plazo: number;
  /** yyyy-MM-dd, o vacío si todavía no lo cargó. */
  inicio: string;
  metodo: MetodoDeActualizacion;
  porcentaje: string;
  frecuencia: number;
  otras: OtrasCondiciones;
  /** «¿Hasta qué mes le pagaron?», como la contestó. Si ya no corresponde, el asistente la ignora. */
  pagadoHasta: RespuestaPagadoHasta;
};

export type ContenidoDeBorrador = { label: string; payload: Record<string, unknown> };

/** Cómo se lista un borrador: «Lavalle 950 · Pérez», o lo que se sepa de los dos. */
export function etiquetaDeBorrador(propiedad: string | null, inquilino: string | null): string {
  const partes = [propiedad?.trim(), inquilino?.trim()].filter((parte): parte is string => !!parte);
  const etiqueta = partes.length > 0 ? partes.join(" · ") : SIN_ETIQUETA;
  return etiqueta.length > LARGO_MAXIMO_DE_ETIQUETA ? `${etiqueta.slice(0, LARGO_MAXIMO_DE_ETIQUETA - 1)}…` : etiqueta;
}

/** Calle, número, ciudad y provincia: lo mínimo para que la propiedad nueva sea una dirección y no un intento. */
export function ubicacionCompleta(direccion: Direccion | null): direccion is Direccion {
  return direccion !== null && [direccion.street, direccion.number, direccion.city, direccion.province].every((campo) => campo.trim() !== "");
}

/** «Lavalle 950» (con la unidad, si la hay): cómo se nombra una propiedad nueva por su dirección. */
export function etiquetaDePropiedad(direccion: Direccion, unidad: string): string {
  const sufijo = unidad.trim() ? `, ${unidad.trim()}` : "";
  return `${direccion.street.trim()} ${direccion.number.trim()}${sufijo}`;
}

/** Cómo se nombra la propiedad nueva que se está cargando sin confirmar, o null si su ubicación todavía no está completa. */
export function etiquetaDePropiedadEnCarga(formulario: FormularioDePropiedad): string | null {
  return ubicacionCompleta(formulario.direccion) ? etiquetaDePropiedad(formulario.direccion, formulario.unidad) : null;
}

/**
 * Con qué se rotula el borrador en cuanto a la propiedad. Lo elegido o confirmado manda (`elegida`: null si
 * no hay nada elegido, undefined si todavía no se sabe porque las listas no llegaron); si no hay nada,
 * la propiedad que se está cargando sin confirmar, una vez que su ubicación está completa.
 */
export function nombreDePropiedadDelBorrador(elegida: string | null | undefined, formulario: FormularioDePropiedad): string | null | undefined {
  return elegida === null ? etiquetaDePropiedadEnCarga(formulario) : elegida;
}

/** Los campos de la carga de una propiedad nueva, rearmados desde el pedido que quedó confirmado (o vacíos). */
export function formularioDePropiedad(pedido: PropertyRequest | undefined): FormularioDePropiedad {
  const direccion: Direccion | null = pedido
    ? { street: pedido.street, number: pedido.number, city: pedido.city, province: pedido.province, postalCode: pedido.postalCode ?? "", latitude: pedido.latitude ?? null, longitude: pedido.longitude ?? null }
    : null;
  return {
    direccion,
    unidad: pedido?.floorUnit ?? "",
    categoria: pedido?.category ?? null,
    bedrooms: pedido?.bedrooms ?? null,
    bathrooms: pedido?.bathrooms ?? null,
    superficie: pedido?.coveredArea === undefined ? "" : String(pedido.coveredArea),
    mascotas: pedido?.petsAllowed ?? false,
    amoblada: pedido?.furnished ?? false,
  };
}

/** Los campos de la carga de un inquilino nuevo, rearmados desde el pedido que quedó confirmado (o vacíos). */
export function formularioDeInquilino(pedido: TenantRequest | undefined): FormularioDeInquilino {
  return {
    nombre: pedido?.firstName ?? "",
    apellido: pedido?.lastName ?? "",
    cuit: pedido ? formatearCuit(pedido.taxId) : "",
    correo: pedido?.email ?? "",
    telefono: pedido?.phoneNumber ?? "",
  };
}

function sinIdDeGarantia(garantia: GarantiaBorrador): Record<string, string> {
  return Object.fromEntries(Object.entries(garantia).filter(([clave]) => clave !== "id"));
}

/** El objeto que se manda al backend. Las garantías van sin `id`: es de la pantalla, no del contrato. */
export function serializar(estado: EstadoDelBorrador): Record<string, unknown> {
  return {
    schemaVersion: VERSION_DEL_PAYLOAD,
    ...estado,
    otras: { ...estado.otras, garantias: estado.otras.garantias.map(sinIdDeGarantia) },
  };
}

export function armarContenido(estado: EstadoDelBorrador, propiedad: string | null, inquilino: string | null): ContenidoDeBorrador {
  return { label: etiquetaDeBorrador(propiedad, inquilino), payload: serializar(estado) };
}

type Objeto = Record<string, unknown>;

const esObjeto = (valor: unknown): valor is Objeto => typeof valor === "object" && valor !== null && !Array.isArray(valor);
const esTexto = (valor: unknown): valor is string => typeof valor === "string";
const esEntero = (valor: unknown): valor is number => typeof valor === "number" && Number.isInteger(valor);

const METODOS: readonly MetodoDeActualizacion[] = ["FIXED_PERCENTAGE", "ICL", "IPC"];
const QUIEN_PAGA: readonly CommissionPayer[] = ["LANDLORD", "TENANT", "SHARED"];
const METODOS_DE_PUNITORIOS: readonly LateFeeMethod[] = ["PERCENT_PER_DAY", "PERCENT_PER_MONTH", "PERCENT_PER_YEAR", "FIXED_PER_DAY", "FIXED_ONCE"];
const TIPOS_DE_GARANTIA: readonly GuaranteeType[] = ["PERSONAL", "PROPERTY", "SURETY_INSURANCE"];

function elegir<T extends string>(valor: unknown, opciones: readonly T[]): T | null {
  return opciones.find((opcion) => opcion === valor) ?? null;
}

function sanearGarantia(valor: unknown): GarantiaBorrador | null {
  if (!esObjeto(valor)) return null;
  const tipo = elegir(valor.type, TIPOS_DE_GARANTIA);
  if (tipo === null) return null;
  // La fila nueva trae un `id` propio: el guardado no lo conserva, y reusar uno viejo podría chocar.
  const garantia = garantiaVacia(tipo);
  for (const campo of Object.keys(garantia)) {
    if (campo !== "id" && campo !== "type" && esTexto(valor[campo])) (garantia as Record<string, unknown>)[campo] = valor[campo];
  }
  return garantia;
}

function sanearOtras(valor: unknown): OtrasCondiciones | null {
  if (!esObjeto(valor) || !esObjeto(valor.punitorios) || !Array.isArray(valor.garantias)) return null;
  const { deposito, comision } = valor;
  const { value, graceDays } = valor.punitorios;
  if (!esTexto(deposito) || !esTexto(comision) || !esTexto(value) || !esTexto(graceDays)) return null;
  return {
    ...SIN_OTRAS_CONDICIONES,
    deposito,
    comision,
    quienPagaComision: elegir(valor.quienPagaComision, QUIEN_PAGA),
    punitorios: { method: elegir(valor.punitorios.method, METODOS_DE_PUNITORIOS), value, graceDays },
    garantias: valor.garantias.map(sanearGarantia).filter((garantia): garantia is GarantiaBorrador => garantia !== null).slice(0, MAX_GARANTIAS),
  };
}

/** El id de lo elegido: un número, o null si no había; undefined si no es ninguna de las dos cosas. */
function idGuardado(valor: unknown): number | null | undefined {
  if (valor === null) return null;
  return esEntero(valor) ? valor : undefined;
}

function sanearElegido<T>(valor: unknown, esPedido: (pedido: Objeto) => boolean): ElegidoEnBorrador<T> | null {
  if (!esObjeto(valor) || typeof valor.nuevo !== "boolean") return null;
  const id = idGuardado(valor.id);
  if (id === undefined) return null;
  let borrador: NuevoEnBorrador<T> | null = null;
  if (valor.borrador !== null) {
    const candidato = valor.borrador;
    if (!esObjeto(candidato) || !esTexto(candidato.etiqueta) || !esObjeto(candidato.pedido) || !esPedido(candidato.pedido)) return null;
    borrador = { pedido: candidato.pedido as T, etiqueta: candidato.etiqueta };
  }
  return { id, nuevo: valor.nuevo && borrador !== null, borrador };
}

const esPropiedad = (pedido: Objeto) =>
  [pedido.street, pedido.number, pedido.city, pedido.province].every(esTexto) && CATEGORIAS.some(({ valor }) => valor === pedido.category);

const esInquilino = (pedido: Objeto) =>
  [pedido.firstName, pedido.lastName, pedido.taxId, pedido.email, pedido.phoneNumber].every(esTexto);

const textoONada = (valor: unknown): string => (esTexto(valor) ? valor : "");
const enteroONada = (valor: unknown): number | null => (esEntero(valor) && valor >= 0 ? valor : null);

function sanearDireccion(valor: unknown): Direccion | null {
  if (!esObjeto(valor)) return null;
  const { street, number, city, province } = valor;
  if (![street, number, city, province].every(esTexto)) return null;
  // Las coordenadas viajan juntas o no viajan.
  const conCoordenadas = typeof valor.latitude === "number" && typeof valor.longitude === "number";
  return {
    street: street as string, number: number as string, city: city as string, province: province as string,
    postalCode: textoONada(valor.postalCode),
    latitude: conCoordenadas ? (valor.latitude as number) : null,
    longitude: conCoordenadas ? (valor.longitude as number) : null,
  };
}

/** Cada campo que no se entiende vuelve a su valor vacío: un dato roto no tira abajo el resto del borrador. */
function sanearFormularioPropiedad(valor: unknown): FormularioDePropiedad | null {
  if (!esObjeto(valor)) return null;
  return {
    direccion: sanearDireccion(valor.direccion),
    unidad: textoONada(valor.unidad),
    categoria: CATEGORIAS.find(({ valor: categoria }) => categoria === valor.categoria)?.valor ?? null,
    bedrooms: enteroONada(valor.bedrooms),
    bathrooms: enteroONada(valor.bathrooms),
    superficie: textoONada(valor.superficie),
    mascotas: valor.mascotas === true,
    amoblada: valor.amoblada === true,
  };
}

function sanearFormularioInquilino(valor: unknown): FormularioDeInquilino | null {
  if (!esObjeto(valor)) return null;
  return { nombre: textoONada(valor.nombre), apellido: textoONada(valor.apellido), cuit: textoONada(valor.cuit), correo: textoONada(valor.correo), telefono: textoONada(valor.telefono) };
}

function sanearDesvio(valor: unknown): DesvioDelBorrador | null {
  if (!esObjeto(valor) || (valor.tipo !== "property" && valor.tipo !== "tenant")) return null;
  const pasos = PASOS_DEL_DESVIO[valor.tipo];
  const paso = esEntero(valor.paso) ? Math.min(Math.max(valor.paso, 1), pasos) : 1;
  return { tipo: valor.tipo, paso };
}

/**
 * Lo inverso de `serializar`. Lee la versión actual y la anterior (sin desvío: se abre en el contrato y
 * los formularios se rearman de lo confirmado). Un borrador de otra versión, o con la forma rota,
 * devuelve null: el asistente avisa que no se pudo leer y ofrece descartarlo, nunca se rompe el panel.
 */
export function deserializar(payload: unknown): EstadoDelBorrador | null {
  if (!esObjeto(payload)) return null;
  const esVersionActual = payload.schemaVersion === VERSION_DEL_PAYLOAD;
  if (!esVersionActual && payload.schemaVersion !== VERSION_ANTERIOR) return null;
  const { paso, diaVencimiento, plazo, frecuencia } = payload;
  const propiedad = sanearElegido<PropertyRequest>(payload.propiedad, esPropiedad);
  const inquilino = sanearElegido<TenantRequest>(payload.inquilino, esInquilino);
  const otras = sanearOtras(payload.otras);
  const metodo = elegir(payload.metodo, METODOS);
  const textos = [payload.alquiler, payload.inicio, payload.porcentaje, payload.pagadoHasta];
  if (!propiedad || !inquilino || !otras || !metodo || !textos.every(esTexto)) return null;
  if (!esEntero(paso) || paso < 1 || paso > 7) return null;
  if (!esEntero(diaVencimiento) || diaVencimiento < 1 || diaVencimiento > 28) return null;
  if (!esEntero(plazo) || plazo < 1 || !esEntero(frecuencia) || frecuencia < 1) return null;
  return {
    paso,
    desvio: esVersionActual ? sanearDesvio(payload.desvio) : null,
    formularioPropiedad: (esVersionActual ? sanearFormularioPropiedad(payload.formularioPropiedad) : null) ?? formularioDePropiedad(propiedad.borrador?.pedido),
    formularioInquilino: (esVersionActual ? sanearFormularioInquilino(payload.formularioInquilino) : null) ?? formularioDeInquilino(inquilino.borrador?.pedido),
    propiedad,
    inquilino,
    alquiler: payload.alquiler as string,
    diaVencimiento,
    plazo,
    inicio: payload.inicio as string,
    metodo,
    porcentaje: payload.porcentaje as string,
    frecuencia,
    otras,
    pagadoHasta: payload.pagadoHasta as string,
  };
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Días enteros que faltan para que se descarte (0 si es hoy, negativo si ya pasó). */
export function diasParaVencer(expiresAt: string, ahora: Date): number {
  return Math.ceil((new Date(expiresAt).getTime() - ahora.getTime()) / MS_POR_DIA);
}

/** Si el aviso del borrador tiene que decir cuándo se descarta. */
export function venceProximamente(expiresAt: string, ahora: Date): boolean {
  return diasParaVencer(expiresAt, ahora) <= DIAS_DE_AVISO_DE_VENCIMIENTO;
}

function ordenarClaves(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenarClaves);
  if (!esObjeto(valor)) return valor;
  return Object.fromEntries(Object.keys(valor).sort((a, b) => a.localeCompare(b)).map((clave) => [clave, ordenarClaves(valor[clave])]));
}

/**
 * El contenido de un borrador como texto, con las claves en orden. El backend guarda el payload en
 * una columna `jsonb`, que no conserva el orden en que se escribieron: sin ordenar, lo que se
 * guardó nunca coincidiría con lo que hay en pantalla y todo borrador retomado parecería modificado.
 */
export function contenidoCanonico(contenido: ContenidoDeBorrador): string {
  return JSON.stringify(ordenarClaves(contenido));
}

/** Un borrador como se lista en Inicio y en Contratos, con los textos ya resueltos. */
export type FilaDeBorrador = {
  id: number;
  etiqueta: string;
  conPdf: boolean;
  /** «hace 3 días», «ayer» u «hoy»: se escribe «Editado …». */
  editado: string;
  /** El día en que se descarta si nadie lo retoma, sólo cuando falta poco. */
  vence: string | null;
};

export function filaDeBorrador(borrador: ContractDraftSummary, ahora: Date): FilaDeBorrador {
  return {
    id: borrador.id,
    etiqueta: borrador.label,
    conPdf: borrador.document !== null,
    editado: hace(borrador.updatedAt, hoyEnArgentina(ahora)) ?? "hace un momento",
    vence: venceProximamente(borrador.expiresAt, ahora) ? formatearFecha(hoyEnArgentina(new Date(borrador.expiresAt))) : null,
  };
}
