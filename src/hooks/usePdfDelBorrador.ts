"use client";

import { useState } from "react";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { ContractDraftDocument } from "@/lib/backend-types";
import { copyDeError } from "@/lib/error-codes";
import { mensajeDeRechazo, revisarArchivo } from "@/lib/importacion-pdf";

export type DocumentoAdjunto = { nombre: string; tamano: number };

/** Lo que el asistente necesita del guardado automático para tocar el PDF sin pisarlo. */
type Autoguardado = {
  id: number | null;
  congelar: () => Promise<void>;
  descongelar: () => void;
  adoptarVersion: (version: number) => void;
};

/**
 * El PDF firmado del contrato, opcional. Con un borrador guardado se sube enseguida; sin él (se llegó
 * al máximo de borradores) espera en pantalla y se adjunta al contrato ya creado. Subirlo o quitarlo
 * cambia la versión del borrador, así que se frena el guardado mientras tanto: si no, el propio
 * asistente chocaría consigo mismo.
 */
export function usePdfDelBorrador(auto: Autoguardado, inicial: ContractDraftDocument | null | undefined) {
  const [documento, setDocumento] = useState<DocumentoAdjunto | null>(inicial ? { nombre: inicial.fileName, tamano: inicial.sizeBytes } : null);
  const [archivoLocal, setArchivoLocal] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Corre `tarea` con el guardado frenado y el botón ocupado, y lo suelta pase lo que pase. */
  async function conElGuardadoFrenado(tarea: () => Promise<void>, alFallar: (err: unknown) => string) {
    setOcupado(true);
    await auto.congelar();
    try {
      await tarea();
    } catch (err) {
      setError(alFallar(err));
    } finally {
      auto.descongelar();
      setOcupado(false);
    }
  }

  async function adjuntar(archivo: File) {
    const problema = revisarArchivo(archivo);
    setError(problema);
    if (problema) return;
    const borradorId = auto.id;
    if (borradorId === null) {
      setArchivoLocal(archivo);
      setDocumento({ nombre: archivo.name, tamano: archivo.size });
      return;
    }
    await conElGuardadoFrenado(async () => {
      const resumen = await AlquiaBackendClient.contractDrafts.attachDocument(borradorId, archivo);
      auto.adoptarVersion(resumen.version);
      setDocumento({ nombre: resumen.document?.fileName ?? archivo.name, tamano: resumen.document?.sizeBytes ?? archivo.size });
    }, mensajeDeRechazo);
  }

  async function quitar() {
    setError(null);
    const borradorId = auto.id;
    if (borradorId === null) {
      setArchivoLocal(null);
      setDocumento(null);
      return;
    }
    await conElGuardadoFrenado(async () => {
      await AlquiaBackendClient.contractDrafts.removeDocument(borradorId);
      // Quitarlo no devuelve nada, pero cambia la versión del borrador: se vuelve a leer para seguir al día.
      auto.adoptarVersion((await AlquiaBackendClient.contractDrafts.get(borradorId)).version);
      setDocumento(null);
    }, (err) => copyDeError(err, { fallback: "No pudimos quitar el PDF. Inténtelo de nuevo." }));
  }

  return { documento, archivoLocal, ocupado, error, adjuntar, quitar };
}
