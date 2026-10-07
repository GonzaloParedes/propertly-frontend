import { Icon } from "@/components/ui/Icon";
import {
  PiezaAvisoPropietario,
  PiezaCobranzas,
  PiezaContrato,
  PiezaDocumento,
  PiezaEnlace,
  PiezaPortalInquilino,
  PiezaVencidas,
} from "./piezas";

/*
 * Feature Stack: el texto de cada momento queda fijo a la izquierda mientras
 * sus piezas pasan a la derecha. Es CSS (`position: sticky`), sin JS; en
 * celular se apila. Cada dato de las listas sale de una función que la app ya
 * tiene.
 */

type Momento = {
  id: string;
  titulo: string;
  bajada: string;
  datos: readonly string[];
  piezas: React.ReactNode;
};

const MOMENTOS: Momento[] = [
  {
    id: "cobranzas",
    titulo: "Quién pagó y quién no, de un vistazo.",
    bajada: "Cada cuota con su monto y su estado. Sin cruzar transferencias contra una planilla.",
    datos: [
      "Las cuotas se emiten solas a partir de cada contrato.",
      "Lo vencido se marca solo, con el total y los días de atraso.",
      "Si le pagan en efectivo, registra el pago usted.",
    ],
    piezas: <><PiezaCobranzas /><PiezaVencidas /></>,
  },
  {
    id: "inquilino",
    titulo: "Su inquilino informa el pago. Usted lo confirma.",
    bajada: "Le llega un enlace para ver sus cuotas y subir el comprobante, sin crear una cuenta.",
    datos: [
      "El enlace se copia o se reenvía por correo desde el contrato.",
      "El inquilino ve sus cuotas mes por mes y sube el comprobante.",
      "Cuando usted confirma, a él le llega el aviso por correo.",
    ],
    piezas: <><PiezaEnlace /><PiezaPortalInquilino /><PiezaAvisoPropietario /></>,
  },
  {
    id: "contratos",
    titulo: "Cada ajuste, antes de que llegue.",
    bajada: "Cargue el contrato una vez. Alquia sabe cuándo se actualiza y por qué índice, y se lo muestra antes de que llegue.",
    datos: [
      "Ajustes por ICL, IPC, porcentaje o monto fijo.",
      "Un cambio de condiciones se programa desde el mes que corresponda.",
      "El contrato firmado queda guardado junto a sus datos.",
    ],
    piezas: <><PiezaContrato /><PiezaDocumento /></>,
  },
];

export default function Momentos() {
  return <section className="lp-seccion lp-stack" id="como-funciona" aria-labelledby="lp-stack-titulo">
    <div className="lp-wrap">
      <h2 id="lp-stack-titulo" className="lp-stack__titulo">Cómo funciona</h2>
      {MOMENTOS.map((momento) => <article className="lp-momento" key={momento.id} aria-labelledby={`lp-${momento.id}-titulo`}>
        <div className="lp-momento__texto">
          <h3 id={`lp-${momento.id}-titulo`}>{momento.titulo}</h3>
          <p>{momento.bajada}</p>
          <ul>
            {momento.datos.map((dato) => <li key={dato}><Icon name="check" size={18} />{dato}</li>)}
          </ul>
        </div>
        <div className="lp-momento__piezas">{momento.piezas}</div>
      </article>)}
    </div>
  </section>;
}
