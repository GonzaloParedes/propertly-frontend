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
    case "diaMayorA28":
      return `El contrato dice ${item.diaDelContrato ? `día ${item.diaDelContrato}` : "un día posterior al 28"}, pero Alquia llega hasta el 28 porque febrero no tiene más.`;
    case "punitorios":
      return "El recargo por atraso depende de una tasa del banco o combina varios cálculos, y Alquia todavía no puede calcularlo.";
    case "monedaDelDeposito":
      return `El depósito está en una moneda distinta a la del alquiler (${moneda === "USD" ? "dólares" : "pesos"}), y Alquia todavía no carga un depósito en otra moneda.`;
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
        <blockquote className={`owner-pdf-item__quote${noSePuede ? " owner-pdf-item__quote--siempre" : ""}`}>
          {item.citas.map((cita) => (
            <p key={`${cita.pagina}-${cita.texto}`}>«…{cita.texto}…»<cite>Página {cita.pagina}{cita.verificada ? "" : " · no pudimos comprobar la cita"}</cite></p>
          ))}
          {pagina && <button type="button" className="owner-pdf-item__page-link" onClick={() => onVerPagina(pagina)}>Ver página {pagina}</button>}
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

  function tarjeta(id: ItemId, valor: string, opciones: { detalle?: string; porQue?: string; editor?: React.ReactNode; acciones?: React.ReactNode; corregible?: boolean } = {}) {
    const item = lectura.items[id];
    const pendiente = pendientePor(id);
    // Abierto a la fuerza: lo que falta, lo que el servidor rechazó y el inquilino a elegir entre varios.
    const forzado = pendiente?.razon === "falta" || itemsConError.has(id) || (id === "inquilino" && item.noSePuede === "variosInquilinos" && pendiente !== undefined);
    const abierto = abiertos.has(id) || forzado;
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
        conError={itemsConError.has(id) && !["deposito", "comision", "punitorios", "garantias"].includes(id)}
        activo={activo === id}
        abierto={abierto}
        onVer={() => setActivo(activo === id ? null : id)}
        onVerPagina={setPaginaEnDialogo}
        onCorregir={opciones.corregible === false || !opciones.editor || forzado ? undefined : () => alternar(id)}
        onConfirmar={() => onRevisar(id)}
        acciones={opciones.acciones}
      >
        {opciones.editor}
      </Tarjeta>
    );
  }

  const b = borrador;
  const moneda = b.moneda;
  const decidido = (id: ItemId) => decisiones[id] !== undefined;

  // --- Las partes ---
  const direccion = [`${b.calle} ${b.numero}`.trim(), b.piso].filter(Boolean).join(", ");
  const propiedad = tarjeta("propiedad",
    b.propiedadId !== null ? existentes.propiedad ?? direccion : [direccion, b.ciudad].filter(Boolean).join(" · ") || "Sin cargar",
    {
      detalle: b.propiedadId !== null ? "Ya la tiene cargada: se usa esa, sin crear otra." : "Es nueva: la agregamos a sus propiedades.",
      editor: <div className="owner-wizard-stack">
        {lectura.coincidencias.propiedadId !== null && (
          <div className="owner-wizard-options" role="radiogroup" aria-label="Propiedad del contrato">
            <OptionCard selected={b.propiedadId !== null} title={existentes.propiedad ?? direccion} description="Ya la tiene cargada. Se usa esa." onClick={() => set({ propiedadId: lectura.coincidencias.propiedadId })} />
            <OptionCard selected={b.propiedadId === null} title="Crear una nueva" description="Con la dirección que figura en el contrato." onClick={() => set({ propiedadId: null })} />
          </div>
        )}
        {b.propiedadId === null && <>
          <label className="owner-wizard-field"><span>Calle</span><input value={b.calle} onChange={(e) => set({ calle: e.target.value })} /></label>
          <label className="owner-wizard-field"><span>Número</span><input inputMode="numeric" value={b.numero} onChange={(e) => set({ numero: e.target.value })} /></label>
          <label className="owner-wizard-field"><span>Piso y departamento</span><input placeholder="Si corresponde" value={b.piso} onChange={(e) => set({ piso: e.target.value })} /></label>
          <label className="owner-wizard-field"><span>Ciudad</span><input value={b.ciudad} onChange={(e) => set({ ciudad: e.target.value })} /></label>
          <label className="owner-wizard-field"><span>Provincia</span><input value={b.provincia} onChange={(e) => set({ provincia: e.target.value })} /></label>
          <label className="owner-wizard-field"><span>Código postal</span><input placeholder="Si lo sabe" value={b.codigoPostal} onChange={(e) => set({ codigoPostal: e.target.value })} /></label>
        </>}
      </div>,
    });

  const tipo = b.propiedadId === null && lectura.items.tipo.presente
    ? tarjeta("tipo", b.categoria ? etiquetaCategoria(b.categoria) : "Sin elegir", {
      porQue: "El contrato dice si es vivienda o comercial, pero no el tipo exacto. Elegimos el más probable: confírmelo o cámbielo.",
      editor: <div className="owner-wizard-options" role="radiogroup" aria-label="Tipo de propiedad">
        {CATEGORIAS.map((c) => <OptionCard key={c.valor} selected={b.categoria === c.valor} title={c.etiqueta} description={c.descripcion} onClick={() => set({ categoria: c.valor })} />)}
      </div>,
    })
    : null;

  const itemInquilino = lectura.items.inquilino;
  const inquilino = tarjeta("inquilino",
    b.inquilinoId !== null ? existentes.inquilino ?? `${b.nombre} ${b.apellido}`.trim() : `${b.nombre} ${b.apellido}`.trim() || "Sin cargar",
    {
      detalle: b.inquilinoId !== null ? "Ya lo tiene cargado: se usa ese, sin crear otro." : b.cuit ? `CUIT ${formatearCuit(b.cuit)} · Es nuevo: lo agregamos a sus inquilinos.` : undefined,
      porQue: itemInquilino.noSePuede ? explicacion(itemInquilino, moneda) : undefined,
      acciones: itemInquilino.noSePuede ? <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={onManual}>Cargarlo a mano</button> : undefined,
      editor: <div className="owner-wizard-stack">
        {lectura.coincidencias.inquilinoId !== null && (
          <div className="owner-wizard-options" role="radiogroup" aria-label="Inquilino del contrato">
            <OptionCard selected={b.inquilinoId !== null} title={existentes.inquilino ?? `${b.nombre} ${b.apellido}`.trim()} description="Ya lo tiene cargado. Se usa ese." onClick={() => set({ inquilinoId: lectura.coincidencias.inquilinoId })} />
            <OptionCard selected={b.inquilinoId === null} title="Crear uno nuevo" description="Con los datos que figuran en el contrato." onClick={() => set({ inquilinoId: null })} />
          </div>
        )}
        {b.inquilinoId === null && <>
          <label className="owner-wizard-field"><span>Nombre</span><input value={b.nombre} onChange={(e) => set({ nombre: e.target.value })} /></label>
          <label className="owner-wizard-field"><span>Apellido</span><input value={b.apellido} onChange={(e) => set({ apellido: e.target.value })} /></label>
          <label className="owner-wizard-field"><span>CUIT o CUIL</span><input inputMode="numeric" value={formatearCuit(b.cuit)} aria-invalid={b.cuit.length > 0 && !cuitValido(b.cuit)} onChange={(e) => set({ cuit: soloDigitos(e.target.value) })} /></label>
          {b.cuit.length > 0 && !cuitValido(b.cuit) && <p className="owner-wizard-error" role="alert">Ese CUIT no parece completo o tiene un número equivocado.</p>}
        </>}
      </div>,
    });

  const contacto = b.inquilinoId === null
    ? tarjeta("contacto", [b.correo, b.telefono].filter(Boolean).join(" · ") || "Sin cargar", {
      porQue: pendientePor("contacto") ? "El contrato no los trae. Los necesitamos para mandarle los avisos de vencimiento y el enlace para subir comprobantes." : undefined,
      editor: <div className="owner-wizard-stack">
        <label className="owner-wizard-field"><span>Correo electrónico</span><input type="email" placeholder="Ej: lucia@correo.com" value={b.correo} aria-invalid={b.correo.length > 0 && !correoValido(b.correo)} onChange={(e) => set({ correo: e.target.value })} /></label>
        {b.correo.length > 0 && !correoValido(b.correo) && <p className="owner-wizard-error" role="alert">Ese correo no parece completo.</p>}
        <label className="owner-wizard-field"><span>Teléfono</span><input type="tel" inputMode="tel" placeholder="Ej: 11 4455 2210" value={b.telefono} aria-invalid={b.telefono.length > 0 && !telefonoValido(b.telefono)} onChange={(e) => set({ telefono: e.target.value })} /></label>
        {b.telefono.length > 0 && !telefonoValido(b.telefono) && <p className="owner-wizard-error" role="alert">{errorDeTelefono(b.telefono)}</p>}
      </div>,
    })
    : null;

  // --- El alquiler ---
  const itemAlquiler = lectura.items.alquiler;
  const alquiler = tarjeta("alquiler", b.alquiler ? `${pesos(Number(b.alquiler), moneda)} por mes` : "Sin cargar", {
    porQue: itemAlquiler.noSePuede ? explicacion(itemAlquiler, moneda) : undefined,
    acciones: itemAlquiler.noSePuede ? <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={onManual}>Cargarlo a mano</button> : undefined,
    corregible: !itemAlquiler.noSePuede,
    editor: <div className="owner-wizard-stack">
      <label className="owner-wizard-field owner-wizard-field--amount"><span>{moneda === "USD" ? "US$" : "$"}</span><input inputMode="numeric" aria-label="Alquiler mensual" value={b.alquiler ? Number(b.alquiler).toLocaleString("es-AR") : ""} onChange={(e) => set({ alquiler: soloNumeros(e.target.value) })} /><span>por mes</span></label>
      <div className="owner-wizard-chips" role="group" aria-label="Moneda del alquiler">
        {([["ARS", "En pesos"], ["USD", "En dólares"]] as const).map(([valor, etiqueta]) => <button key={valor} type="button" aria-pressed={moneda === valor} onClick={() => set({ moneda: valor })}>{etiqueta}</button>)}
      </div>
    </div>,
  });

  const itemVencimiento = lectura.items.vencimiento;
  const vencimiento = tarjeta("vencimiento", b.dia ? `Día ${b.dia} de cada mes` : "Sin elegir", {
    porQue: itemVencimiento.noSePuede
      ? explicacion(itemVencimiento, moneda)
      : pendientePor("vencimiento")?.razon === "revisar" ? "Tomamos este día como vencimiento: desde el día siguiente la cuota figura como vencida." : undefined,
    detalle: decisiones.vencimiento === "usar28" && itemVencimiento.diaDelContrato ? `El contrato dice día ${itemVencimiento.diaDelContrato}; se carga el 28.` : undefined,
    corregible: !itemVencimiento.noSePuede,
    acciones: itemVencimiento.noSePuede ? <>
      {decisiones.vencimiento === undefined
        ? <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={() => onDecision("vencimiento", "usar28")}>Usar el día 28</button>
        : <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={() => onDecision("vencimiento", null)}>Deshacer</button>}
      <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={onManual}>Cargarlo a mano</button>
    </> : undefined,
    editor: <label className="owner-wizard-field owner-wizard-field--medium"><span>Día del mes (del 1 al 28)</span><input inputMode="numeric" value={b.dia} onChange={(e) => set({ dia: soloNumeros(e.target.value).slice(0, 2) })} /></label>,
  });

  const plazo = tarjeta("plazo",
    b.inicio && Number(b.plazo) > 0 ? `Del ${fechaCorta(b.inicio)} al ${fechaDeFin(b.inicio, Number(b.plazo))}` : "Sin cargar",
    {
      detalle: Number(b.plazo) > 0 ? `${b.plazo} meses` : undefined,
      editor: <div className="owner-wizard-stack">
        <label className="owner-wizard-field"><span>Empieza el</span><input type="date" value={b.inicio} onChange={(e) => set({ inicio: e.target.value })} /></label>
        <label className="owner-wizard-field owner-wizard-field--medium"><span>Dura (en meses)</span><input inputMode="numeric" value={b.plazo} onChange={(e) => set({ plazo: soloNumeros(e.target.value) })} /></label>
      </div>,
    });

  const itemActualizacion = lectura.items.actualizacion;
  const actualizacion = tarjeta("actualizacion", describirActualizacion(b), {
    porQue: itemActualizacion.noSePuede ? explicacion(itemActualizacion, moneda) : undefined,
    corregible: !itemActualizacion.noSePuede,
    acciones: itemActualizacion.noSePuede ? <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={onManual}>Cargarlo a mano</button> : undefined,
    editor: <div className="owner-wizard-stack">
      <div className="owner-wizard-chips" role="group" aria-label="Cómo se actualiza">
        {METODOS.map(({ valor, etiqueta }) => <button key={valor} type="button" aria-pressed={b.metodo === valor} onClick={() => set({ metodo: valor, valorDeActualizacion: valor === b.metodo ? b.valorDeActualizacion : "" })}>{etiqueta}</button>)}
      </div>
      {(b.metodo === "FIXED_PERCENTAGE" || b.metodo === "FIXED_AMOUNT") && (
        <label className="owner-wizard-field owner-wizard-field--amount"><span>{b.metodo === "FIXED_PERCENTAGE" ? "%" : "$"}</span><input inputMode="decimal" aria-label={b.metodo === "FIXED_PERCENTAGE" ? "Porcentaje de actualización" : "Monto de actualización"} value={b.valorDeActualizacion} onChange={(e) => set({ valorDeActualizacion: b.metodo === "FIXED_PERCENTAGE" ? soloDecimal(e.target.value) : soloNumeros(e.target.value) })} /></label>
      )}
      <label className="owner-wizard-field owner-wizard-field--medium"><span>Cada cuántos meses</span><input inputMode="numeric" value={b.frecuencia} onChange={(e) => set({ frecuencia: soloNumeros(e.target.value) })} /></label>
    </div>,
  });

  // --- También figura en el contrato ---
  const opcional = (id: GrupoDeCondiciones, extra: { sinSoporte?: Decision; boton?: string; resultado?: string } = {}) => {
    const item = lectura.items[id];
    if (!item.presente && !sumados.has(id)) return null;
    const sinSoporte = item.noSePuede !== null;
    return tarjeta(id, resumenDeGrupo(borrador.otras, id), {
      porQue: sinSoporte ? explicacion(item, moneda) : undefined,
      detalle: sinSoporte && extra.sinSoporte && decidido(id) ? extra.resultado : undefined,
      corregible: !sinSoporte,
      acciones: sinSoporte ? <>
        {extra.sinSoporte && (decisiones[id] === undefined
          ? <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={() => onDecision(id, extra.sinSoporte!)}>{extra.boton}</button>
          : <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={() => onDecision(id, null)}>Deshacer</button>)}
        <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={onManual}>Cargarlo a mano</button>
      </> : undefined,
      editor: <div className="owner-wizard-stack"><EditorDeGrupo grupo={id} value={borrador.otras} onChange={(otras) => set({ otras })} mostrarErrores erroresDelBackend={erroresDelBackend} /></div>,
    });
  };
  const deposito = opcional("deposito", { sinSoporte: "sinDeposito", boton: "Crear sin depósito", resultado: "El contrato se crea sin depósito." });
  const comision = opcional("comision");
  const punitorios = opcional("punitorios", { sinSoporte: "sinPunitorios", boton: "Crear sin punitorios", resultado: "El contrato se crea sin punitorios: ese dato no se carga." });
  const garantias = opcional("garantias");

  const itemOtro = lectura.items.otro;
  const otro = itemOtro.presente ? tarjeta("otro", "No se puede cargar así", {
    porQue: explicacion(itemOtro, moneda),
    corregible: false,
    acciones: <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={onManual}>Cargarlo a mano</button>,
  }) : null;

  const faltantes = GRUPOS.filter(({ grupo }) => !lectura.items[grupo].presente && !sumados.has(grupo));
  const hayTambien = [deposito, comision, punitorios, garantias, otro].some((x) => x !== null);
  const activoItem = activo ? lectura.items[activo] : null;

  return (
    <main className="owner-wizard__body owner-pdf-review">
      <div className="owner-pdf-review__intro">
        <h1>Revise lo que encontramos</h1>
        <p>
          {restantes === 0
            ? "Está todo listo. Si algo no coincide con su contrato, corríjalo antes de crearlo."
            : `Leímos el contrato y completamos lo que pudimos. ${restantes === 1 ? "Queda 1 cosa" : `Quedan ${restantes} cosas`} que necesitan su mirada: están marcadas.`}
        </p>
        {aviso}
      </div>

      {amplio && (
        <div className="owner-pdf-review__doc" aria-label="Vista del contrato">
          <PdfPageViewer cargar={cargar} pagina={activoItem?.citas[0]?.pagina ?? 1} nombre={nombreArchivo} />
          {activoItem && activoItem.citas.length > 0
            ? <blockquote className="owner-pdf-quote">
              {activoItem.citas.map((cita: Cita) => <p key={`${cita.pagina}-${cita.texto}`}>«…{cita.texto}…»<cite>Página {cita.pagina}</cite></p>)}
            </blockquote>
            : <p className="owner-pdf-quote owner-pdf-quote--hint">Elija «Ver en el contrato» en un dato para ver de qué página salió.</p>}
        </div>
      )}

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
            <div className="owner-wizard-chips" role="group" aria-label="Sumar una condición">
              {faltantes.map(({ grupo, titulo }) => <button key={grupo} type="button" onClick={() => { onSumar(grupo); setAbiertos((previos) => new Set(previos).add(grupo)); }}>Agregar: {titulo.toLowerCase()}</button>)}
            </div>
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
