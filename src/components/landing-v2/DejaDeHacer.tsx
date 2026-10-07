/*
 * Las tareas que la app reemplaza de verdad: los recordatorios por correo, el
 * comprobante que sube el inquilino, el próximo importe que calcula el backend
 * y el panel con lo cobrado y lo vencido. La raya se dibuja al entrar en
 * pantalla (landing.css); sin soporte o con movimiento reducido, ya está.
 */
const TAREAS = [
  "Escribirle a cada inquilino para recordarle el vencimiento.",
  "Buscar comprobantes entre los mensajes del celular.",
  "Calcular a mano cuánto aumenta el alquiler.",
  "Revisar una planilla para saber quién le debe.",
] as const;

export default function DejaDeHacer() {
  return <section className="lp-seccion lp-tareas" aria-labelledby="lp-tareas-titulo">
    <div className="lp-wrap">
      <h2 id="lp-tareas-titulo">Lo que deja de hacer cada mes.</h2>
      <ul className="lp-tareas__lista">
        {TAREAS.map((tarea) => <li key={tarea}><span>{tarea}</span></li>)}
      </ul>
      <p className="lp-tareas__cierre">De eso se ocupa Alquia.</p>
    </div>
  </section>;
}
