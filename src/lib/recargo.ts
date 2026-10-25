import { formatearDiaMes, formatearMonto } from "@/lib/formato";
import type { InvoiceResponse, LateFeeResponse } from "@/lib/backend-types";

/**
 * Cómo se muestra el recargo por atraso de una cuota. Todos los importes
 * vienen del backend: acá sólo se eligen y se redactan. La única cuenta es
 * sumar lo que ya calculó él («Desde mañana» = lo que se adeuda hoy, menos el
 * recargo de hoy, más el de mañana), porque redondear distinto que el servidor
 * mostraría un importe que después no coincide con el que se cobra.
 */
export interface RecargoVista {
  etiqueta: "Recargo por atraso";
  /** El recargo de hoy, ya formateado. Vacío mientras todavía no corre. */
  monto: string | null;
  /** Una frase según el estado: cuándo empieza, hasta cuándo se calculó, que ya se pagó. */
  detalle: string | null;
  /** Sólo mientras sigue corriendo: lo que se adeuda mañana. */
  desdeManana: string | null;
  /** Sólo para el propietario: que el recargo no es el que calcula el contrato. */
  modificado: "Recargo modificado" | "Recargo perdonado" | null;
}

type Quien = "propietario" | "inquilino";

function redondear(importe: number): number {
  return Math.round(importe * 100) / 100;
}

function marcaDeModificado(lateFee: LateFeeResponse, quien: Quien): RecargoVista["modificado"] {
  if (quien !== "propietario" || !lateFee.overridden) return null;
  return lateFee.amount > 0 ? "Recargo modificado" : "Recargo perdonado";
}

function detalleDeRecargo(lateFee: LateFeeResponse): string | null {
  switch (lateFee.state) {
    case "NOT_STARTED": {
      if (lateFee.nextDayAmount <= 0) return null;
      const cuanto = formatearMonto(lateFee.nextDayAmount);
      const desde = formatearDiaMes(lateFee.accruesFrom);
      return lateFee.method === "FIXED_ONCE"
        ? `Desde el ${desde} se suma una multa de ${cuanto}`
        : `Desde el ${desde} se suma un recargo de ${cuanto} por día`;
    }
    case "FROZEN":
      return `Calculado al ${formatearDiaMes(lateFee.asOf)}, el día que se envió el comprobante`;
    case "SETTLED":
      return lateFee.amount > 0 ? "Recargo pagado" : null;
    default:
      return null;
  }
}

function importeDesdeManana(invoice: InvoiceResponse, lateFee: LateFeeResponse): string | null {
  if (lateFee.state !== "ACCRUING" || lateFee.nextDayAmount === lateFee.amount) return null;
  return formatearMonto(redondear(invoice.amountDue - lateFee.amount + lateFee.nextDayAmount));
}

export function vistaDeRecargo(invoice: InvoiceResponse, quien: Quien): RecargoVista | null {
  const { lateFee } = invoice;
  if (!lateFee) return null;

  const modificado = marcaDeModificado(lateFee, quien);
  const corre = lateFee.amount > 0;
  const arrancaPronto = lateFee.state === "NOT_STARTED" && lateFee.nextDayAmount > 0;
  if (!corre && !arrancaPronto && !modificado) return null;

  return {
    etiqueta: "Recargo por atraso",
    monto: corre ? formatearMonto(lateFee.amount) : null,
    detalle: detalleDeRecargo(lateFee),
    desdeManana: importeDesdeManana(invoice, lateFee),
    modificado,
  };
}

/** El recargo todavía no está firme: cambia con el día aunque nadie toque la cuota. */
export function recargoEnCurso(invoice: InvoiceResponse): boolean {
  return invoice.lateFee?.state === "NOT_STARTED" || invoice.lateFee?.state === "ACCRUING";
}

/**
 * Lo que el propietario puede hacer con el recargo de una cuota sin pagar.
 * `maximo` es el recargo de hoy según el contrato, que el backend usa de tope:
 * sólo se conoce mientras el recargo no esté modificado, porque con uno
 * modificado `amount` ya no es el del contrato y el front no lo recalcula.
 */
export interface RecargoEditable {
  actual: number;
  maximo: number | null;
  modificado: boolean;
}

export function recargoEditable(invoice: InvoiceResponse): RecargoEditable | null {
  const { lateFee } = invoice;
  if (!lateFee || invoice.status === "PAID") return null;
  // Sin nada que perdonar ni que volver a calcular, el botón sobra.
  if (lateFee.amount <= 0 && !lateFee.overridden) return null;
  return {
    actual: lateFee.amount,
    maximo: lateFee.overridden ? null : lateFee.amount,
    modificado: lateFee.overridden,
  };
}

/** «3.000», «3000,50» o «3000.5»: lo que escribiría el propietario, no un número ya limpio. */
function leerImporte(texto: string): number {
  const limpio = texto.trim().replace(/\s|\$/g, "");
  if (limpio.includes(",")) return Number(limpio.replace(/\./g, "").replace(",", "."));
  if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) return Number(limpio.replace(/\./g, ""));
  return Number(limpio);
}

export type ImporteDeRecargo = { valor: number } | { error: string };

/** El importe a fijar: de 0 al máximo, si se lo conoce. El backend vuelve a validar el tope. */
export function validarImporteDeRecargo(texto: string, maximo: number | null): ImporteDeRecargo {
  if (texto.trim() === "") return { error: "Escriba el importe del recargo. Con 0 queda perdonado." };
  const valor = leerImporte(texto);
  if (!Number.isFinite(valor) || valor < 0) return { error: "Escriba un importe válido, por ejemplo 3.000." };
  if (maximo !== null && valor > maximo) {
    return { error: `El máximo es ${formatearMonto(maximo)}, el recargo de hoy según el contrato.` };
  }
  return { valor: redondear(valor) };
}
