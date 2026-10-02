import { formatearMonto } from "@/lib/formato";
import type {
  AdjustmentKind,
  AdjustmentResponse,
  AdjustmentValueType,
  InvoiceAdjustmentRequest,
} from "@/lib/backend-types";

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

/**
 * Lo que el propietario está cargando en el editor de ítems, antes de mandarlo.
 * `kind` dice si suma (recargo) o resta (descuento); `valueType` si el valor es
 * un monto fijo o un porcentaje del importe base.
 */
export interface FormularioItem {
  nombre: string;
  kind: AdjustmentKind;
  valueType: AdjustmentValueType;
  value: number;
}

export const FORM_ITEM_VACIO: FormularioItem = {
  nombre: "",
  kind: "SURCHARGE",
  valueType: "FIXED_AMOUNT",
  value: 0,
};

/** El request que espera el backend, con el nombre ya recortado. */
export function itemARequest(form: FormularioItem): InvoiceAdjustmentRequest {
  return {
    name: form.nombre.trim(),
    kind: form.kind,
    valueType: form.valueType,
    value: form.value,
  };
}

/** El efecto con signo de un ítem todavía no guardado, sobre el importe base. */
export function efectoDeFormulario(form: FormularioItem, importeBase: number): number {
  return efectoDeAjuste(
    { id: -1, name: form.nombre, kind: form.kind, valueType: form.valueType, value: form.value },
    importeBase
  );
}

/**
 * El total que quedaría si se guardara el ítem en edición: importe base + los
 * ajustes ya cargados (excluyendo el que se está editando, para no contarlo dos
 * veces) + el ítem del formulario. Redondeado a centavos para que un arrastre de
 * coma flotante no muestre un total raro ni dispare el piso en cero por error.
 */
export function totalPrevisualizado(
  importeBase: number,
  existentes: AdjustmentResponse[],
  form: FormularioItem,
  editandoId: number | null
): number {
  const conExistentes = existentes
    .filter((a) => a.id !== editandoId)
    .reduce((acc, a) => acc + efectoDeAjuste(a, importeBase), importeBase);
  return Math.round((conExistentes + efectoDeFormulario(form, importeBase)) * 100) / 100;
}

/**
 * Si el ítem del formulario se puede guardar: tiene nombre, un valor mayor a
 * cero, y no deja el total de la cuota negativo (el backend rechaza eso igual —
 * NFR-6 —, pero deshabilitar el botón antes evita el viaje perdido).
 */
export function itemValido(
  form: FormularioItem,
  importeBase: number,
  existentes: AdjustmentResponse[],
  editandoId: number | null
): boolean {
  if (!form.nombre.trim()) return false;
  if (!(form.value > 0)) return false;
  return totalPrevisualizado(importeBase, existentes, form, editandoId) >= 0;
}
