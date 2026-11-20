import type { CamposDeNombre } from "@/lib/inquilino";

/**
 * El checkbox «Es persona jurídica» y los campos de nombre que corresponden:
 * nombre y apellido para una persona, razón social para una empresa (ALQ-191).
 * Lo comparten el alta del asistente y el diálogo de edición.
 */
export function CamposDeNombreDelInquilino({
  valores,
  onChange,
  aviso,
}: Readonly<{
  valores: CamposDeNombre;
  onChange: (cambio: Partial<CamposDeNombre>) => void;
  /** El error del backend para los campos visibles, si lo hay. */
  aviso?: React.ReactNode;
}>) {
  return <>
    <label className="owner-wizard-checkbox">
      <input type="checkbox" checked={valores.personaJuridica} onChange={(event) => onChange({ personaJuridica: event.target.checked })} />
      <span>Es persona jurídica</span>
    </label>
    {valores.personaJuridica
      ? <label className="owner-wizard-field"><span>Razón social</span><input placeholder="Ej: Gómez Hermanos S.R.L." value={valores.razonSocial} onChange={(event) => onChange({ razonSocial: event.target.value })} /></label>
      : <div className="owner-wizard-duo"><label className="owner-wizard-field"><span>Nombre</span><input placeholder="Ej: María" value={valores.nombre} onChange={(event) => onChange({ nombre: event.target.value })} /></label><label className="owner-wizard-field"><span>Apellido</span><input placeholder="Ej: Gómez" value={valores.apellido} onChange={(event) => onChange({ apellido: event.target.value })} /></label></div>}
    {aviso}
  </>;
}
