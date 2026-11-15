"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * El alta no manda el flag: el contrato nace con los avisos apagados y, si el
 * propietario los prende acá, se activan con un PUT después de crearlo.
 */
export function CartelAvisosInquilino({ activo, onChange, disabled = false }: Readonly<{
  activo: boolean;
  onChange: (activo: boolean) => void;
  disabled?: boolean;
}>) {
  return (
    <aside className="owner-wizard-note owner-avisos-alta">
      <Icon name="bell" />
      <div>
        <p><b>¿Querés notificar al inquilino?</b></p>
        <p>Por ahora no le enviamos avisos de vencimiento ni de actualización. Puede activarlos ahora; si no, los activa después desde el detalle del contrato.</p>
        <Interruptor label="Avisar al inquilino" checked={activo} disabled={disabled} onChange={onChange} />
      </div>
    </aside>
  );
}

/** En el detalle del contrato: prende o apaga los avisos y muestra el valor que devolvió el backend. */
export function ControlAvisosInquilino({ enabled, onChange }: Readonly<{
  enabled: boolean;
  onChange: (enabled: boolean) => Promise<unknown>;
}>) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const enCurso = useRef(false);

  async function cambiar(siguiente: boolean) {
    if (enCurso.current) return;
    enCurso.current = true;
    setError(null);
    setPending(true);
    try {
      await onChange(siguiente);
    } catch (e) {
      console.error("Failed to toggle tenant notifications", e);
      setError("No pudimos cambiar los avisos al inquilino. Inténtelo de nuevo.");
    } finally {
      enCurso.current = false;
      setPending(false);
    }
  }

  return (
    <div className="owner-avisos-contrato">
      <p><b>Avisos al inquilino</b></p>
      <p>Vencimientos y actualizaciones. Apagado, no le enviamos ninguno.</p>
      <Interruptor label="Avisar al inquilino" checked={enabled} disabled={pending} onChange={(value) => void cambiar(value)} />
      {error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}
    </div>
  );
}

function Interruptor({ label, checked, disabled = false, onChange }: Readonly<{
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}>) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="owner-switch" disabled={disabled} aria-busy={disabled || undefined} onClick={() => onChange(!checked)}>
      <span>{label}</span>
      <i aria-hidden="true" />
    </button>
  );
}
