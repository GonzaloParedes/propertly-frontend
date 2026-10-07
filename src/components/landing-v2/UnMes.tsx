/*
 * Un mes contado con lo que Alquia hace de verdad: los recordatorios le llegan
 * al inquilino por correo (src/lib/recordatorios.ts), el aviso de pago
 * confirmado se envía siempre, y al propietario le avisa su panel.
 *
 * El calendario es un mes de ejemplo que empieza un miércoles, así el 10 cae
 * viernes como dice el recordatorio.
 */
const PRIMER_DIA = 3; // miércoles, en una semana que empieza el lunes
const VENCE = 10;

const AVISOS = [
  { dia: 5, para: "A Marta, por correo", texto: "Le recordamos que su cuota de $ 520.000 vence el viernes 10." },
  { dia: 8, para: "A usted, en su panel", texto: "Marta Suárez subió el comprobante de la transferencia." },
  { dia: 9, para: "A Marta, por correo", texto: "Usted confirmó el pago. A Marta le llega la confirmación." },
  { dia: 15, para: "Si una cuota se atrasa", texto: "Rivadavia 2340 sigue sin pago: queda marcada como vencida y Jorge recibe otro recordatorio." },
] as const;

/** Día del mes → posición de su aviso en la lista (1 a 4), para enlazar el día con su aviso. */
const AVISO_DEL_DIA = new Map<number, number>(AVISOS.map((aviso, indice) => [aviso.dia, indice + 1]));

function claseDelDia(dia: number): string {
  const aviso = AVISO_DEL_DIA.get(dia);
  if (aviso) return `lp-calendario__dia lp-calendario__dia--aviso lp-calendario__dia--n${aviso}`;
  if (dia === VENCE) return "lp-calendario__dia lp-calendario__dia--vence";
  return "lp-calendario__dia";
}
const SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

function Calendario() {
  const dias = Array.from({ length: 31 }, (_, i) => i + 1);
  return <figure className="lp-calendario">
    <div aria-hidden="true">
      <div className="lp-calendario__semana">{SEMANA.map((dia, i) => <span key={i}>{dia}</span>)}</div>
      <div className="lp-calendario__dias">
        {dias.map((dia) => <span
          key={dia}
          style={dia === 1 ? { gridColumnStart: PRIMER_DIA } : undefined}
          className={claseDelDia(dia)}
        >{dia}</span>)}
      </div>
      <div className="lp-calendario__clave">
        <span><i className="lp-calendario__muestra lp-calendario__muestra--aviso" />Un aviso</span>
        <span><i className="lp-calendario__muestra lp-calendario__muestra--vence" />Vence la cuota</span>
      </div>
    </div>
    <figcaption className="sr-only">Un mes de ejemplo con avisos los días 5, 8, 9 y 15, y la cuota que vence el viernes 10.</figcaption>
  </figure>;
}

export default function UnMes() {
  return <section className="lp-seccion lp-banda--blanca lp-mes" aria-labelledby="lp-mes-titulo">
    <div className="lp-wrap">
      <div className="lp-encabezado">
        <h2 id="lp-mes-titulo">Un mes cualquiera, sin perseguir a nadie.</h2>
        <p>Alquia sigue cada cuota y avisa cuando hace falta: a su inquilino por correo, y a usted en su panel.</p>
      </div>
      {/* En la variante con scroll, el recorrido es alto y la grilla queda fija:
          los avisos se reemplazan en el mismo lugar mientras el calendario se llena. */}
      <div className="lp-mes__recorrido">
        <div className="lp-mes__grilla">
          <Calendario />
          <ol className="lp-mes__avisos">
            {AVISOS.map((aviso) => <li key={aviso.dia}>
              <span className="lp-mes__dia" aria-label={`Día ${aviso.dia}`}>{aviso.dia}</span>
              <div>
                <p className="lp-mes__para">{aviso.para}</p>
                <p className="lp-mes__texto">{aviso.texto}</p>
              </div>
            </li>)}
          </ol>
        </div>
      </div>
    </div>
  </section>;
}
