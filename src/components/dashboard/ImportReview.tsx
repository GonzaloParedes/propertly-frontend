"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { FileSearch } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import Dialog from "@/components/ui/Dialog";
import PdfPageViewer from "@/components/dashboard/PdfPageViewer";
import { EditorDeGrupo } from "@/components/dashboard/OtrasCondiciones";
import { correoValido } from "@/lib/correo";
import { cuitValido, formatearCuit, soloDigitos } from "@/lib/cuit";
import { errorDeTelefono, telefonoValido } from "@/lib/telefono";
import { etiquetaCategoria, CATEGORIAS } from "@/lib/propiedad";
import { GRUPOS, resumenDeGrupo, soloDecimal, type GrupoDeCondiciones } from "@/lib/otras-condiciones";
import {
  type Borrador,
  type Cita,
  type Decision,
  type Decisiones,
  type ItemId,
  type ItemLeido,
  type Lectura,
  type MetodoDeActualizacion,
  type Pendiente,
} from "@/lib/importacion-pdf";

const pesos = (n: number, moneda: string) => `${moneda === "USD" ? "US$" : "$"} ${n.toLocaleString("es-AR")}`;
const soloNumeros = (texto: string) => texto.replace(/\D/g, "");
const fechaCorta = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });

/** Misma convención que el asistente: inicio + plazo en meses, sin restar el día. */
function fechaDeFin(inicioISO: string, meses: number): string {
  const [anio, mes, dia] = inicioISO.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1 + meses, dia)).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
}

function describirActualizacion(b: Borrador): string {
  if (b.metodo === null) return "Sin cargar";
  const cada = b.frecuencia ? ` · cada ${b.frecuencia} meses` : "";
  if (b.metodo === "FIXED_PERCENTAGE") return `${b.valorDeActualizacion.replace(".", ",") || "—"} %${cada}`;
  if (b.metodo === "FIXED_AMOUNT") return `${b.valorDeActualizacion ? pesos(Number(b.valorDeActualizacion), b.moneda) : "—"} más${cada}`;
  return `Según el ${b.metodo}${cada}`;
}

const METODOS: { valor: MetodoDeActualizacion; etiqueta: string }[] = [
  { valor: "FIXED_PERCENTAGE", etiqueta: "Un porcentaje" },
  { valor: "FIXED_AMOUNT", etiqueta: "Un monto fijo" },
  { valor: "ICL", etiqueta: "Según el ICL" },
  { valor: "IPC", etiqueta: "Según el IPC" },
];

/** Qué se le explica al propietario de cada cláusula que la app no carga tal cual, y qué puede hacer. */
function explicacion(item: ItemLeido, moneda: string): string {
  switch (item.noSePuede) {
    case "variosInquilinos":
      return "El contrato tiene más de un inquilino y Alquia carga uno por contrato. Indique abajo cuál es el inquilino de este contrato.";
    case "alquilerEscalonado":
      return "El contrato fija alquileres distintos para cada período, y Alquia todavía no carga alquileres escalonados.";
    case "indice":
      return "El contrato se actualiza con un índice que Alquia no usa: sólo trabaja con el ICL, el IPC o un porcentaje fijo.";
    case "diaMayorA28": {
      const dia = item.diaDelContrato ? `día ${item.diaDelContrato}` : "un día posterior al 28";
      return `El contrato dice ${dia}, pero Alquia llega hasta el 28 porque febrero no tiene más.`;
    }
    case "punitorios":
      return "El recargo por atraso depende de una tasa del banco o combina varios cálculos, y Alquia todavía no puede calcularlo.";
    case "monedaDelDeposito": {
      const delAlquiler = moneda === "USD" ? "dólares" : "pesos";
      return `El depósito está en una moneda distinta a la del alquiler (${delAlquiler}), y Alquia todavía no carga un depósito en otra moneda.`;
    }
    default:
      return "Hay una cláusula que Alquia todavía no sabe cargar tal como está escrita.";
  }
}

const TITULO_DE_ITEM: Record<ItemId, string> = {
  propiedad: "Propiedad",
  tipo: "Tipo de propiedad",
  inquilino: "Inquilino",
  contacto: "Correo y teléfono del inquilino",
  alquiler: "Alquiler inicial",
  vencimiento: "Vencimiento",
  plazo: "Plazo",
  actualizacion: "Actualización",
  deposito: "Depósito en garantía",
  comision: "Comisión de la inmobiliaria",
  punitorios: "Punitorios",
  garantias: "Garantías",
  otro: "Otra cláusula",
};

const ANCHO_AMPLIO = "(min-width: 901px)";

/** Con lugar para mostrar el documento al lado de los datos. Sin `matchMedia` (en pruebas) se asume que sí. */
function useAnchoAmplio(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const consulta = window.matchMedia(ANCHO_AMPLIO);
      consulta.addEventListener("change", avisar);
      return () => consulta.removeEventListener("change", avisar);
    },
    () => (typeof window.matchMedia === "function" ? window.matchMedia(ANCHO_AMPLIO).matches : true),
    () => true
  );
}

function OptionCard({ selected, title, description, onClick }: Readonly<{ selected: boolean; title: string; description: string; onClick: () => void }>) {
  return (
    <button type="button" className="owner-wizard-option" role="radio" aria-checked={selected} onClick={onClick}>
      <span><b>{title}</b><small>{description}</small></span>
      <span className="owner-wizard-option__check"><Icon name="check" /></span>
    </button>
  );
}

interface TarjetaProps {
  id: ItemId;
  valor: string;
  detalle?: string;
  item: ItemLeido;
  pendiente: Pendiente | undefined;
  revisado: boolean;
  conError: boolean;
  activo: boolean;
  abierto: boolean;
  /** El texto que explica por qué hay que mirarlo. */
  porQue?: string;
  onVer: () => void;
  onVerPagina: (pagina: number) => void;
  onCorregir?: () => void;
  onConfirmar: () => void;
  children?: React.ReactNode;
  acciones?: React.ReactNode;
}

/**
 * Un dato leído. Dice siempre su estado con un ícono y una palabra, de qué página salió, y sólo pide
 * trabajo en lo que la lectura no pudo dar por seguro. Todo es de sólo lectura hasta «Corregir».
 */
function Tarjeta({ id, valor, detalle, item, pendiente, revisado, conError, activo, abierto, porQue, onVer, onVerPagina, onCorregir, onConfirmar, children, acciones }: Readonly<TarjetaProps>) {
  const razon = pendiente?.razon;
  const noSePuede = item.estado === "noSePuede";
  const pagina = item.citas[0]?.pagina;
  let estado: React.ReactNode;
  if (razon === "noSePuede") estado = <span className="owner-status owner-status--bad"><Icon name="alert" size={15} />No se puede cargar así</span>;
  else if (razon === "falta") estado = <span className="owner-status owner-status--info"><Icon name="edit" size={15} />Falta completar</span>;
  else if (razon === "revisar") estado = <span className="owner-status owner-status--warn"><Icon name="alert" size={15} />Revisar</span>;
  else if (item.estado === "falta" && !noSePuede) estado = <span className="owner-pdf-item__source"><Icon name="check" size={15} />Completado</span>;
  else if (noSePuede || revisado || item.estado === "revisar") estado = <span className="owner-pdf-item__source"><Icon name="check" size={15} />Revisado</span>;
  else estado = <span className="owner-pdf-item__source"><Icon name="check" size={15} />{pagina ? `Página ${pagina}` : "Del contrato"}</span>;

  return (
    <article className="owner-pdf-item" aria-label={TITULO_DE_ITEM[id]} data-estado={razon ?? "ok"} data-activo={activo || undefined}>
      <div className="owner-pdf-item__head">
        <span className="owner-pdf-item__label">{TITULO_DE_ITEM[id]}</span>
        {estado}
      </div>
      <b className="owner-pdf-item__value">{valor}</b>
      {detalle && <small className="owner-pdf-item__detail">{detalle}</small>}
      {porQue && <p className="owner-pdf-item__why">{porQue}</p>}
      {razon === "revisar" && item.motivos.map((motivo) => <p key={motivo} className="owner-pdf-item__why">{motivo}</p>)}
      {razon === "revisar" && item.nota && <p className="owner-pdf-item__why">{item.nota}</p>}
      {conError && <p className="owner-wizard-error" role="alert">Revise este dato.</p>}
      {(activo || noSePuede) && item.citas.length > 0 && (
        <blockquote className={noSePuede ? "owner-pdf-item__quote owner-pdf-item__quote--siempre" : "owner-pdf-item__quote"}>
          {item.citas.map((cita) => (
            <p key={`${cita.pagina}-${cita.texto}`}>«…{cita.texto}…»<cite>Página {cita.pagina}{cita.verificada ? "" : " · no pudimos comprobar la cita"}</cite></p>
          ))}
          {pagina !== undefined && <button type="button" className="owner-pdf-item__page-link" onClick={() => onVerPagina(pagina)}>Ver página {pagina}</button>}
        </blockquote>
      )}
      {abierto && children && <div className="owner-pdf-item__edit">{children}</div>}
      <div className="owner-pdf-item__actions">
        {item.citas.length > 0 && !noSePuede && (
          <button type="button" className="owner-button owner-button--secondary owner-button--small" aria-pressed={activo} onClick={onVer}>
            <FileSearch aria-hidden="true" size={17} />{activo ? "Ocultar en el contrato" : "Ver en el contrato"}
          </button>
        )}
        {onCorregir && (
          <button type="button" className="owner-button owner-button--secondary owner-button--small" aria-expanded={abierto} onClick={onCorregir}>
            {abierto ? <><Icon name="check" size={17} />Listo</> : <><Icon name="edit" size={17} />Corregir</>}
          </button>
        )}
        {razon === "revisar" && !abierto && (
          <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={onConfirmar}>
            <Icon name="check" size={17} />Está bien así
          </button>
        )}
        {acciones}
      </div>
    </article>
  );
}

export interface ImportReviewProps {
  lectura: Lectura;
  nombreArchivo: string;
  borrador: Borrador;
  onBorrador: (borrador: Borrador) => void;
  decisiones: Decisiones;
  onDecision: (id: ItemId, decision: Decision | null) => void;
  revisados: ReadonlySet<ItemId>;
  onRevisar: (id: ItemId) => void;
  sumados: ReadonlySet<ItemId>;
  onSumar: (id: ItemId) => void;
  pendientes: Pendiente[];
  /** Cuántas cosas quedan por resolver en total, contando las que no son de un dato (como las cuotas anteriores). */
  restantes: number;
  /** Los datos que el servidor rechazó, para marcarlos. */
  itemsConError: ReadonlySet<ItemId>;
  erroresDelBackend: Record<string, string>;
  /** Cómo se llaman la propiedad y el inquilino que el propietario ya tiene, si coinciden con el contrato. */
  existentes: { propiedad: string | null; inquilino: string | null };
  /** Trae el PDF subido; se llama una sola vez. */
  cargarDocumento: () => Promise<Blob>;
  onManual: () => void;
  /** Un aviso general, por ejemplo cuando el servidor no pudo crear el contrato. */
  aviso?: React.ReactNode;
  /** La pregunta de las cuotas anteriores a hoy, cuando corresponde. */
  antesDeCrear?: React.ReactNode;
}

/** El botón chico de las acciones de una tarjeta. */
function BotonChico({ onClick, children }: Readonly<{ onClick: () => void; children: React.ReactNode }>) {
  return <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={onClick}>{children}</button>;
}

/** «Usar el día 28» / «Crear sin depósito» mientras no se decidió, y «Deshacer» después. */
function BotonDeDecision({ decidido, etiqueta, onDecidir, onDeshacer }: Readonly<{
  decidido: boolean;
  etiqueta: string | undefined;
  onDecidir: () => void;
  onDeshacer: () => void;
}>) {
  return decidido
    ? <BotonChico onClick={onDeshacer}>Deshacer</BotonChico>
    : <BotonChico onClick={onDecidir}>{etiqueta}</BotonChico>;
}

type Opciones = { detalle?: string; porQue?: string; editor?: React.ReactNode; acciones?: React.ReactNode; corregible?: boolean };

/** Lo que cada tarjeta necesita saber de la pantalla para armarse. */
interface Contexto {
  lectura: Lectura;
  b: Borrador;
  moneda: string;
  decisiones: Decisiones;
  sumados: ReadonlySet<ItemId>;
  existentes: ImportReviewProps["existentes"];
  erroresDelBackend: Record<string, string>;
  tarjeta: (id: ItemId, valor: string, opciones?: Opciones) => React.ReactNode;
  pendientePor: (id: ItemId) => Pendiente | undefined;
  set: (cambio: Partial<Borrador>) => void;
  onDecision: (id: ItemId, decision: Decision | null) => void;
  onManual: () => void;
}

/** El botón para cargar a mano lo que la app no puede cargar tal cual. */
const cargarAMano = (ctx: Contexto, noSePuede: boolean) =>
  noSePuede ? <BotonChico onClick={ctx.onManual}>Cargarlo a mano</BotonChico> : undefined;

function tarjetaDePropiedad({ lectura, b, existentes, tarjeta, set }: Contexto) {
  const direccion = [`${b.calle} ${b.numero}`.trim(), b.piso].filter(Boolean).join(", ");
  const usaLaExistente = b.propiedadId !== null;
  const valor = usaLaExistente ? existentes.propiedad ?? direccion : [direccion, b.ciudad].filter(Boolean).join(" · ") || "Sin cargar";
  return tarjeta("propiedad", valor, {
    detalle: usaLaExistente ? "Ya la tiene cargada: se usa esa, sin crear otra." : "Es nueva: la agregamos a sus propiedades.",
    editor: <div className="owner-wizard-stack">
      {lectura.coincidencias.propiedadId !== null && (
        <div className="owner-wizard-options" role="radiogroup" aria-label="Propiedad del contrato">
          <OptionCard selected={usaLaExistente} title={existentes.propiedad ?? direccion} description="Ya la tiene cargada. Se usa esa." onClick={() => set({ propiedadId: lectura.coincidencias.propiedadId })} />
          <OptionCard selected={!usaLaExistente} title="Crear una nueva" description="Con la dirección que figura en el contrato." onClick={() => set({ propiedadId: null })} />
        </div>
      )}
      {!usaLaExistente && <>
        <label className="owner-wizard-field"><span>Calle</span><input value={b.calle} onChange={(e) => set({ calle: e.target.value })} /></label>
        <label className="owner-wizard-field"><span>Número</span><input inputMode="numeric" value={b.numero} onChange={(e) => set({ numero: e.target.value })} /></label>
        <label className="owner-wizard-field"><span>Piso y departamento</span><input placeholder="Si corresponde" value={b.piso} onChange={(e) => set({ piso: e.target.value })} /></label>
        <label className="owner-wizard-field"><span>Ciudad</span><input value={b.ciudad} onChange={(e) => set({ ciudad: e.target.value })} /></label>
        <label className="owner-wizard-field"><span>Provincia</span><input value={b.provincia} onChange={(e) => set({ provincia: e.target.value })} /></label>
        <label className="owner-wizard-field"><span>Código postal</span><input placeholder="Si lo sabe" value={b.codigoPostal} onChange={(e) => set({ codigoPostal: e.target.value })} /></label>
      </>}
    </div>,
  });
}

function tarjetaDeTipo({ lectura, b, tarjeta, set }: Contexto) {
  if (b.propiedadId !== null || !lectura.items.tipo.presente) return null;
  return tarjeta("tipo", b.categoria ? etiquetaCategoria(b.categoria) : "Sin elegir", {
    porQue: "El contrato dice si es vivienda o comercial, pero no el tipo exacto. Elegimos el más probable: confírmelo o cámbielo.",
    editor: <div className="owner-wizard-options" role="radiogroup" aria-label="Tipo de propiedad">
      {CATEGORIAS.map((c) => <OptionCard key={c.valor} selected={b.categoria === c.valor} title={c.etiqueta} description={c.descripcion} onClick={() => set({ categoria: c.valor })} />)}
    </div>,
  });
}

function detalleDeInquilino(b: Borrador): string | undefined {
  if (b.inquilinoId !== null) return "Ya lo tiene cargado: se usa ese, sin crear otro.";
  return b.cuit ? `CUIT ${formatearCuit(b.cuit)} · Es nuevo: lo agregamos a sus inquilinos.` : undefined;
}

function tarjetaDeInquilino(ctx: Contexto) {
  const { lectura, b, existentes, moneda, tarjeta, set } = ctx;
  const item = lectura.items.inquilino;
  const nombreCompleto = `${b.nombre} ${b.apellido}`.trim();
  const usaElExistente = b.inquilinoId !== null;
  return tarjeta("inquilino", usaElExistente ? existentes.inquilino ?? nombreCompleto : nombreCompleto || "Sin cargar", {
    detalle: detalleDeInquilino(b),
    porQue: item.noSePuede ? explicacion(item, moneda) : undefined,
    acciones: cargarAMano(ctx, item.noSePuede !== null),
    editor: <div className="owner-wizard-stack">
      {lectura.coincidencias.inquilinoId !== null && (
        <div className="owner-wizard-options" role="radiogroup" aria-label="Inquilino del contrato">
          <OptionCard selected={usaElExistente} title={existentes.inquilino ?? nombreCompleto} description="Ya lo tiene cargado. Se usa ese." onClick={() => set({ inquilinoId: lectura.coincidencias.inquilinoId })} />
          <OptionCard selected={!usaElExistente} title="Crear uno nuevo" description="Con los datos que figuran en el contrato." onClick={() => set({ inquilinoId: null })} />
        </div>
      )}
      {!usaElExistente && <>
        <label className="owner-wizard-field"><span>Nombre</span><input value={b.nombre} onChange={(e) => set({ nombre: e.target.value })} /></label>
        <label className="owner-wizard-field"><span>Apellido</span><input value={b.apellido} onChange={(e) => set({ apellido: e.target.value })} /></label>
        <label className="owner-wizard-field"><span>CUIT o CUIL</span><input inputMode="numeric" value={formatearCuit(b.cuit)} aria-invalid={b.cuit.length > 0 && !cuitValido(b.cuit)} onChange={(e) => set({ cuit: soloDigitos(e.target.value) })} /></label>
        {b.cuit.length > 0 && !cuitValido(b.cuit) && <p className="owner-wizard-error" role="alert">Ese CUIT no parece completo o tiene un número equivocado.</p>}
      </>}
    </div>,
  });
}

function tarjetaDeContacto({ b, tarjeta, pendientePor, set }: Contexto) {
  if (b.inquilinoId !== null) return null;
  return tarjeta("contacto", [b.correo, b.telefono].filter(Boolean).join(" · ") || "Sin cargar", {
    porQue: pendientePor("contacto") ? "El contrato no los trae. Los necesitamos para mandarle los avisos de vencimiento y el enlace para subir comprobantes." : undefined,
    editor: <div className="owner-wizard-stack">
      <label className="owner-wizard-field"><span>Correo electrónico</span><input type="email" placeholder="Ej: lucia@correo.com" value={b.correo} aria-invalid={b.correo.length > 0 && !correoValido(b.correo)} onChange={(e) => set({ correo: e.target.value })} /></label>
      {b.correo.length > 0 && !correoValido(b.correo) && <p className="owner-wizard-error" role="alert">Ese correo no parece completo.</p>}
      <label className="owner-wizard-field"><span>Teléfono</span><input type="tel" inputMode="tel" placeholder="Ej: 11 4455 2210" value={b.telefono} aria-invalid={b.telefono.length > 0 && !telefonoValido(b.telefono)} onChange={(e) => set({ telefono: e.target.value })} /></label>
      {b.telefono.length > 0 && !telefonoValido(b.telefono) && <p className="owner-wizard-error" role="alert">{errorDeTelefono(b.telefono)}</p>}
    </div>,
  });
}

function tarjetaDeAlquiler(ctx: Contexto) {
  const { lectura, b, moneda, tarjeta, set } = ctx;
  const item = lectura.items.alquiler;
  return tarjeta("alquiler", b.alquiler ? `${pesos(Number(b.alquiler), moneda)} por mes` : "Sin cargar", {
    porQue: item.noSePuede ? explicacion(item, moneda) : undefined,
    acciones: cargarAMano(ctx, item.noSePuede !== null),
    corregible: !item.noSePuede,
    editor: <div className="owner-wizard-stack">
      <label className="owner-wizard-field owner-wizard-field--amount"><span>{moneda === "USD" ? "US$" : "$"}</span><input inputMode="numeric" aria-label="Alquiler mensual" value={b.alquiler ? Number(b.alquiler).toLocaleString("es-AR") : ""} onChange={(e) => set({ alquiler: soloNumeros(e.target.value) })} /><span>por mes</span></label>
      <fieldset className="owner-fieldset owner-wizard-chips">
        <legend className="sr-only">Moneda del alquiler</legend>
        {([["ARS", "En pesos"], ["USD", "En dólares"]] as const).map(([valor, etiqueta]) => <button key={valor} type="button" aria-pressed={moneda === valor} onClick={() => set({ moneda: valor })}>{etiqueta}</button>)}
      </fieldset>
    </div>,
  });
}

function porQueDelVencimiento(item: ItemLeido, pendiente: Pendiente | undefined, moneda: string): string | undefined {
  if (item.noSePuede) return explicacion(item, moneda);
  return pendiente?.razon === "revisar" ? "Tomamos este día como vencimiento: desde el día siguiente la cuota figura como vencida." : undefined;
}

function tarjetaDeVencimiento(ctx: Contexto) {
  const { lectura, b, moneda, decisiones, tarjeta, pendientePor, set, onDecision } = ctx;
  const item = lectura.items.vencimiento;
  const sinSoporte = item.noSePuede !== null;
  return tarjeta("vencimiento", b.dia ? `Día ${b.dia} de cada mes` : "Sin elegir", {
    porQue: porQueDelVencimiento(item, pendientePor("vencimiento"), moneda),
    detalle: decisiones.vencimiento === "usar28" && item.diaDelContrato ? `El contrato dice día ${item.diaDelContrato}; se carga el 28.` : undefined,
    corregible: !sinSoporte,
    acciones: sinSoporte ? <>
      <BotonDeDecision decidido={decisiones.vencimiento !== undefined} etiqueta="Usar el día 28" onDecidir={() => onDecision("vencimiento", "usar28")} onDeshacer={() => onDecision("vencimiento", null)} />
      <BotonChico onClick={ctx.onManual}>Cargarlo a mano</BotonChico>
    </> : undefined,
    editor: <label className="owner-wizard-field owner-wizard-field--medium"><span>Día del mes (del 1 al 28)</span><input inputMode="numeric" value={b.dia} onChange={(e) => set({ dia: soloNumeros(e.target.value).slice(0, 2) })} /></label>,
  });
}

function tarjetaDePlazo({ b, tarjeta, set }: Contexto) {
  return tarjeta("plazo",
    b.inicio && Number(b.plazo) > 0 ? `Del ${fechaCorta(b.inicio)} al ${fechaDeFin(b.inicio, Number(b.plazo))}` : "Sin cargar",
    {
      detalle: Number(b.plazo) > 0 ? `${b.plazo} meses` : undefined,
      editor: <div className="owner-wizard-stack">
        <label className="owner-wizard-field"><span>Empieza el</span><input type="date" value={b.inicio} onChange={(e) => set({ inicio: e.target.value })} /></label>
        <label className="owner-wizard-field owner-wizard-field--medium"><span>Dura (en meses)</span><input inputMode="numeric" value={b.plazo} onChange={(e) => set({ plazo: soloNumeros(e.target.value) })} /></label>
      </div>,
    });
}

function tarjetaDeActualizacion(ctx: Contexto) {
  const { lectura, b, moneda, tarjeta, set } = ctx;
  const item = lectura.items.actualizacion;
  const esPorcentaje = b.metodo === "FIXED_PERCENTAGE";
  return tarjeta("actualizacion", describirActualizacion(b), {
    porQue: item.noSePuede ? explicacion(item, moneda) : undefined,
    corregible: !item.noSePuede,
    acciones: cargarAMano(ctx, item.noSePuede !== null),
    editor: <div className="owner-wizard-stack">
      <fieldset className="owner-fieldset owner-wizard-chips">
        <legend className="sr-only">Cómo se actualiza</legend>
        {METODOS.map(({ valor, etiqueta }) => <button key={valor} type="button" aria-pressed={b.metodo === valor} onClick={() => set({ metodo: valor, valorDeActualizacion: valor === b.metodo ? b.valorDeActualizacion : "" })}>{etiqueta}</button>)}
      </fieldset>
      {(esPorcentaje || b.metodo === "FIXED_AMOUNT") && (
        <label className="owner-wizard-field owner-wizard-field--amount"><span>{esPorcentaje ? "%" : "$"}</span><input inputMode="decimal" aria-label={esPorcentaje ? "Porcentaje de actualización" : "Monto de actualización"} value={b.valorDeActualizacion} onChange={(e) => set({ valorDeActualizacion: esPorcentaje ? soloDecimal(e.target.value) : soloNumeros(e.target.value) })} /></label>
      )}
      <label className="owner-wizard-field owner-wizard-field--medium"><span>Cada cuántos meses</span><input inputMode="numeric" value={b.frecuencia} onChange={(e) => set({ frecuencia: soloNumeros(e.target.value) })} /></label>
    </div>,
  });
}

/** Depósito, comisión, punitorios y garantías: sólo aparecen si el contrato los trae o el propietario los sumó. */
function tarjetaOpcional(ctx: Contexto, id: GrupoDeCondiciones, extra: { sinSoporte?: Decision; boton?: string; resultado?: string } = {}) {
  const { lectura, b, moneda, decisiones, sumados, erroresDelBackend, tarjeta, set, onDecision } = ctx;
  const item = lectura.items[id];
  if (!item.presente && !sumados.has(id)) return null;
  const sinSoporte = item.noSePuede !== null;
  const decidido = decisiones[id] !== undefined;
  return tarjeta(id, resumenDeGrupo(b.otras, id), {
    porQue: sinSoporte ? explicacion(item, moneda) : undefined,
    detalle: sinSoporte && extra.sinSoporte && decidido ? extra.resultado : undefined,
    corregible: !sinSoporte,
    acciones: sinSoporte ? <>
      {extra.sinSoporte && (
        <BotonDeDecision decidido={decidido} etiqueta={extra.boton} onDecidir={() => onDecision(id, extra.sinSoporte!)} onDeshacer={() => onDecision(id, null)} />
      )}
      <BotonChico onClick={ctx.onManual}>Cargarlo a mano</BotonChico>
    </> : undefined,
    editor: <div className="owner-wizard-stack"><EditorDeGrupo grupo={id} value={b.otras} onChange={(otras) => set({ otras })} mostrarErrores erroresDelBackend={erroresDelBackend} /></div>,
  });
}

function tarjetaDeOtraClausula(ctx: Contexto) {
  const { lectura, moneda, tarjeta } = ctx;
  const item = lectura.items.otro;
  if (!item.presente) return null;
  return tarjeta("otro", "No se puede cargar así", {
    porQue: explicacion(item, moneda),
    corregible: false,
    acciones: <BotonChico onClick={ctx.onManual}>Cargarlo a mano</BotonChico>,
  });
}

function textoDeRestantes(restantes: number): string {
  if (restantes === 0) return "Está todo listo. Si algo no coincide con su contrato, corríjalo antes de crearlo.";
  const cuantas = restantes === 1 ? "Queda 1 cosa" : `Quedan ${restantes} cosas`;
  return `Leímos el contrato y completamos lo que pudimos. ${cuantas} que necesitan su mirada: están marcadas.`;
}

/** El PDF al costado de los datos, con la cita del dato que se está mirando. */
function VistaDelContrato({ cargar, nombreArchivo, item }: Readonly<{
  cargar: () => Promise<Blob>;
  nombreArchivo: string;
  item: ItemLeido | null;
}>) {
  return (
    <div className="owner-pdf-review__doc" aria-label="Vista del contrato">
      <PdfPageViewer cargar={cargar} pagina={item?.citas[0]?.pagina ?? 1} nombre={nombreArchivo} />
      {item && item.citas.length > 0
        ? <blockquote className="owner-pdf-quote">
          {item.citas.map((cita: Cita) => <p key={`${cita.pagina}-${cita.texto}`}>«…{cita.texto}…»<cite>Página {cita.pagina}</cite></p>)}
        </blockquote>
        : <p className="owner-pdf-quote owner-pdf-quote--hint">Elija «Ver en el contrato» en un dato para ver de qué página salió.</p>}
    </div>
  );
}

/** Lo que está abierto a la fuerza: lo que falta, lo que el servidor rechazó y el inquilino a elegir entre varios. */
function estaForzado(id: ItemId, item: ItemLeido, pendiente: Pendiente | undefined, itemsConError: ReadonlySet<ItemId>): boolean {
  if (pendiente?.razon === "falta" || itemsConError.has(id)) return true;
  return id === "inquilino" && item.noSePuede === "variosInquilinos" && pendiente !== undefined;
}

/** Estos grupos ya marcan su error dentro de su propio editor. */
const GRUPOS_CON_ERROR_PROPIO: ReadonlySet<ItemId> = new Set(["deposito", "comision", "punitorios", "garantias"]);

export default function ImportReview({
  lectura, nombreArchivo, borrador, onBorrador, decisiones, onDecision, revisados, onRevisar, sumados, onSumar,
  pendientes, restantes, itemsConError, erroresDelBackend, existentes, cargarDocumento, onManual, aviso, antesDeCrear,
}: Readonly<ImportReviewProps>) {
  const amplio = useAnchoAmplio();
  const [abiertos, setAbiertos] = useState<ReadonlySet<ItemId>>(new Set());
  const [activo, setActivo] = useState<ItemId | null>(null);
  const [paginaEnDialogo, setPaginaEnDialogo] = useState<number | null>(null);

  // El PDF se pide una sola vez, aunque lo muestren el costado y el diálogo.
  const descarga = useRef<Promise<Blob> | null>(null);
  const cargar = useCallback(() => {
    descarga.current ??= cargarDocumento();
    return descarga.current;
  }, [cargarDocumento]);

  const set = (cambio: Partial<Borrador>) => onBorrador({ ...borrador, ...cambio });
  const pendientePor = (id: ItemId) => pendientes.find((p) => p.id === id);
  const alternar = (id: ItemId) => {
    const abierto = abiertos.has(id);
    setAbiertos((previos) => {
      const siguiente = new Set(previos);
      if (abierto) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
    // Corregir también cuenta como haberlo mirado.
    if (abierto) onRevisar(id);
  };

  function tarjeta(id: ItemId, valor: string, opciones: Opciones = {}) {
    const item = lectura.items[id];
    const pendiente = pendientePor(id);
    const forzado = estaForzado(id, item, pendiente, itemsConError);
    const corregible = opciones.corregible !== false && !!opciones.editor && !forzado;
    return (
      <Tarjeta
        key={id}
        id={id}
        valor={valor}
        detalle={opciones.detalle}
        porQue={opciones.porQue}
        item={item}
        pendiente={pendiente}
        revisado={revisados.has(id)}
        conError={itemsConError.has(id) && !GRUPOS_CON_ERROR_PROPIO.has(id)}
        activo={activo === id}
        abierto={abiertos.has(id) || forzado}
        onVer={() => setActivo(activo === id ? null : id)}
        onVerPagina={setPaginaEnDialogo}
        onCorregir={corregible ? () => alternar(id) : undefined}
        onConfirmar={() => onRevisar(id)}
        acciones={opciones.acciones}
      >
        {opciones.editor}
      </Tarjeta>
    );
  }

  const ctx: Contexto = {
    lectura, b: borrador, moneda: borrador.moneda, decisiones, sumados, existentes, erroresDelBackend,
    tarjeta, pendientePor, set, onDecision, onManual,
  };
  const propiedad = tarjetaDePropiedad(ctx);
  const tipo = tarjetaDeTipo(ctx);
  const inquilino = tarjetaDeInquilino(ctx);
  const contacto = tarjetaDeContacto(ctx);
  const alquiler = tarjetaDeAlquiler(ctx);
  const vencimiento = tarjetaDeVencimiento(ctx);
  const plazo = tarjetaDePlazo(ctx);
  const actualizacion = tarjetaDeActualizacion(ctx);

  // --- También figura en el contrato ---
  const deposito = tarjetaOpcional(ctx, "deposito", { sinSoporte: "sinDeposito", boton: "Crear sin depósito", resultado: "El contrato se crea sin depósito." });
  const comision = tarjetaOpcional(ctx, "comision");
  const punitorios = tarjetaOpcional(ctx, "punitorios", { sinSoporte: "sinPunitorios", boton: "Crear sin punitorios", resultado: "El contrato se crea sin punitorios: ese dato no se carga." });
  const garantias = tarjetaOpcional(ctx, "garantias");
  const otro = tarjetaDeOtraClausula(ctx);

  const faltantes = GRUPOS.filter(({ grupo }) => !lectura.items[grupo].presente && !sumados.has(grupo));
  const hayTambien = [deposito, comision, punitorios, garantias, otro].some((x) => x !== null);

  return (
    <main className="owner-wizard__body owner-pdf-review">
      <div className="owner-pdf-review__intro">
        <h1>Revise lo que encontramos</h1>
        <p>{textoDeRestantes(restantes)}</p>
        {aviso}
      </div>

      {amplio && <VistaDelContrato cargar={cargar} nombreArchivo={nombreArchivo} item={activo ? lectura.items[activo] : null} />}

      <div className="owner-pdf-review__data">
        <h2 className="owner-pdf-group">Las partes</h2>
        <div className="owner-pdf-list">{propiedad}{tipo}{inquilino}{contacto}</div>

        <h2 className="owner-pdf-group">El alquiler</h2>
        <div className="owner-pdf-list">{alquiler}{vencimiento}{plazo}{actualizacion}</div>

        {(hayTambien || faltantes.length > 0) && <h2 className="owner-pdf-group">También figura en el contrato</h2>}
        {hayTambien && <div className="owner-pdf-list">{deposito}{comision}{punitorios}{garantias}{otro}</div>}
        {faltantes.length > 0 && (
          <div className="owner-pdf-add">
            <p className="owner-wizard-help">¿Hay algo más que el contrato no menciona y quiera cargar?</p>
            <fieldset className="owner-fieldset owner-wizard-chips">
              <legend className="sr-only">Sumar una condición</legend>
              {faltantes.map(({ grupo, titulo }) => <button key={grupo} type="button" onClick={() => { onSumar(grupo); setAbiertos((previos) => new Set(previos).add(grupo)); }}>Agregar: {titulo.toLowerCase()}</button>)}
            </fieldset>
          </div>
        )}

        {antesDeCrear}
      </div>

      {paginaEnDialogo !== null && (
        <Dialog title={`Página ${paginaEnDialogo} del contrato`} onClose={() => setPaginaEnDialogo(null)}>
          <div className="owner-dialog__body"><PdfPageViewer cargar={cargar} pagina={paginaEnDialogo} nombre={nombreArchivo} /></div>
        </Dialog>
      )}
    </main>
  );
}
