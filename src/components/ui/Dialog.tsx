import { Icon } from "@/components/ui/Icon";

/** El diálogo de la app: estilos en OwnerWorkspace.css (`.owner-dialog*`). */
export default function Dialog({ title, children, onClose }: Readonly<{ title: string; children: React.ReactNode; onClose: () => void }>) {
  return <dialog open className="owner-dialog" aria-modal="true" aria-labelledby="dialog-title"><button type="button" aria-label="Cerrar" className="owner-dialog__backdrop" onClick={onClose} /><section className="owner-dialog__panel"><div className="owner-dialog__head"><h2 id="dialog-title">{title}</h2><button type="button" className="owner-icon-button" aria-label="Cerrar" onClick={onClose}><Icon name="x" /></button></div>{children}</section></dialog>;
}
