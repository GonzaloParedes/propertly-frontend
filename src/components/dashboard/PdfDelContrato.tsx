"use client";

import { useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { formatearBytes } from "@/lib/importacion-pdf";

/**
 * El PDF firmado, opcional, en la revisión del contrato. Queda guardado tal cual: no se lee solo ni
 * gasta lecturas. Con un borrador guardado se sube enseguida; si no, espera al contrato.
 */
export default function PdfDelContrato({ habilitado, documento, ocupado, error, onElegir, onQuitar }: Readonly<{
  /** Sólo «Nuevo contrato» con sesión guarda un PDF: en el prototipo no se muestra. */
  habilitado: boolean;
  documento: { nombre: string; tamano: number } | null;
  ocupado: boolean;
  error: string | null;
  onElegir: (archivo: File) => void;
  onQuitar: () => void;
}>) {
  const input = useRef<HTMLInputElement>(null);
  if (!habilitado) return null;
  return <section className="owner-pdf-opcional" aria-label="Contrato firmado">
    <h2>El contrato firmado <small>(opcional)</small></h2>
    <p className="owner-wizard-help">Si tiene el PDF, adjúntelo y queda guardado con el contrato. Se guarda tal cual: no lo leemos automáticamente.</p>
    {documento ? (
      <div className="owner-pdf-file">
        <span><Icon name="file" /></span>
        <div><b>{documento.nombre}</b><small>PDF · {formatearBytes(documento.tamano)}</small></div>
        <button type="button" className="owner-button owner-button--secondary owner-button--small" disabled={ocupado} onClick={() => input.current?.click()}>Reemplazar</button>
        <button type="button" className="owner-button owner-button--secondary owner-button--small" disabled={ocupado} onClick={onQuitar}>Quitar</button>
      </div>
    ) : (
      <button type="button" className="owner-wizard-quiet owner-pdf-opcional__adjuntar" disabled={ocupado} aria-busy={ocupado || undefined} onClick={() => input.current?.click()}>
        {ocupado ? <><Spinner />Adjuntando…</> : <><Icon name="paperclip" />Adjuntar el PDF</>}
      </button>
    )}
    <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} aria-hidden="true" aria-label="Archivo del contrato firmado"
      onChange={(e) => { const elegido = e.target.files?.[0]; e.target.value = ""; if (elegido) onElegir(elegido); }} />
    {error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}
  </section>;
}
