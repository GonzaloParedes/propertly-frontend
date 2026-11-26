import { Icon } from "@/components/ui/Icon";
import type { AvisoDeCuotasSinConfirmar, FiltroCobranza, FilaCobranza } from "@/lib/cobranzas";

/**
 * Lo que frena el cobro, arriba de la tabla y no adentro de la fila: el aviso
 * que antes se repetía en cada cuota sin confirmar es ahora uno solo. Con una
 * cuota ofrece su botón; con varias no, porque cada fila ya tiene el suyo.
 */
export function AvisoDeCuotasPorConfirmar({ aviso, ocupado, onConfirm }: Readonly<{
  aviso: AvisoDeCuotasSinConfirmar;
  ocupado: boolean;
  onConfirm: (cuota: FilaCobranza) => void;
}>) {
  const { cuota } = aviso;
  return <div className={`owner-atencion${aviso.urgente ? " owner-atencion--urgente" : ""}`}>
    <Icon name="alert" size={20} />
    <p><b>{aviso.titulo}</b> {aviso.detalle}</p>
    {cuota && <button type="button" className="owner-atencion__accion" disabled={ocupado}
      aria-label={`Confirmar importe de ${cuota.direccion}`} onClick={() => onConfirm(cuota)}>Confirmar importe</button>}
  </div>;
}

/** Los estados como botones a la vista: un toque, sin abrir ningún panel. `aria-pressed` dice cuál está activo. */
export function FiltroDeEstado({ opciones, activo, cuentas, onChange }: Readonly<{
  opciones: readonly (readonly [FiltroCobranza, string])[];
  activo: FiltroCobranza;
  cuentas: Record<FiltroCobranza, number>;
  onChange: (filtro: FiltroCobranza) => void;
}>) {
  return <div role="group" aria-label="Filtrar por estado" className="owner-segment">
    {opciones.map(([clave, texto]) => (
      <button key={clave} type="button" aria-pressed={activo === clave} onClick={() => onChange(clave)}>
        {texto} <b>{cuentas[clave]}</b>
      </button>
    ))}
  </div>;
}
