import type { PriceIndex, RentIncreaseParams } from "@/lib/backend-types";
import { formatearPeriodo, hoyEnArgentina } from "@/lib/formato";

/**
 * La calculadora de aumentos por ICL/IPC (ALQ-145). El cálculo lo hace el
 * backend (`GET /tools/rent-increase`) con la misma cuenta que usa para los
 * contratos: este módulo sólo arma el pedido y resuelve qué meses se pueden
 * elegir. No depende de la sesión, así la misma pantalla puede ir después a la
 * landing pública.
 *
 * Los meses viajan como `yyyy-MM` («2026-05»).
 */

export const INDICES: ReadonlyArray<{ valor: PriceIndex; etiqueta: string; detalle: string }> = [
  { valor: "ICL", etiqueta: "ICL", detalle: "Índice para Contratos de Locación (BCRA)" },
  { valor: "IPC", etiqueta: "IPC", detalle: "Índice de Precios al Consumidor (INDEC)" },
];

export const FRECUENCIA_MINIMA = 1;
export const FRECUENCIA_MAXIMA = 12;
export const FRECUENCIA_INICIAL = 3;

/** El primer mes que se ofrece: antes de 2020 no hay contratos por ICL. */
export const PRIMER_MES = "2020-01";

export function mesDe(fechaISO: string): string {
  return fechaISO.slice(0, 7);
}

export function sumarMeses(mes: string, cantidad: number): string {
  const [anio, numero] = mes.split("-").map(Number);
  const total = anio * 12 + (numero - 1) + cantidad;
  const nuevoAnio = Math.floor(total / 12);
  const nuevoMes = (total % 12) + 1;
  return `${nuevoAnio}-${String(nuevoMes).padStart(2, "0")}`;
}

/** «mayo 2026». */
export function formatearMes(mes: string): string {
  return formatearPeriodo(`${mes}-01`);
}

/**
 * El último ajuste más reciente que se puede calcular: el aumento rige
 * `frecuencia` meses después y el backend sólo lo calcula cuando ese mes ya
 * empezó, porque antes el índice de esos meses no está publicado.
 */
export function ultimoAjusteMaximo(frecuencia: number, hoyISO: string = hoyEnArgentina()): string {
  return sumarMeses(mesDe(hoyISO), -frecuencia);
}

/** Lleva el mes elegido al rango permitido, por ejemplo al cambiar la frecuencia. */
export function acotarMes(mes: string, maximo: string): string {
  if (mes > maximo) return maximo;
  if (mes < PRIMER_MES) return PRIMER_MES;
  return mes;
}

/** Del texto del campo («1.250.000») al número; `null` si no es un monto válido. */
export function montoDesdeTexto(texto: string): number | null {
  const digitos = texto.replace(/\D/g, "");
  if (!digitos) return null;
  const monto = Number(digitos);
  return monto > 0 ? monto : null;
}

export interface FormularioDeAumento {
  indice: PriceIndex;
  monto: string;
  ultimoAjuste: string;
  frecuencia: number;
}

export function validarFormulario(form: FormularioDeAumento): string | null {
  return montoDesdeTexto(form.monto) === null ? "Ingrese el alquiler actual." : null;
}

export function armarPedido(form: FormularioDeAumento): RentIncreaseParams {
  return {
    index: form.indice,
    amount: montoDesdeTexto(form.monto) ?? 0,
    lastAdjustment: form.ultimoAjuste,
    frequencyMonths: form.frecuencia,
  };
}

/** «12,35 %». */
export function formatearPorcentaje(valor: number): string {
  return `${valor.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

/** «$ 1.250.000,50»: el resultado lleva centavos, como lo calcula el backend. */
export function formatearMontoConCentavos(monto: number): string {
  return `$ ${monto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
