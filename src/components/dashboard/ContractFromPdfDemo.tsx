"use client";

/**
 * Alta de contrato desde el PDF firmado, SIMULADA. Es lo que se ve en /prototipo, para las revisiones de
 * diseño: no hay backend detrás. El flujo real, que lee el PDF de verdad, es `ContractFromPdf`.
 *
 * La lectura del documento está simulada —sea cual sea el PDF, devuelve el
 * contrato de ejemplo de abajo— y guardar no llama a nada. Sirve para mirar y
 * discutir el diseño; la propuesta completa, con las preguntas abiertas, está
 * en `docs/design/propuesta-contrato-desde-pdf.md`.
 *
 * El recorrido son dos pasos: subir el archivo (con la espera de la lectura
 * adentro) y revisar lo que se encontró. La revisión no es un formulario: es un
 * resumen donde cada dato dice de qué cláusula salió, y sólo pide trabajo en lo
 * que la lectura no pudo dar por seguro.
 */

import { useEffect, useRef, useState } from "react";
import { FileSearch, FileUp } from "lucide-react";
import Counter from "@/components/ui/Counter";
import { Spinner } from "@/components/ui/Spinner";
import { Icon as AppIcon, type IconName } from "@/components/ui/Icon";
import { correoValido } from "@/lib/correo";
import { errorDeTelefono, telefonoValido } from "@/lib/telefono";

function Icon({ name, size = 22 }: Readonly<{ name: IconName; size?: number }>) {
  return <AppIcon name={name} size={size} />;
}

type Fase = "subir" | "leyendo" | "fallo" | "revisar";
type Metodo = "FIXED_PERCENTAGE" | "ICL" | "IPC";
type Archivo = { nombre: string; bytes: number; paginas: number | null };

/** Lo que el backend acepta para el documento del contrato, más un techo razonable. */
const MAX_BYTES = 20 * 1024 * 1024;

const EJEMPLO: Archivo = { nombre: "Contrato Colón 2255 - Benítez.pdf", bytes: 1_840_000, paginas: 6 };

// Cada campo que la lectura llena, con el fragmento del contrato del que salió.
// El id es el mismo que marca el fragmento en la vista del documento.
type CampoId = "propiedad" | "inquilino" | "contacto" | "alquiler" | "vencimiento" | "plazo" | "actualizacion" | "deposito";

const FUENTES: Record<Exclude<CampoId, "contacto">, { clausula: string; cita: string }> = {
  propiedad: { clausula: "Cláusula PRIMERA", cita: "el inmueble ubicado en Colón 2255, piso 4.º, departamento «D», Vicente López" },
  inquilino: { clausula: "Encabezado", cita: "Lucía Benítez, CUIT 27-33456789-9, en adelante «LA LOCATARIA»" },
  alquiler: { clausula: "Cláusula TERCERA", cita: "la suma de pesos cuatrocientos cincuenta mil ($ 450.000) mensuales" },
  vencimiento: { clausula: "Cláusula TERCERA", cita: "pagaderos por mes adelantado del 1 al 10 de cada mes" },
  plazo: { clausula: "Cláusula SEGUNDA", cita: "treinta y seis (36) meses, a contar desde el 1.º de marzo de 2025" },
  actualizacion: { clausula: "Cláusula CUARTA", cita: "cada cuatro (4) meses según la variación del Índice de Precios al Consumidor (IPC)" },
  deposito: { clausula: "Cláusula QUINTA", cita: "una suma equivalente a un (1) mes de alquiler, en efectivo" },
};

// Las mismas dos de `PROPIEDADES_DEMO` del asistente: la del contrato coincide
// con una que el propietario ya tiene cargada.
const PROPIEDADES = [
  { id: -1, titulo: "Mitre 78", detalle: "Local comercial · San Isidro" },
  { id: -2, titulo: "Colón 2255, 4.º D", detalle: "Departamento · Vicente López" },
];

const PASOS_LECTURA = ["Las partes del contrato", "La propiedad", "El alquiler y las fechas", "Cómo se actualiza"];

function formatearBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`;
}

const pesos = (n: number) => `$ ${n.toLocaleString("es-AR")}`;
const soloNumeros = (s: string) => s.replace(/\D/g, "");

/** Misma convención que `fechaDeFin` del asistente: startDate + termMonths, sin restar el día. */
function fechaDeFin(inicioISO: string, meses: number): string {
  const [anio, mes, dia] = inicioISO.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1 + meses, dia)).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
}
const fechaCorta = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });

/** Cuántas cuotas ya vencieron antes de hoy, contando desde el mes de inicio. */
function cuotasVencidas(inicioISO: string, diaVencimiento: number, hoy = new Date()): number {
  const [anio, mes] = inicioISO.split("-").map(Number);
  let n = (hoy.getFullYear() - anio) * 12 + (hoy.getMonth() + 1 - mes);
  if (hoy.getDate() > diaVencimiento) n += 1;
  return Math.max(0, n);
}

function describirActualizacion(metodo: Metodo, porcentaje: string, frecuencia: number): string {
  if (metodo === "FIXED_PERCENTAGE") return `${porcentaje || "—"} % cada ${frecuencia} meses`;
  return `Según el ${metodo} · cada ${frecuencia} meses`;
}

export default function ContractFromPdfDemo({ demo, onBack, onManual, onClose, onComplete }: Readonly<{
  demo: boolean;
  onBack: () => void;
  onManual: () => void;
  onClose: () => void;
  onComplete: () => void;
}>) {
  const [fase, setFase] = useState<Fase>("subir");
  const [archivo, setArchivo] = useState<Archivo | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [leidos, setLeidos] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Lo que «encontró» la lectura. Arranca con los valores del contrato de
  // ejemplo y el propietario lo corrige en la revisión.
  const [propiedadId, setPropiedadId] = useState<number | "nueva">(-2);
  const [nombre, setNombre] = useState("Lucía Benítez");
  const [cuit, setCuit] = useState("27-33456789-9");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [alquiler, setAlquiler] = useState("450000");
  const [diaVencimiento, setDiaVencimiento] = useState(10);
  const [inicio, setInicio] = useState("2025-03-01");
  const [plazo, setPlazo] = useState(36);
  const [metodo, setMetodo] = useState<Metodo>("IPC");
  const [porcentaje, setPorcentaje] = useState("");
  const [frecuencia, setFrecuencia] = useState(4);
  const [deposito, setDeposito] = useState("450000");
  const [anteriores, setAnteriores] = useState<"cobradas" | "pendientes" | null>(null);

  // Los dos datos que la lectura dedujo en vez de leer tal cual: hasta que el
  // propietario los mira, no se puede guardar.
  const [aRevisar, setARevisar] = useState<Set<CampoId>>(() => new Set(["vencimiento", "deposito"]));
  const [editando, setEditando] = useState<CampoId | null>(null);
  const [activo, setActivo] = useState<CampoId | null>(null);

  // La lectura simulada: un paso por vez, para que la espera diga qué está
  // pasando. Un archivo con «ilegible» en el nombre muestra el caso de falla.
  useEffect(() => {
    if (fase !== "leyendo") return;
    if (leidos >= PASOS_LECTURA.length) {
      const t = setTimeout(() => setFase(archivo?.nombre.toLowerCase().includes("ilegible") ? "fallo" : "revisar"), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLeidos((n) => n + 1), 900);
    return () => clearTimeout(t);
  }, [fase, leidos, archivo]);

  function elegirArchivo(file: File | undefined) {
    if (!file) return;
    setErrorArchivo(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return setErrorArchivo("Ese archivo no es un PDF. Si tiene el contrato en papel, escanéelo y guárdelo como PDF.");
    }
    if (file.size > MAX_BYTES) {
      return setErrorArchivo(`El archivo pesa ${formatearBytes(file.size)}. El máximo es 20 MB.`);
    }
    setArchivo({ nombre: file.name, bytes: file.size, paginas: null });
  }

  function leer() { setLeidos(0); setFase("leyendo"); }

  function marcarRevisado(id: CampoId) {
    setARevisar((s) => { const n = new Set(s); n.delete(id); return n; });
  }

  // Corregir un dato también cuenta como haberlo revisado.
  function alternarEdicion(id: CampoId) {
    if (editando === id) { setEditando(null); marcarRevisado(id); return; }
    setEditando(id);
  }

  function verEnContrato(id: CampoId) {
    const nuevo = activo === id ? null : id;
    setActivo(nuevo);
    if (!nuevo) return;
    const mark = document.querySelector(`.owner-pdf-paper [data-campo="${id}"]`);
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mark?.scrollIntoView({ block: "center", behavior: suave ? "smooth" : "auto" });
  }

  const contactoOk = correoValido(correo) && telefonoValido(telefono);
  const vencidas = cuotasVencidas(inicio, diaVencimiento);
  const pendientes = aRevisar.size + (contactoOk ? 0 : 1) + (vencidas > 0 && anteriores === null ? 1 : 0);

  async function crear() {
    setGuardando(true);
    // Sin backend todavía: la espera es sólo para mostrar el botón ocupado.
    await new Promise((r) => setTimeout(r, demo ? 900 : 0));
    onComplete();
  }

  const paso = fase === "revisar" ? 2 : 1;

  return (
    <section className="owner-wizard owner-pdf" aria-label="Asistente de nuevo contrato desde el PDF">
      <header className="owner-wizard__top">
        <button type="button" aria-label="Salir del asistente" onClick={onClose} disabled={guardando}><Icon name="x" /></button>
        <b>Nuevo contrato</b>
        <progress className="owner-wizard__progress" value={paso} max={2} aria-label="Progreso del asistente" />
        <span>Paso {paso} de 2</span>
      </header>

      {fase === "subir" && (
        <main className="owner-wizard__body">
          <h1>Suba el contrato firmado</h1>
          <p>Lo leemos y completamos los datos por usted. Antes de guardar le mostramos todo lo que encontramos, para que lo revise.</p>
          {archivo ? (
            <div className="owner-pdf-file">
              <span><Icon name="file" /></span>
              <div>
                <b>{archivo.nombre}</b>
                <small>PDF · {formatearBytes(archivo.bytes)}{archivo.paginas ? ` · ${archivo.paginas} páginas` : ""}</small>
              </div>
              <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={() => { setArchivo(null); input.current?.click(); }}>Cambiar</button>
            </div>
          ) : (
            <div
              className="owner-pdf-drop"
              data-arrastrando={arrastrando || undefined}
              onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(e) => { e.preventDefault(); setArrastrando(false); elegirArchivo(e.dataTransfer.files[0]); }}
            >
              <span className="owner-pdf-drop__icon"><FileUp aria-hidden="true" size={28} /></span>
              <b>Arrastre el PDF hasta acá</b>
              <small>o</small>
              <button type="button" className="owner-button owner-button--secondary" onClick={() => input.current?.click()}>Elegir el archivo</button>
              <small>Sirve también un contrato escaneado. Hasta 20 MB.</small>
            </div>
          )}
          <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} aria-hidden="true"
            onChange={(e) => { elegirArchivo(e.target.files?.[0]); e.target.value = ""; }} />
          {errorArchivo && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{errorArchivo}</p>}
          {demo && !archivo && (
            <button type="button" className="owner-wizard-quiet" onClick={() => setArchivo(EJEMPLO)}>
              <Icon name="file" />¿No tiene uno a mano? Usar un contrato de ejemplo
            </button>
          )}
          <aside className="owner-wizard-note owner-pdf-note">
            <Icon name="paperclip" />
            <span>El PDF queda guardado dentro del contrato, para tenerlo a mano cuando lo necesite. Sólo lo usamos para leer estos datos.</span>
          </aside>
          {demo && <small className="owner-wizard-help">Demo: sea cual sea el PDF, se muestran los datos de un contrato de ejemplo.</small>}
        </main>
      )}

      {fase === "leyendo" && (
        <main className="owner-wizard__body owner-pdf-reading" aria-busy="true">
          <span className="owner-pdf-reading__spin"><Spinner /></span>
          <h1>Leyendo el contrato…</h1>
          <p>Tarda menos de un minuto. No hace falta que se quede mirando.</p>
          <ol aria-live="polite">
            {PASOS_LECTURA.map((texto, i) => {
              const estado = i < leidos ? "listo" : i === leidos ? "ahora" : "despues";
              return (
                <li key={texto} data-estado={estado}>
                  <span aria-hidden="true">{estado === "listo" ? <Icon name="check" size={17} /> : null}</span>
                  {texto}
                  <span className="sr-only">{estado === "listo" ? ": listo" : estado === "ahora" ? ": buscando" : ""}</span>
                </li>
              );
            })}
          </ol>
        </main>
      )}

      {fase === "fallo" && (
        <main className="owner-wizard__body">
          <h1>No pudimos leer este documento</h1>
          <p>Pasa con escaneos borrosos, fotos torcidas o archivos protegidos con contraseña. Puede probar con otra copia, o cargar el contrato a mano.</p>
          <div className="owner-wizard-options">
            <button type="button" className="owner-wizard-option" onClick={() => { setArchivo(null); setFase("subir"); }}>
              <span className="owner-wizard-option__icon"><FileUp aria-hidden="true" size={22} /></span>
              <span><b>Probar con otro archivo</b><small>Una versión más nítida, o el PDF original si lo tiene.</small></span>
            </button>
            <button type="button" className="owner-wizard-option" onClick={onManual}>
              <span className="owner-wizard-option__icon"><Icon name="edit" /></span>
              <span><b>Cargarlo a mano</b><small>Le pedimos los datos de a uno, en 7 pasos.</small></span>
            </button>
          </div>
        </main>
      )}

      {fase === "revisar" && (
        <main className="owner-wizard__body owner-pdf-review">
          <div className="owner-pdf-review__intro">
            <h1>Revise lo que encontramos</h1>
            <p>
              {pendientes === 0
                ? "Está todo listo. Si algo no coincide con su contrato, corríjalo antes de crearlo."
                : `Leímos el contrato y completamos casi todo. ${pendientes === 1 ? "Queda 1 cosa" : `Quedan ${pendientes} cosas`} que necesitan su mirada: están marcadas.`}
            </p>
          </div>

          <div className="owner-pdf-review__doc" aria-label="Vista del contrato">
            <ContractPaper activo={activo} archivo={archivo ?? EJEMPLO} />
          </div>

          <div className="owner-pdf-review__data">
            <h2 className="owner-pdf-group">Las partes</h2>
            <div className="owner-pdf-list">
              <Item id="propiedad" etiqueta="Propiedad" activo={activo} editando={editando} aRevisar={aRevisar} onVer={verEnContrato} onEditar={alternarEdicion} onOk={marcarRevisado}
                valor={propiedadId === "nueva" ? "Colón 2255, 4.º D · Vicente López" : PROPIEDADES.find((p) => p.id === propiedadId)?.titulo ?? ""}
                detalle={propiedadId === "nueva" ? "Es nueva: la agregamos a sus propiedades como departamento." : "Coincide con una propiedad que ya tiene cargada."}>
                <div className="owner-wizard-options" role="radiogroup" aria-label="Propiedad del contrato">
                  {PROPIEDADES.map((p) => (
                    <OptionCard key={p.id} selected={propiedadId === p.id} title={p.titulo} description={p.detalle} onClick={() => setPropiedadId(p.id)} />
                  ))}
                  <OptionCard selected={propiedadId === "nueva"} title="Es otra: agregarla" description="Con la dirección del contrato, como departamento." onClick={() => setPropiedadId("nueva")} />
                </div>
              </Item>
              <Item id="inquilino" etiqueta="Inquilino" activo={activo} editando={editando} aRevisar={aRevisar} onVer={verEnContrato} onEditar={alternarEdicion} onOk={marcarRevisado}
                valor={nombre} detalle={`CUIT ${cuit} · Es nuevo: lo agregamos a sus inquilinos.`}>
                <div className="owner-wizard-stack">
                  <label className="owner-wizard-field"><span>Nombre y apellido</span><input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
                  <label className="owner-wizard-field"><span>CUIT o CUIL</span><input inputMode="numeric" value={cuit} onChange={(e) => setCuit(e.target.value)} /></label>
                </div>
              </Item>
              <article className="owner-pdf-item" data-estado={contactoOk ? "ok" : "falta"}>
                <div className="owner-pdf-item__head">
                  <span className="owner-pdf-item__label">Correo y teléfono del inquilino</span>
                  {!contactoOk && <span className="owner-status owner-status--info"><Icon name="edit" size={15} />Falta completar</span>}
                </div>
                <p className="owner-pdf-item__why">El contrato no los trae. Los necesitamos para mandarle los avisos de vencimiento y el enlace para subir comprobantes.</p>
                <div className="owner-wizard-stack">
                  <label className="owner-wizard-field"><span>Correo electrónico</span><input type="email" placeholder="Ej: lucia@correo.com" value={correo} aria-invalid={correo.length > 0 && !correoValido(correo)} onChange={(e) => setCorreo(e.target.value)} /></label>
                  {correo.length > 0 && !correoValido(correo) && <p className="owner-wizard-error" role="alert">Ese correo no parece completo.</p>}
                  <label className="owner-wizard-field"><span>Teléfono</span><input type="tel" inputMode="tel" placeholder="Ej: 11 4455 2210" value={telefono} aria-invalid={telefono.length > 0 && !telefonoValido(telefono)} onChange={(e) => setTelefono(e.target.value)} /></label>
                  {telefono.length > 0 && !telefonoValido(telefono) && <p className="owner-wizard-error" role="alert">{errorDeTelefono(telefono)}</p>}
                </div>
              </article>
            </div>

            <h2 className="owner-pdf-group">El alquiler</h2>
            <div className="owner-pdf-list">
              <Item id="alquiler" etiqueta="Alquiler inicial" activo={activo} editando={editando} aRevisar={aRevisar} onVer={verEnContrato} onEditar={alternarEdicion} onOk={marcarRevisado}
                valor={`${pesos(Number(alquiler))} por mes`}>
                <label className="owner-wizard-field owner-wizard-field--amount"><span>$</span><input inputMode="numeric" aria-label="Alquiler mensual" value={Number(alquiler).toLocaleString("es-AR")} onChange={(e) => setAlquiler(soloNumeros(e.target.value))} /><span>por mes</span></label>
              </Item>
              <Item id="vencimiento" etiqueta="Vencimiento" activo={activo} editando={editando} aRevisar={aRevisar} onVer={verEnContrato} onEditar={alternarEdicion} onOk={marcarRevisado}
                valor={`Día ${diaVencimiento} de cada mes`}
                motivo="El contrato dice «del 1 al 10 de cada mes». Tomamos el día 10 como vencimiento: desde el 11 la cuota figura como vencida.">
                <Counter value={diaVencimiento} unit="del mes" min={1} max={28} onChange={setDiaVencimiento} />
              </Item>
              <Item id="plazo" etiqueta="Plazo" activo={activo} editando={editando} aRevisar={aRevisar} onVer={verEnContrato} onEditar={alternarEdicion} onOk={marcarRevisado}
                valor={`Del ${fechaCorta(inicio)} al ${fechaDeFin(inicio, plazo)}`} detalle={`${plazo} meses`}>
                <label className="owner-wizard-field"><span>Empieza el</span><input type="date" value={inicio} min="2022-12-01" onChange={(e) => e.target.value && setInicio(e.target.value)} /></label>
                <Counter value={plazo} unit="meses" min={1} onChange={setPlazo} />
              </Item>
              <Item id="actualizacion" etiqueta="Actualización" activo={activo} editando={editando} aRevisar={aRevisar} onVer={verEnContrato} onEditar={alternarEdicion} onOk={marcarRevisado}
                valor={describirActualizacion(metodo, porcentaje, frecuencia)}>
                <div className="owner-wizard-chips" role="group" aria-label="Cómo se actualiza">
                  {([["FIXED_PERCENTAGE", "Un porcentaje"], ["ICL", "Según el ICL"], ["IPC", "Según el IPC"]] as const).map(([v, t]) => (
                    <button key={v} type="button" aria-pressed={metodo === v} onClick={() => setMetodo(v)}>{t}</button>
                  ))}
                </div>
                {metodo === "FIXED_PERCENTAGE" && <label className="owner-wizard-field"><span>Porcentaje</span><input inputMode="decimal" placeholder="Ej. 8" value={porcentaje} onChange={(e) => setPorcentaje(e.target.value.replace(/[^\d.]/g, ""))} /></label>}
                <div className="owner-wizard-chips" role="group" aria-label="Cada cuánto">
                  {[3, 4, 6, 12].map((m) => <button key={m} type="button" aria-pressed={frecuencia === m} onClick={() => setFrecuencia(m)}>Cada {m} meses</button>)}
                </div>
              </Item>
            </div>

            <h2 className="owner-pdf-group">También figura en el contrato</h2>
            <div className="owner-pdf-list">
              <Item id="deposito" etiqueta="Depósito en garantía" activo={activo} editando={editando} aRevisar={aRevisar} onVer={verEnContrato} onEditar={alternarEdicion} onOk={marcarRevisado}
                valor={`${pesos(Number(deposito))} en efectivo`}
                motivo="El contrato no dice un monto: dice «un mes de alquiler». Lo calculamos con el alquiler inicial.">
                <label className="owner-wizard-field owner-wizard-field--amount"><span>$</span><input inputMode="numeric" aria-label="Depósito" value={Number(deposito).toLocaleString("es-AR")} onChange={(e) => setDeposito(soloNumeros(e.target.value))} /></label>
              </Item>
            </div>

            {vencidas > 0 && (<>
              <h2 className="owner-pdf-group">Antes de crearlo</h2>
              <div className="owner-pdf-list">
                <article className="owner-pdf-item" data-estado={anteriores ? "ok" : "falta"}>
                  <div className="owner-pdf-item__head">
                    <span className="owner-pdf-item__label">Cuotas anteriores a hoy</span>
                    {!anteriores && <span className="owner-status owner-status--info"><Icon name="edit" size={15} />Falta elegir</span>}
                  </div>
                  <b className="owner-pdf-item__value">{vencidas} {vencidas === 1 ? "cuota ya vencida" : "cuotas ya vencidas"}</b>
                  <p className="owner-pdf-item__why">El contrato empezó el {fechaCorta(inicio)}. Al crearlo, Alquia arma todas las cuotas desde esa fecha. ¿Las que ya vencieron las cobró, o quedan como deuda del inquilino?</p>
                  <div className="owner-wizard-options" role="radiogroup" aria-label="Cuotas anteriores a hoy">
                    <OptionCard selected={anteriores === "cobradas"} title="Sí, darlas por cobradas" description="Quedan pagadas. El inquilino no arrastra deuda ni recibe avisos por ellas." onClick={() => setAnteriores("cobradas")} />
                    <OptionCard selected={anteriores === "pendientes"} title="No todas: quedan como deuda" description="Quedan vencidas y el inquilino recibe los avisos. Las que sí cobró las marca en Cobranzas." onClick={() => setAnteriores("pendientes")} />
                  </div>
                </article>
              </div>
            </>)}
          </div>
        </main>
      )}

      <footer className="owner-wizard__footer">
        {fase === "subir" && <>
          <button type="button" className="owner-wizard-quiet" onClick={onBack}>Atrás</button>
          <button type="button" className="owner-wizard-next" disabled={!archivo} onClick={leer}>Leer el contrato <Icon name="arrow" /></button>
        </>}
        {fase === "leyendo" && <button type="button" className="owner-wizard-quiet" onClick={() => setFase("subir")}>Cancelar</button>}
        {fase === "fallo" && <button type="button" className="owner-wizard-quiet" onClick={() => setFase("subir")}>Atrás</button>}
        {fase === "revisar" && <>
          <button type="button" className="owner-wizard-quiet" onClick={() => setFase("subir")} disabled={guardando}>Atrás</button>
          {pendientes > 0 && <span className="owner-pdf-pending" aria-live="polite">{pendientes === 1 ? "Queda 1 por resolver" : `Quedan ${pendientes} por resolver`}</span>}
          <button type="button" className="owner-wizard-next" disabled={pendientes > 0 || guardando} onClick={() => void crear()} aria-busy={guardando || undefined}>
            {guardando ? <><Spinner />Guardando…</> : "Crear contrato"}
          </button>
        </>}
      </footer>
    </section>
  );
}

/**
 * Un dato encontrado. Sin marca, es algo que el contrato dice tal cual; con
 * «Revisar», algo que la lectura tuvo que interpretar y por eso pide que el
 * propietario lo mire. Todo se puede corregir, también lo que salió seguro.
 */
function Item({ id, etiqueta, valor, detalle, motivo, activo, editando, aRevisar, onVer, onEditar, onOk, children }: Readonly<{
  id: Exclude<CampoId, "contacto">;
  etiqueta: string;
  valor: string;
  detalle?: string;
  motivo?: string;
  activo: CampoId | null;
  editando: CampoId | null;
  aRevisar: Set<CampoId>;
  onVer: (id: CampoId) => void;
  onEditar: (id: CampoId) => void;
  onOk: (id: CampoId) => void;
  children: React.ReactNode;
}>) {
  const revisar = aRevisar.has(id);
  const abierto = editando === id;
  const fuente = FUENTES[id];
  return (
    <article className="owner-pdf-item" data-estado={revisar ? "revisar" : "ok"} data-activo={activo === id || undefined}>
      <div className="owner-pdf-item__head">
        <span className="owner-pdf-item__label">{etiqueta}</span>
        {revisar
          ? <span className="owner-status owner-status--warn"><Icon name="alert" size={15} />Revisar</span>
          : <span className="owner-pdf-item__source"><Icon name="check" size={15} />{fuente.clausula}</span>}
      </div>
      <b className="owner-pdf-item__value">{valor}</b>
      {detalle && <small className="owner-pdf-item__detail">{detalle}</small>}
      {motivo && revisar && <p className="owner-pdf-item__why">{motivo}</p>}
      {activo === id && <blockquote className="owner-pdf-item__quote">«…{fuente.cita}…»<cite>{fuente.clausula}</cite></blockquote>}
      {abierto && <div className="owner-pdf-item__edit">{children}</div>}
      <div className="owner-pdf-item__actions">
        <button type="button" className="owner-button owner-button--secondary owner-button--small" aria-pressed={activo === id} onClick={() => onVer(id)}>
          <FileSearch aria-hidden="true" size={17} />{activo === id ? "Ocultar en el contrato" : "Ver en el contrato"}
        </button>
        <button type="button" className="owner-button owner-button--secondary owner-button--small" aria-expanded={abierto} onClick={() => onEditar(id)}>
          {abierto ? <><Icon name="check" size={17} />Listo</> : <><Icon name="edit" size={17} />Corregir</>}
        </button>
        {revisar && !abierto && (
          <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={() => onOk(id)}>
            <Icon name="check" size={17} />Está bien así
          </button>
        )}
      </div>
    </article>
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

/**
 * La primera página del contrato, con los fragmentos de donde salió cada dato.
 * Es una maqueta en HTML: la versión real mostraría el PDF con los mismos
 * resaltados, sacados de las coordenadas que devuelva la lectura.
 */
function Fragmento({ campo, activo, children }: Readonly<{ campo: CampoId; activo: CampoId | null; children: React.ReactNode }>) {
  return <mark data-campo={campo} data-activo={activo === campo || undefined}>{children}</mark>;
}

function ContractPaper({ activo, archivo }: Readonly<{ activo: CampoId | null; archivo: Archivo }>) {
  return (
    <div className="owner-pdf-paper">
      <div className="owner-pdf-paper__bar">
        <Icon name="file" size={17} />
        <span>{archivo.nombre}</span>
        <small>Página 1 de {archivo.paginas ?? 6}</small>
      </div>
      <article className="owner-pdf-paper__page">
        <h3>CONTRATO DE LOCACIÓN DE INMUEBLE CON DESTINO A VIVIENDA</h3>
        <p>
          En la Ciudad de Vicente López, Provincia de Buenos Aires, a los veinte días del mes de febrero de 2025, entre Ana María Rossi,
          CUIT 27-14223344-0, con domicilio en Av. Maipú 1840, Olivos, en adelante «LA LOCADORA», por una parte, y{" "}
          <Fragmento activo={activo} campo="inquilino">Lucía Benítez, CUIT 27-33456789-9, en adelante «LA LOCATARIA»</Fragmento>, por la otra, convienen en celebrar el
          presente contrato de locación, que se regirá por las siguientes cláusulas:
        </p>
        <p><b>PRIMERA — OBJETO.</b> LA LOCADORA da en locación a LA LOCATARIA, y ésta acepta, <Fragmento activo={activo} campo="propiedad">el inmueble ubicado en Colón 2255, piso 4.º, departamento «D», Vicente López</Fragmento>, Provincia de Buenos Aires, con destino exclusivo a vivienda familiar.</p>
        <p><b>SEGUNDA — PLAZO.</b> El plazo de la presente locación se fija en <Fragmento activo={activo} campo="plazo">treinta y seis (36) meses, a contar desde el 1.º de marzo de 2025</Fragmento>, fecha en que LA LOCATARIA recibe la tenencia del inmueble.</p>
        <p><b>TERCERA — PRECIO.</b> El precio de la locación se pacta en <Fragmento activo={activo} campo="alquiler">la suma de pesos cuatrocientos cincuenta mil ($ 450.000) mensuales</Fragmento>, <Fragmento activo={activo} campo="vencimiento">pagaderos por mes adelantado del 1 al 10 de cada mes</Fragmento>, en el domicilio de LA LOCADORA o en la cuenta bancaria que ésta indique por escrito.</p>
        <p><b>CUARTA — ACTUALIZACIÓN.</b> El precio pactado se actualizará <Fragmento activo={activo} campo="actualizacion">cada cuatro (4) meses según la variación del Índice de Precios al Consumidor (IPC)</Fragmento> publicado por el INDEC, tomando el último valor disponible a la fecha de cada actualización.</p>
        <p><b>QUINTA — DEPÓSITO.</b> LA LOCATARIA entrega en este acto, en concepto de depósito en garantía, <Fragmento activo={activo} campo="deposito">una suma equivalente a un (1) mes de alquiler, en efectivo</Fragmento>, que le será devuelta al finalizar la locación, una vez verificado el estado del inmueble.</p>
        <p className="owner-pdf-paper__fade"><b>SEXTA — EXPENSAS E IMPUESTOS.</b> Estarán a cargo de LA LOCATARIA las expensas ordinarias y los servicios de luz, gas, agua y teléfono, cuyos comprobantes de pago…</p>
      </article>
    </div>
  );
}
