import { formatearMonto } from "@/lib/formato";
import type { AdjustmentKind, AdjustmentResponse } from "@/lib/backend-types";

/**
 * Lo que hay que mandarle al backend para llegar al importe que el propietario
 * escribió. `null` cuando no hay diferencia: guardar un ajuste de cero ensucia
 * la cuota con una línea que no cambia nada.
 *
 * Siempre monto fijo, aunque la API acepte porcentaje: el propietario fijó un
 * importe final, y convertir esa diferencia a porcentaje daría un número
 * arbitrario que además se recalcularía sobre el importe base si alguien lo
 * edita después.
 */
export interface Delta {
  kind: AdjustmentKind;
  valueType: "FIXED_AMOUNT";
  value: number;
}

export function calcularDelta(importeFinal: number, totalVigente: number): Delta | null {
  const diferencia = Math.round((importeFinal - totalVigente) * 100) / 100;
  if (diferencia === 0) return null;
  return {
    kind: diferencia > 0 ? "SURCHARGE" : "DISCOUNT",
    valueType: "FIXED_AMOUNT",
    value: Math.abs(diferencia),
  };
}

/**
 * Cuánto pesa un ajuste sobre esta cuota, en plata. Un porcentual se calcula
 * sobre el **importe base**, no sobre el total acumulado: verificado contra la
 * instancia el 28/09/2026 —base $700.000, descuento del 10 %, total $630.000, y
 * un recargo fijo de $30.000 después deja $660.000, no $693.000—.
 */
export function efectoDeAjuste(ajuste: AdjustmentResponse, importeBase: number): number {
  const magnitud =
    ajuste.valueType === "PERCENTAGE" ? (importeBase * ajuste.value) / 100 : ajuste.value;
  return ajuste.kind === "DISCOUNT" ? -magnitud : magnitud;
}

export interface LineaAjuste {
  id: number;
  nombre: string;
  /** «− $ 70.000», «+ $ 30.000». El signo es parte del dato, no decoración. */
  efecto: string;
  /** «10 % del importe base», sólo en los porcentuales. */
  detalle: string | null;
}

export function describirAjuste(
  ajuste: AdjustmentResponse,
  importeBase: number
): LineaAjuste {
  const efecto = efectoDeAjuste(ajuste, importeBase);
  return {
    id: ajuste.id,
    nombre: ajuste.name,
    efecto: `${efecto < 0 ? "−" : "+"} ${formatearMonto(Math.abs(efecto))}`,
    detalle:
      ajuste.valueType === "PERCENTAGE" ? `${ajuste.value} % del importe base` : null,
  };
}

/** Cómo se anuncia el cambio antes de guardarlo. */
export function describirDelta(delta: Delta | null): string {
  if (!delta) return "El importe no cambia: no se va a guardar ningún ajuste.";
  return delta.kind === "DISCOUNT"
    ? `Se va a guardar un descuento de ${formatearMonto(delta.value)}.`
    : `Se va a guardar un recargo de ${formatearMonto(delta.value)}.`;
}
