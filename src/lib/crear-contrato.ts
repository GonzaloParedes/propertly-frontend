import { ApiError } from "@/lib/api";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { ContractOnboardingRequest } from "@/lib/backend-types";
import { ERROR } from "@/lib/error-codes";

/** Qué pasó al crear el contrato que el propietario tiene que saber. */
export type ResultadoDelAlta = {
  /** El borrador ya no existía (se descartó o venció): el PDF que traía no llegó al contrato. */
  pdfPerdido?: boolean;
  /** El PDF no se pudo adjuntar al contrato recién creado: se puede subir desde su detalle. */
  pdfSinAdjuntar?: boolean;
  /** El contrato quedó creado, pero no se pudieron activar los avisos al inquilino. */
  avisosSinActivar?: boolean;
  /**
   * El propietario los pidió y el PUT respondió bien. Recién ahí el backend
   * le manda al inquilino el enlace de acceso.
   */
  avisosActivados?: boolean;
};

const EXITO_CON_ENLACE = "Contrato creado. Le enviamos al inquilino su enlace por correo.";
const EXITO_SIN_ENVIO = "Contrato creado. Podés activar los avisos al inquilino desde su detalle.";

/**
 * El alta no manda ningún mail. El toast sólo afirma el envío del enlace si los
 * avisos quedaron prendidos; si nacieron apagados o el PUT falló, dice que se
 * pueden activar desde el detalle.
 */
export function mensajeExitoDelContrato(resultado?: ResultadoDelAlta): string {
  return resultado?.avisosActivados ? EXITO_CON_ENLACE : EXITO_SIN_ENVIO;
}

/** Lo que el asistente tiene del PDF al crear el contrato. */
export type PdfDelAlta = {
  /** Hay un PDF guardado con el borrador. */
  enElBorrador: boolean;
  /** El PDF que espera en pantalla porque no hubo borrador donde guardarlo. */
  archivoLocal: File | null;
};

function unir(...partes: Array<ResultadoDelAlta | undefined>): ResultadoDelAlta | undefined {
  const resultado: ResultadoDelAlta = {};
  for (const parte of partes) {
    if (parte) Object.assign(resultado, parte);
  }
  return Object.keys(resultado).length > 0 ? resultado : undefined;
}

/** Sin borrador, el PDF espera en pantalla y se adjunta recién al contrato ya creado. */
async function adjuntarAlContrato(contratoId: number, archivo: File): Promise<ResultadoDelAlta | undefined> {
  try {
    await AlquiaBackendClient.contracts.attachDocument(contratoId, archivo);
    return undefined;
  } catch {
    return { pdfSinAdjuntar: true };
  }
}

/**
 * El alta no acepta el flag y deja los avisos apagados. Si el propietario los pidió,
 * se prenden con el PUT. Si ese PUT falla, el contrato igual existe.
 */
export async function activarAvisosDelInquilino(contratoId: number): Promise<ResultadoDelAlta> {
  try {
    await AlquiaBackendClient.contracts.setTenantNotifications(contratoId, true);
    return { avisosActivados: true };
  } catch {
    return { avisosSinActivar: true };
  }
}

function elBorradorYaNoExiste(err: unknown, borradorId: number | null): boolean {
  return borradorId !== null && err instanceof ApiError && err.type === ERROR.CONTRACT_DRAFT_NOT_FOUND;
}

/**
 * Crea el contrato de una vez, consumiendo el borrador si lo hay. Si sale de un borrador que ya no
 * existe (se descartó o venció en otro dispositivo) se crea igual, sin él: el contrato no depende de
 * un borrador. El PDF que ese borrador traía se perdió con él, y quien llama lo avisa.
 */
export async function crearContratoDesdeBorrador(
  pedido: ContractOnboardingRequest,
  borradorId: number | null,
  pdf: PdfDelAlta,
  avisarAlInquilino = false
): Promise<ResultadoDelAlta | undefined> {
  try {
    const creado = await AlquiaBackendClient.contracts.onboard(borradorId === null ? pedido : { ...pedido, draftId: borradorId });
    const adjunto = pdf.archivoLocal ? await adjuntarAlContrato(creado.id, pdf.archivoLocal) : undefined;
    const avisos = avisarAlInquilino ? await activarAvisosDelInquilino(creado.id) : undefined;
    return unir(adjunto, avisos);
  } catch (err) {
    if (!elBorradorYaNoExiste(err, borradorId)) throw err;
  }
  const creado = await AlquiaBackendClient.contracts.onboard(pedido);
  const perdido: ResultadoDelAlta | undefined = pdf.enElBorrador ? { pdfPerdido: true } : undefined;
  const adjunto = pdf.archivoLocal ? await adjuntarAlContrato(creado.id, pdf.archivoLocal) : undefined;
  const avisos = avisarAlInquilino ? await activarAvisosDelInquilino(creado.id) : undefined;
  return unir(perdido, adjunto, avisos);
}
