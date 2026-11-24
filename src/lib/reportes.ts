/**
 * «Reportar un problema» (ALQ-184). El diálogo vive una sola vez en el panel
 * y se abre con un evento, igual que el tutorial: así lo abren tanto la
 * navegación como el «Avisanos de este error» de cualquier alerta, sin pasar
 * callbacks por toda la app.
 */
import * as Sentry from "@sentry/nextjs";
import type { FeedbackRequest, FeedbackType } from "@/lib/backend-types";

export const REPORTE_ABRIR = "alquia:reportar";

export const TIPOS_DE_REPORTE: readonly { valor: FeedbackType; etiqueta: string }[] = [
  { valor: "BUG", etiqueta: "Error" },
  { valor: "SUGGESTION", etiqueta: "Sugerencia" },
  { valor: "OTHER", etiqueta: "Otro" },
];

export const MAXIMO_DESCRIPCION = 4000;

/** Lo que trae el diálogo cuando se abre desde una alerta de error. */
export type ContextoDeReporte = Readonly<{ mensajeDeError?: string }>;

export function abrirReporte(contexto: ContextoDeReporte = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ContextoDeReporte>(REPORTE_ABRIR, { detail: contexto }));
}

/**
 * El ID que se adjunta para encontrar el evento en Sentry. Con un mensaje de
 * error se registra uno nuevo en el momento: el último evento podría ser de
 * otra cosa. Sin mensaje, se manda el último, si hubo. Sentry nunca frena el envío.
 */
function idDeSentry(mensajeDeError: string | undefined): string | undefined {
  try {
    if (mensajeDeError) {
      return Sentry.captureMessage(`Reporte de propietario: ${mensajeDeError}`, "warning");
    }
    return Sentry.lastEventId();
  } catch {
    return undefined;
  }
}

const recortar = (valor: string, maximo: number) => (valor.length > maximo ? valor.slice(0, maximo) : valor);

/** Arma el cuerpo de `POST /feedback` con el contexto que se adjunta solo. */
export function armarReporte(tipo: FeedbackType, descripcion: string, contexto: ContextoDeReporte): FeedbackRequest {
  const mensajeDeError = contexto.mensajeDeError?.trim() || undefined;
  return {
    type: tipo,
    description: descripcion.trim(),
    pageUrl: recortar(window.location.href, 2000),
    userAgent: recortar(window.navigator.userAgent, 500),
    errorMessage: mensajeDeError && recortar(mensajeDeError, 2000),
    sentryEventId: idDeSentry(mensajeDeError),
  };
}

/** Mismo tope que el backend (`app.feedback.screenshot.max-bytes`, 5 MB). */
export const MAXIMO_CAPTURA_BYTES = 5242880;
export const TIPOS_DE_CAPTURA = ["image/png", "image/jpeg", "image/webp"] as const;
const EXTENSIONES_DE_CAPTURA = /\.(png|jpe?g|webp)$/i;

export const ERROR_CAPTURA_PESADA = "La captura pesa más de 5 MB. Elija una más liviana.";
export const ERROR_CAPTURA_TIPO = "Sólo podemos recibir capturas en PNG, JPG o WebP.";

/**
 * Chequeo previo al envío: devuelve el motivo del rechazo o `null` si sirve.
 * Mira `file.type` y, si el navegador no lo informa (pasa en algunos celulares),
 * la extensión. El backend vuelve a validar por el contenido real.
 */
export function validarCaptura(file: File): string | null {
  // Algunos Android informan `application/octet-stream`: es como no saber el tipo.
  const tipoDesconocido = !file.type || file.type === "application/octet-stream";
  const tipoValido = tipoDesconocido
    ? EXTENSIONES_DE_CAPTURA.test(file.name)
    : (TIPOS_DE_CAPTURA as readonly string[]).includes(file.type);
  if (!tipoValido) return ERROR_CAPTURA_TIPO;
  if (file.size > MAXIMO_CAPTURA_BYTES) return ERROR_CAPTURA_PESADA;
  return null;
}
