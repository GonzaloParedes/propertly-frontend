import { Icon } from "@/components/ui/Icon";

/*
 * Cada respuesta dice sólo lo que la app hace hoy. Sin precio definido, la
 * primera no promete nada a futuro.
 */
const PREGUNTAS = [
  {
    pregunta: "¿Cuánto cuesta?",
    respuesta: "Crear la cuenta es gratis y no le pedimos tarjeta.",
  },
  {
    pregunta: "¿Mi inquilino tiene que crear una cuenta?",
    respuesta: "No. Recibe un enlace por correo y desde ahí ve sus cuotas y sube los comprobantes.",
  },
  {
    pregunta: "¿Quién recibe los recordatorios?",
    respuesta: "Su inquilino, por correo. Usted elige con cuántos días de anticipación se envían, si se repiten después del vencimiento, o si no se envían.",
  },
  {
    pregunta: "¿Sirve para contratos que se ajustan por índice?",
    respuesta: "Sí. Puede cargar ajustes por ICL o IPC, por porcentaje o por monto fijo, con la frecuencia que fije el contrato.",
  },
  {
    pregunta: "¿Puedo guardar el contrato firmado?",
    respuesta: "Sí. Adjunte el PDF o una foto del contrato firmado y descárguelo cuando lo necesite.",
  },
] as const;

export default function Preguntas() {
  return <section className="lp-seccion lp-preguntas" id="preguntas" aria-labelledby="lp-preguntas-titulo">
    <div className="lp-wrap lp-preguntas__grilla">
      <h2 id="lp-preguntas-titulo">Preguntas frecuentes</h2>
      <div className="lp-preguntas__lista">
        {PREGUNTAS.map((item) => <details key={item.pregunta}>
          <summary>{item.pregunta}<Icon name="plus" size={20} /></summary>
          <p>{item.respuesta}</p>
        </details>)}
      </div>
    </div>
  </section>;
}
