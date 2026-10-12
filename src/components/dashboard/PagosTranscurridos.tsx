"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { consecuenciaDe, faltaResponder, nombreDeMes, NINGUNO, type RespuestaPagadoHasta } from "@/lib/transcurridos";

/** Hasta acá se muestran todos los meses como chips; con más (un contrato que empezó hace rato) se elige el mes y el año por separado. */
const MAX_MESES_EN_CHIPS = 6;

const NOMBRES_DE_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const anioDe = (anioMes: string) => anioMes.slice(0, 4);
const mesDe = (anioMes: string) => anioMes.slice(5, 7);

/**
 * Para un contrato con muchas cuotas anteriores: dos opciones («Ya se pagaron algunas» / «Todavía no se
 * pagó ninguna») y, con la primera, un mes y un año. Cada lista es corta (doce meses, un par de años)
 * y los meses se limitan a los del año elegido, así que no se puede armar un mes que no corresponde.
 * Cambiar el año nunca queda bloqueado: si el mes ya no existe en él, se vuelve a pedir. Nada viene elegido.
 */
function ElegirMes({ meses, value, onChange }: Readonly<{ meses: string[]; value: RespuestaPagadoHasta; onChange: (respuesta: RespuestaPagadoHasta) => void }>) {
  const anios = [...new Set(meses.map(anioDe))];
  const haySeleccion = meses.includes(value);
  const [algunas, setAlgunas] = useState(haySeleccion);
  const [mes, setMes] = useState(haySeleccion ? mesDe(value) : "");
  // Con un solo año posible no hay nada que decidir: queda a la vista y sin elegir de más.
  const [anio, setAnio] = useState(haySeleccion ? anioDe(value) : anios.length === 1 ? anios[0] : "");

  const ninguna = value === NINGUNO;
  const mesesDelAnio = anio ? meses.filter((m) => anioDe(m) === anio) : meses;
  const opcionesDeMes = [...new Set(mesesDelAnio.map(mesDe))].sort();

  function responder(nuevoMes: string, nuevoAnio: string) {
    if (nuevoMes && nuevoAnio && meses.includes(`${nuevoAnio}-${nuevoMes}`)) onChange(`${nuevoAnio}-${nuevoMes}`);
    else if (value !== "") onChange("");
  }

  function elegirMes(nuevo: string) {
    // Si el año elegido no tiene ese mes, se pasa al único año que sí lo tiene (o se deja sin elegir).
    const posibles = anios.filter((a) => meses.includes(`${a}-${nuevo}`));
    const nuevoAnio = anio && posibles.includes(anio) ? anio : posibles.length === 1 ? posibles[0] : "";
    setMes(nuevo);
    setAnio(nuevoAnio);
    responder(nuevo, nuevoAnio);
  }

  function elegirAnio(nuevo: string) {
    const nuevoMes = meses.includes(`${nuevo}-${mes}`) ? mes : "";
    setAnio(nuevo);
    setMes(nuevoMes);
    responder(nuevoMes, nuevo);
  }

  const opcion = (titulo: string, detalle: string, elegida: boolean, alElegir: () => void) => (
    <button type="button" className="owner-wizard-option" role="radio" aria-checked={elegida} onClick={alElegir}>
      <span><b>{titulo}</b><small>{detalle}</small></span>
      <span className="owner-wizard-option__check"><Icon name="check" /></span>
    </button>
  );

  return (
    <>
      <div className="owner-wizard-options" role="radiogroup" aria-label="¿Hasta qué mes le pagaron?">
        {opcion("Ya se pagaron algunas cuotas", "Indique hasta qué mes se cobraron.", algunas && !ninguna, () => {
          setAlgunas(true);
          if (value !== "") onChange("");
        })}
        {opcion("Todavía no se pagó ninguna", "Ninguna de las cuotas anteriores a hoy se cobró.", ninguna, () => {
          setAlgunas(false);
          setMes("");
          setAnio(anios.length === 1 ? anios[0] : "");
          onChange(NINGUNO);
        })}
      </div>
      {algunas && !ninguna && (
        <div className="owner-pagos-transcurridos__fecha">
          <label className="owner-wizard-field">
            <span>Mes</span>
            <select value={mes} onChange={(event) => elegirMes(event.target.value)}>
              <option value="" disabled>Elija el mes</option>
              {opcionesDeMes.map((m) => <option key={m} value={m}>{NOMBRES_DE_MES[Number(m) - 1]}</option>)}
            </select>
          </label>
          <label className="owner-wizard-field">
            <span>Año</span>
            <select value={anio} onChange={(event) => elegirAnio(event.target.value)}>
              <option value="" disabled>Elija el año</option>
              {anios.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        </div>
      )}
    </>
  );
}

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
      {meses.length > MAX_MESES_EN_CHIPS ? (
        // Cuando cambia la lista de meses (otras fechas, o la corrige el backend) se vuelve a empezar.
        <ElegirMes key={meses.join(",")} meses={meses} value={value} onChange={onChange} />
      ) : (
        <div className="owner-wizard-chips" role="radiogroup" aria-label="¿Hasta qué mes le pagaron?">
          {meses.map((mes) => opcion(mes, nombreDeMes(mes)))}
          {opcion(NINGUNO, "Ninguno todavía")}
        </div>
      )}
      {consecuencia
        ? <div className="owner-wizard-note" aria-live="polite">{consecuencia.frases.map((frase) => <p key={frase}>{frase}</p>)}</div>
        : faltaResponder(value, meses) && <p className="owner-wizard-help">Elija una opción para poder seguir.</p>}
    </section>
  );
}
