import { Icon } from "@/components/ui/Icon";

/**
 * El diálogo de la app: estilos en OwnerWorkspace.css (`.owner-dialog*`). Sin `onClose` no hay
 * forma de cerrarlo sin elegir: es para una decisión que no se puede dejar para después.
 */
export default function Dialog({ title, children, onClose }: Readonly<{ title: string; children: React.ReactNode; onClose?: () => void }>) {
  return <dialog open className="owner-dialog" aria-modal="true" aria-labelledby="dialog-title">{onClose && <button type="button" aria-label="Cerrar" className="owner-dialog__backdrop" onClick={onClose} />}<section className="owner-dialog__panel"><div className="owner-dialog__head"><h2 id="dialog-title">{title}</h2>{onClose && <button type="button" className="owner-icon-button" aria-label="Cerrar" onClick={onClose}><Icon name="x" /></button>}</div>{children}</section></dialog>;
}
