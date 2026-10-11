"use client";

import { Icon } from "@/components/ui/Icon";
import { consecuenciaDe, faltaResponder, nombreDeMes, NINGUNO, type RespuestaPagadoHasta } from "@/lib/transcurridos";

/**
 * «¿Hasta qué mes le pagaron?» para un contrato que ya empezó. Nada viene elegido:
 * contestar por el propietario sería decidir si un inquilino debe o no, y esa
 * respuesta cambia lo que ve él y lo que recibe el inquilino. Debajo de la
 * elección va lo que va a pasar, antes de crear nada.
 */
export default function PagosTranscurridos({ meses, value, onChange, inicioISO, alquiler, frecuenciaMeses, tieneRecargo, hoyISO, aviso }: Readonly<{
  meses: string[];
  value: RespuestaPagadoHasta;
  onChange: (respuesta: RespuestaPagadoHasta) => void;
  inicioISO: string;
  alquiler: number;
  frecuenciaMeses: number;
  tieneRecargo: boolean;
  hoyISO: string;
  /** Un aviso propio de la pantalla, por ejemplo cuando el backend corrigió la lista. */
  aviso?: string | null;
}>) {
  if (meses.length === 0) return null;
  const consecuencia = consecuenciaDe({ meses, respuesta: value, inicioISO, alquiler, frecuenciaMeses, tieneRecargo, hoyISO });
  const opcion = (clave: string, etiqueta: string) => {
    const elegida = value === clave;
    return (
      <button key={clave} type="button" role="radio" aria-checked={elegida} onClick={() => onChange(clave)}>
        {elegida && <Icon name="check" size={15} />}{etiqueta}
      </button>
    );
  };
  return (
    <section className="owner-pagos-transcurridos" aria-label="Cuotas anteriores a hoy">
      <p className="owner-wizard-label">¿Hasta qué mes le pagaron?</p>
      <p className="owner-wizard-help">Este contrato ya empezó, así que hay cuotas que vencieron antes de hoy. Elija hasta qué mes las cobró.</p>
      {aviso && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{aviso}</p>}
      <div className="owner-wizard-chips" role="radiogroup" aria-label="¿Hasta qué mes le pagaron?">
        {meses.map((mes) => opcion(mes, nombreDeMes(mes)))}
        {opcion(NINGUNO, "Ninguno todavía")}
      </div>
      {consecuencia
        ? <div className="owner-wizard-note" aria-live="polite">{consecuencia.frases.map((frase) => <p key={frase}>{frase}</p>)}</div>
        : faltaResponder(value, meses) && <p className="owner-wizard-help">Elija una opción para poder seguir.</p>}
    </section>
  );
}
