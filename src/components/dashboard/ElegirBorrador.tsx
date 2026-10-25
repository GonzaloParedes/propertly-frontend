"use client";

import Dialog from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { LIMITE_DE_BORRADORES, type FilaDeBorrador } from "@/lib/borradores";

/**
 * Al tocar «Nuevo contrato» con borradores guardados: primero se ofrece seguir uno, que es lo que
 * más probablemente quería quien volvió. Con el máximo de borradores no se puede empezar otro hasta
 * terminar o descartar uno, y el diálogo lo explica en vez de dejar que el guardado falle después.
 */
export default function ElegirBorrador({ borradores, onResume, onNew, onClose }: Readonly<{
  borradores: FilaDeBorrador[];
  onResume: (id: number) => void;
  onNew: () => void;
  onClose: () => void;
}>) {
  const alLimite = borradores.length >= LIMITE_DE_BORRADORES;
  return <Dialog title="Tiene contratos a medio cargar" onClose={onClose}>
    <div className="owner-dialog__body">
      <p>{alLimite
        ? `Tiene ${LIMITE_DE_BORRADORES} borradores, el máximo. Para empezar otro contrato, termine o descarte uno de estos.`
        : "Puede seguir con uno de estos o empezar un contrato nuevo."}</p>
      <ul className="owner-borradores-elegir">
        {borradores.map((borrador) => <li key={borrador.id}>
          <span className="owner-row__icon"><Icon name="file" /></span>
          <span><b>{borrador.etiqueta}</b><small>Editado {borrador.editado}</small></span>
          <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={() => onResume(borrador.id)}>Continuar</button>
        </li>)}
      </ul>
    </div>
    {!alLimite && <div className="owner-dialog__foot">
      <button type="button" className="owner-button owner-button--primary" onClick={onNew}>Empezar uno nuevo</button>
    </div>}
  </Dialog>;
}
