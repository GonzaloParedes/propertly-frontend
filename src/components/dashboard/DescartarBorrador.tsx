"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { Icon } from "@/components/ui/Icon";
import Dialog from "@/components/ui/Dialog";
import { copyDeError } from "@/lib/error-codes";

/**
 * Pide confirmar antes de borrar un borrador: se pierden los datos y el PDF, y no hay vuelta atrás.
 * Lo usan Inicio, Contratos y el propio asistente, así el aviso dice siempre lo mismo.
 * `descartar` hace el borrado; si falla, el error queda a la vista y el diálogo sigue abierto.
 */
export default function DescartarBorrador({ etiqueta, conPdf, descartar, onCancel, onDone }: Readonly<{
  etiqueta: string;
  conPdf: boolean;
  descartar: () => Promise<void>;
  onCancel: () => void;
  onDone: () => void;
}>) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setOcupado(true);
    setError(null);
    try {
      await descartar();
      onDone();
    } catch (err) {
      setError(copyDeError(err, { fallback: "No pudimos descartar el borrador. Inténtelo de nuevo." }));
      setOcupado(false);
    }
  }

  return <Dialog title="¿Descartar este borrador?" onClose={ocupado ? undefined : onCancel}>
    <div className="owner-dialog__body">
      <p>Se borran los datos cargados de <b>{etiqueta}</b>{conPdf ? " y el PDF que adjuntó" : ""}. No se puede deshacer.</p>
      {error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}
    </div>
    <div className="owner-dialog__foot">
      <button type="button" className="owner-button owner-button--quiet" onClick={onCancel} disabled={ocupado}>Volver</button>
      <button type="button" className="owner-button owner-button--danger" onClick={() => void confirmar()} disabled={ocupado} aria-busy={ocupado || undefined}>
        {ocupado ? <><Spinner />Descartando…</> : "Descartar"}
      </button>
    </div>
  </Dialog>;
}
