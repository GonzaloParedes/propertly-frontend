import type { Currency } from "@/lib/backend-types";
import { formatearMonto } from "@/lib/formato";

/** «2026-06» a partir de una fecha ISO. */
function mes(fechaISO: string): string {
  return fechaISO.slice(0, 7);
}

function sumarMeses(anioMes: string, cantidad: number): string {
  const [anio, m] = anioMes.split("-").map(Number);
  const total = anio * 12 + (m - 1) + cantidad;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** «junio 2026». */
export function nombreDeMes(anioMes: string): string {
  const [anio, m] = anioMes.split("-").map(Number);
  return `${MESES[m - 1]} ${anio}`;
}

/** Periods in the contract through the current business month. Pricing is authoritative on the server. */
export function mesesElegibles({ inicioISO, plazoMeses, hoyISO }: Readonly<{
  inicioISO: string;
  plazoMeses: number;
  hoyISO: string;
}>): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicioISO) || !/^\d{4}-\d{2}-\d{2}$/.test(hoyISO) || plazoMeses <= 0) return [];
  const primero = mes(inicioISO);
  const actual = mes(hoyISO);
  // El fin del contrato es inclusivo: el último día es el anterior al aniversario del plazo.
  const finMes = sumarMeses(primero, plazoMeses);
  const resultado: string[] = [];
  for (let periodo = primero; periodo <= actual && periodo < finMes; periodo = sumarMeses(periodo, 1)) {
    resultado.push(periodo);
  }
  return resultado;
}

/** Historical periods require an explicit decision; the due date itself is excluded. */
export function mesesTranscurridos(args: { inicioISO: string; plazoMeses: number; diaVencimiento: number; hoyISO: string }): string[] {
  return mesesElegibles(args).filter((periodo) => `${periodo}-${String(args.diaVencimiento).padStart(2, "0")}` < args.hoyISO);
}

/**
 * El backend rechaza el alta con la lista de períodos que él considera elegibles
 * («2026-06, 2026-07») en `errors.elapsed`. Sólo se acepta lo que tiene forma de mes.
 */
export function periodosDelBackend(fieldErrors: Record<string, string> | null | undefined): string[] | null {
  const lista = fieldErrors?.elapsed;
  if (lista === undefined) return null;
  const periodos = lista.split(",").map((p) => p.trim()).filter((p) => /^\d{4}-\d{2}$/.test(p));
  return periodos.length > 0 || lista === "" ? periodos : null;
}

export const NINGUNO = "ninguno";
/** La respuesta del propietario: "" sin responder, `NINGUNO` («Ninguno todavía») o un mes («2026-06»). */
export type RespuestaPagadoHasta = string;

/** Una respuesta que ya no corresponde a ningún mes (cambiaron las fechas) cuenta como sin responder. */
export function respuestaVigenteDe(respuesta: RespuestaPagadoHasta, meses: string[]): RespuestaPagadoHasta {
  return respuesta === "" || respuesta === NINGUNO || meses.includes(respuesta) ? respuesta : "";
}

/** Lo que viaja como `elapsed.paidThrough`; null si no hay nada transcurrido que decidir. */
export function paidThroughDe(respuesta: RespuestaPagadoHasta, meses: string[]): { paidThrough: string | null } | undefined {
  if (meses.length === 0 || respuesta === "") return undefined;
  return { paidThrough: respuesta === NINGUNO ? null : respuesta };
}

/** Falta responder, y por eso no se puede crear. */
export function faltaResponder(respuesta: RespuestaPagadoHasta, meses: string[]): boolean {
  return meses.length > 0 && respuesta === "";
}

function rango(periodos: string[], hoyISO: string): string {
  const anioActual = hoyISO.slice(0, 4);
  const mismoAnio = periodos.every((p) => p.startsWith(anioActual));
  const nombre = (p: string) => (mismoAnio ? nombreDeMes(p).replace(/ \d{4}$/, "") : nombreDeMes(p));
  const texto = periodos.length === 1 ? nombre(periodos[0]) : `${nombre(periodos[0])} a ${nombre(periodos.at(-1)!)}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function fraseDeCobradas(cobradas: string[], hoyISO: string): string {
  if (cobradas.length === 0) return "Ninguna cuota queda como cobrada.";
  const verbo = cobradas.length === 1 ? "queda como cobrada" : "quedan como cobradas";
  return `${rango(cobradas, hoyISO)} ${verbo} (sin comprobante).`;
}

function frasesDeDeuda({ deuda, totalDeuda, tieneRecargo, hoyISO, moneda }: Readonly<{
  deuda: string[];
  totalDeuda: number | null;
  moneda?: Currency;
  tieneRecargo: boolean;
  hoyISO: string;
}>): string[] {
  if (deuda.length === 0) return ["No queda deuda."];
  const verbo = deuda.length === 1 ? "queda como deuda" : "quedan como deuda";
  const detalle = totalDeuda === null ? "" : `: ${formatearMonto(totalDeuda, moneda)}`;
  return [
    `${rango(deuda, hoyISO)} ${verbo}${detalle}.`,
    "Su inquilino va a recibir el aviso de cuota vencida.",
    ...(tieneRecargo ? ["El recargo por atraso empieza a correr desde hoy."] : []),
  ];
}

export interface Consecuencia {
  cobradas: string[];
  deuda: string[];
  /** Sólo si se puede afirmar sin conocer los aumentos: ver `consecuenciaDe`. */
  totalDeuda: number | null;
  /** Una frase por renglón, en el orden en que se leen. */
  frases: string[];
}

/**
 * Qué pasa con cada mes según la respuesta, antes de crear el contrato.
 *
 * El total de la deuda sólo se dice cuando todos los meses adeudados caen antes del
 * primer aumento (`frecuenciaMeses` desde el inicio): ahí cada cuota es el alquiler
 * inicial. Después de un aumento, el importe lo calcula el backend (en un contrato
 * por índice ni siquiera existe todavía) y decir un total sería inventarlo.
 */
export function consecuenciaDe({ meses, respuesta, inicioISO, alquiler, frecuenciaMeses, tieneRecargo, hoyISO, diaVencimiento = 1, moneda }: Readonly<{
  meses: string[];
  respuesta: RespuestaPagadoHasta;
  inicioISO: string;
  alquiler: number;
  frecuenciaMeses: number;
  tieneRecargo: boolean;
  hoyISO: string;
  diaVencimiento?: number;
  /** La del alquiler. Ausente = ARS. */
  moneda?: Currency;
}>): Consecuencia | null {
  if (meses.length === 0 || respuesta === "") return null;
  const hasta = respuesta === NINGUNO ? null : respuesta;
  const cobradas = hasta === null ? [] : meses.filter((m) => m <= hasta);
  const impagas = meses.filter((m) => hasta === null || m > hasta);
  const deuda = impagas.filter((m) => `${m}-${String(diaVencimiento).padStart(2, "0")}` <= hoyISO);
  const pendientes = impagas.filter((m) => !deuda.includes(m));

  const antesDelAumento = deuda.every((m) => m < sumarMeses(mes(inicioISO), frecuenciaMeses));
  const totalDeuda = deuda.length > 0 && antesDelAumento && alquiler > 0 ? alquiler * deuda.length : null;

  const frases = [fraseDeCobradas(cobradas, hoyISO), ...frasesDeDeuda({ deuda, totalDeuda, tieneRecargo, hoyISO, moneda }), ...(pendientes.length ? [`${rango(pendientes, hoyISO)} ${pendientes.length === 1 ? "queda impaga y aún no venció" : "quedan impagas y aún no vencieron"}.`] : [])];
  return { cobradas, deuda, totalDeuda, frases };
}
