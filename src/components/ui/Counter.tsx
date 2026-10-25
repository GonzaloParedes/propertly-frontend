/**
 * El contador de a pasos que usan el asistente y Configuración. Vive acá y no
 * dentro de una pantalla porque la regla del techo —no ofrecer un valor que el
 * backend va a rechazar— tiene que ser la misma en las dos.
 *
 * `value === null` se muestra como «—»: el campo es opcional y todavía no se
 * cargó. El «−» queda deshabilitado ahí, porque no hay nada que bajar, y el «+»
 * arranca en `min + step`.
 */
import { Minus, Plus } from "lucide-react";

export default function Counter({
  label,
  value,
  unit,
  step = 1,
  min = 0,
  max,
  onChange,
}: {
  label?: string;
  value: number | null;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const vacio = value === null;
  const tope = (v: number) => (max === undefined ? v : Math.min(max, v));
  const enElTope = max !== undefined && !vacio && (value as number) >= max;

  return (
    <div className="owner-wizard-counter">
      {label && <p className="owner-wizard-label">{label}</p>}
      <div>
        <button type="button" aria-label={`Restar ${label?.toLowerCase() ?? unit}`}
          disabled={vacio} onClick={() => onChange(Math.max(min, (value ?? min) - step))}>
          <Minus aria-hidden="true" size={21} />
        </button>
        <strong>{vacio ? "—" : value}</strong>
        {unit && <span>{unit}</span>}
        <button type="button" aria-label={`Sumar ${label?.toLowerCase() ?? unit}`}
          disabled={enElTope}
          onClick={() => onChange(vacio ? tope(min + step) : tope((value as number) + step))}>
          <Plus aria-hidden="true" size={21} />
        </button>
      </div>
    </div>
  );
}
