import { Icon, type IconName } from "@/components/ui/Icon";
import "@/app/tenant-portal/tenant-portal.css";

/*
 * Piezas de la app, armadas con las mismas clases que usa el panel
 * (`owner-*`, de OwnerWorkspace.css) y el portal del inquilino (`tenant-*`).
 * No son capturas ni dibujos: si la app cambia su CSS, la landing cambia con
 * ella. Los datos son los de la demo de /prototipo.
 *
 * Son vistas, no controles: los botones van como <span> para que no reciban
 * foco ni parezcan tocables, y cada pieza se describe una sola vez para lector
 * de pantalla en su <figcaption>.
 */

type Tono = "ok" | "warn" | "bad" | "info";

const ICONO_DE_ESTADO: Record<string, readonly [Tono, IconName]> = {
  Pagada: ["ok", "check"],
  Vigente: ["ok", "check"],
  "A vencer": ["warn", "clock"],
  Vencida: ["bad", "x"],
  "Pago a confirmar": ["info", "clock"],
};

function Estado({ children }: Readonly<{ children: keyof typeof ICONO_DE_ESTADO }>) {
  const [tono, icono] = ICONO_DE_ESTADO[children];
  return <span className={`owner-status owner-status--${tono}`}><Icon name={icono} size={15} />{children}</span>;
}

function BotonVisto({ children }: Readonly<{ children: string }>) {
  return <span className="owner-button owner-button--secondary owner-button--small">{children}</span>;
}

function Pieza({ descripcion, rotulo, className = "", children }: Readonly<{ descripcion: string; rotulo?: string; className?: string; children: React.ReactNode }>) {
  return <figure className={`lp-pieza ${className}`}>
    {rotulo && <p className="lp-pieza__rotulo" aria-hidden="true">{rotulo}</p>}
    <div aria-hidden="true">{children}</div>
    <figcaption className="sr-only">{descripcion}</figcaption>
  </figure>;
}

function AvisoDePago() {
  return <article className="owner-notice owner-notice--info">
    <span className="owner-notice__icon"><Icon name="card" /></span>
    <div><strong>Marta Suárez cargó un pago y espera su confirmación</strong><p>Lavalle 950, 3.º B · $ 520.000</p></div>
    <div className="owner-notice__action"><BotonVisto>Revisar</BotonVisto></div>
  </article>;
}

/** Inicio del propietario: la cobranza del mes y el aviso que pide su acción. */
export function PiezaInicio() {
  return <Pieza className="lp-pieza--inicio" descripcion="El Inicio de Alquia: $ 430.000 cobrados de $ 1.933.691 emitidos este mes, con lo que falta por vencer y lo vencido, y un aviso de que Marta Suárez cargó un pago que espera su confirmación.">
    <section className="owner-portfolio">
      <div className="owner-portfolio__money">
        <p className="owner-eyebrow">COBRANZA DEL MES</p>
        <strong>$ 430.000</strong>
        <p>de $ 1.933.691 emitidos · 1 de 4 cuotas cobradas</p>
        <div className="owner-meter"><i className="owner-meter__ok" style={{ flexGrow: 430000 }} /><i className="owner-meter__warn" style={{ flexGrow: 505000 }} /><i className="owner-meter__bad" style={{ flexGrow: 998691 }} /></div>
        <div className="owner-key"><span><Icon name="check" />Cobrado <b>$ 430.000</b></span><span><Icon name="clock" />A vencer <b>$ 505.000</b></span><span><Icon name="x" />Vencido <b>$ 998.691</b></span></div>
      </div>
    </section>
    <div className="lp-pieza__superpuesta"><AvisoDePago /></div>
  </Pieza>;
}

const CUOTAS = [
  { direccion: "Belgrano 445, PB", inquilino: "Ana Ferreyra", monto: "$ 430.000", estado: "Pagada" },
  { direccion: "Lavalle 950, 3.º B", inquilino: "Marta Suárez", monto: "$ 520.000", estado: "Pago a confirmar" },
  { direccion: "Colón 2255, 4.º D", inquilino: "Diego Ferrari", monto: "$ 505.000", estado: "A vencer" },
  { direccion: "Rivadavia 2340, 5.º A", inquilino: "Jorge Paletta", monto: "$ 478.691", estado: "Vencida" },
] as const;

/** Las cuotas del mes, una por propiedad, con su estado. */
export function PiezaCobranzas() {
  return <Pieza descripcion="Cuatro cuotas del mes: Belgrano 445 pagada, Lavalle 950 con un pago a confirmar, Colón 2255 a vencer y Rivadavia 2340 vencida.">
    <div className="owner-list">
      {CUOTAS.map((cuota) => <div className="owner-row" key={cuota.direccion}>
        <span className="owner-row__icon"><Icon name="building" /></span>
        <span className="owner-row__body"><b>{cuota.direccion}</b><small>{cuota.inquilino}</small></span>
        <span className="owner-row__amount"><b>{cuota.monto}</b><small>cuota</small></span>
        <Estado>{cuota.estado}</Estado>
      </div>)}
    </div>
  </Pieza>;
}

const MESES = [
  { nombre: "Junio", estado: "Pagada", tono: "ok" },
  { nombre: "Julio", estado: "Pagada", tono: "ok" },
  { nombre: "Agosto", estado: "Pago a confirmar", tono: "info" },
  { nombre: "Septiembre", estado: "A vencer", tono: "warn" },
] as const;

/** Lo que ve el inquilino al abrir su enlace. */
export function PiezaPortalInquilino() {
  return <Pieza className="lp-pieza--portal" rotulo="Lo que ve Marta, desde su enlace" descripcion="El portal del inquilino: sus cuotas mes por mes. Junio y julio pagadas, agosto con el pago a confirmar y septiembre a vencer.">
    <div className="tenant-calendar">
      <div className="tenant-calendar__months">
        {MESES.map((mes) => <span className={`tenant-calendar__month tenant-calendar__month--${mes.tono}`} key={mes.nombre}>
          <span className="tenant-calendar__month-name">{mes.nombre}</span>
          <span className="tenant-calendar__status"><span className="tenant-calendar__dot" />{mes.estado}</span>
        </span>)}
      </div>
    </div>
  </Pieza>;
}

/** Lo que ve el propietario cuando el inquilino sube un comprobante. */
export function PiezaAvisoPropietario() {
  return <Pieza className="lp-pieza--aviso" rotulo="Lo que ve usted, en su panel" descripcion="El aviso que recibe el propietario en su panel: Marta Suárez cargó un pago de $ 520.000 y espera su confirmación.">
    <AvisoDePago />
  </Pieza>;
}

/** El resumen de un contrato, con su próxima actualización. */
export function PiezaContrato() {
  return <Pieza descripcion="Un contrato de $ 478.691 por mes, vigente, que vence el día 10. Empezó el 01/05/2025, se actualiza el 01/11/2026 por ICL cada 6 meses y termina el 30/04/2028.">
    <div className="owner-card">
      <div className="owner-card__top">
        <div><p className="owner-eyebrow">ALQUILER ACTUAL</p><strong className="owner-detail-money">$ 478.691</strong><small>por mes · vence el día 10</small></div>
        <Estado>Vigente</Estado>
      </div>
      <div className="owner-timeline">
        <div><span><Icon name="calendar" /></span><p><b>Inicio del contrato</b><small>01/05/2025</small></p></div>
        <div><span><Icon name="trend" /></span><p><b>Próxima actualización</b><small>01/11/2026 · Ajusta por ICL cada 6 meses</small></p></div>
        <div><span><Icon name="calendar" /></span><p><b>Fin previsto</b><small>30/04/2028</small></p></div>
      </div>
    </div>
  </Pieza>;
}

/** El aviso de cuotas vencidas, tal como aparece en Inicio. */
export function PiezaVencidas() {
  return <Pieza descripcion="Un aviso en el panel: 2 cuotas vencidas sin pago, $ 998.691 en total, la más antigua venció hace 9 días.">
    <article className="owner-notice owner-notice--bad">
      <span className="owner-notice__icon"><Icon name="x" /></span>
      <div><strong>2 cuotas vencidas sin pago</strong><p>$ 998.691 en total. La más antigua venció hace 9 días.</p></div>
      <div className="owner-notice__action"><BotonVisto>Ver</BotonVisto></div>
    </article>
  </Pieza>;
}

/** El acceso del inquilino, desde el detalle del contrato. */
export function PiezaEnlace() {
  return <Pieza rotulo="En el contrato, el acceso de Marta" descripcion="El acceso de pago del contrato con Marta Suárez: un enlace para comprobantes que se copia o se reenvía por correo. El inquilino sube sus comprobantes desde ahí, sin cuenta.">
    <div className="owner-card">
      <div className="owner-tenant-card"><span className="owner-row__icon"><Icon name="users" /></span><div><b>Marta Suárez</b><small>marta.suarez@correo.com</small></div></div>
      <div className="owner-link-box">
        <div><Icon name="link" /><span><b>Enlace para comprobantes</b><small>El inquilino sube sus comprobantes desde ahí, sin cuenta.</small></span></div>
        <div className="owner-link-actions"><BotonVisto>Copiar enlace</BotonVisto><BotonVisto>Reenviar por correo</BotonVisto></div>
      </div>
    </div>
  </Pieza>;
}

/** El contrato firmado, adjunto a su ficha. */
export function PiezaDocumento() {
  return <Pieza descripcion="El contrato firmado adjunto a la ficha: contrato-rivadavia-2340.pdf, listo para descargar.">
    <div className="owner-card">
      <h2>Documento firmado</h2>
      <div className="owner-document">
        <span><Icon name="file" /></span>
        <div><b>contrato-rivadavia-2340.pdf</b><small>PDF · 1,2 MB</small></div>
        <span className="owner-button owner-button--quiet owner-button--small"><Icon name="download" size={16} />Descargar</span>
      </div>
    </div>
  </Pieza>;
}
