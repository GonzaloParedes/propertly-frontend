"use client";

/**
 * Alta de contrato desde el PDF firmado, con el backend real. El recorrido es: subir el archivo,
 * esperar la lectura (que informa sus etapas de verdad), revisar cada dato contra el documento y
 * crear. La lectura nunca crea nada por su cuenta: el contrato sale de `POST /contracts/onboarding`
 * con lo que el propietario revisó, y recién después se cierra la lectura con `complete`.
 *
 * La versión simulada que se ve en /prototipo es `ContractFromPdfDemo`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { ArcoDeEspera, Spinner } from "@/components/ui/Spinner";
import { Icon } from "@/components/ui/Icon";
import Dialog from "@/components/ui/Dialog";
import ImportReview from "@/components/dashboard/ImportReview";
import PagosTranscurridos from "@/components/dashboard/PagosTranscurridos";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { ContractImportResponse } from "@/lib/backend-types";
import { ApiError } from "@/lib/api";
import {
  ERROR,
  copyDeError,
  idDelContratoActivo,
  idDelInquilinoExistente,
} from "@/lib/error-codes";
import { ubicacionDeErrores } from "@/lib/errores-de-alta";
import { hoyEnArgentina } from "@/lib/formato";
import {
  armarAlta,
  armarCierre,
  formatearBytes,
  itemsConErrorDelServidor,
  leerResultado,
  mensajeDeRechazo,
  pasosDeLectura,
  pendientes as calcularPendientes,
  revisarArchivo,
  type Borrador,
  type Decision,
  type Decisiones,
  type ItemId,
  type Lectura,
  type PasoDeLectura,
} from "@/lib/importacion-pdf";
import { punitoriosCargados } from "@/lib/otras-condiciones";
import { formatearDireccion } from "@/lib/tenant-rows";
import {
  faltaResponder,
  mesesTranscurridos,
  paidThroughDe,
  periodosDelBackend,
  respuestaVigenteDe,
  type RespuestaPagadoHasta,
} from "@/lib/transcurridos";

type Fase = "subir" | "leyendo" | "fallo" | "revisar" | "creado";

/** Cada cuánto se pregunta cómo va la lectura, y cuánto se espera antes de avisar que tarda. */
const INTERVALO_MS = 2000;
const ESPERA_LARGA_MS = 90_000;
/** Consultas seguidas que pueden fallar (sin red, por ejemplo) antes de dejar de insistir. */
const FALLOS_SEGUIDOS = 3;

type Progreso = Pick<ContractImportResponse, "status" | "stage" | "pagesDone" | "pagesTotal">;
const SIN_PROGRESO: Progreso = { status: "QUEUED", stage: null, pagesDone: null, pagesTotal: null };

interface Fallo {
  titulo: string;
  mensaje: string;
  /** Se puede pedir otra vuelta sobre el mismo archivo. */
  reintentable: boolean;
}

const TEXTO_DE_SALIDA = "Si sale ahora, se descarta la lectura y no guardamos el archivo.";

/** Mientras la lectura está en curso, pregunta cómo va cada tanto hasta que termina o deja de haber conexión. */
function useConsultaDeLectura({ activa, importId, atender, rechazar }: Readonly<{
  activa: boolean;
  importId: number | null;
  atender: (respuesta: ContractImportResponse) => void;
  rechazar: (mensaje: string) => void;
}>) {
  useEffect(() => {
    if (!activa || importId === null) return;
    let cancelado = false;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let fallos = 0;
    const consultar = async () => {
      try {
        const respuesta = await AlquiaBackendClient.contractImports.get(importId);
        if (cancelado) return;
        fallos = 0;
        atender(respuesta);
        if (respuesta.status !== "QUEUED" && respuesta.status !== "PROCESSING") return;
      } catch (err) {
        if (cancelado) return;
        if (err instanceof ApiError && err.status === 404) return rechazar("Esta lectura ya no existe. Suba el archivo de nuevo.");
        fallos += 1;
        if (fallos >= FALLOS_SEGUIDOS) {
          return rechazar("Perdimos la conexión mientras leíamos el contrato. Compruebe su conexión y vuelva a subir el archivo.");
        }
      }
      temporizador = setTimeout(consultar, INTERVALO_MS);
    };
    temporizador = setTimeout(consultar, INTERVALO_MS);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [activa, importId, atender, rechazar]);
}

/** Las cuotas anteriores a hoy que hay que decidir: la lista del backend si ya corrigió la del cliente, y si no, la estimación local. */
function mesesPorPagarDe({ b, fechasValidas, periodosBackend, claveDeFechas, hoy }: Readonly<{
  b: Borrador | null;
  fechasValidas: boolean;
  periodosBackend: { clave: string; meses: string[] } | null;
  claveDeFechas: string;
  hoy: string;
}>): string[] {
  if (!b || !fechasValidas) return [];
  if (periodosBackend?.clave === claveDeFechas) return periodosBackend.meses;
  return mesesTranscurridos({ inicioISO: b.inicio, plazoMeses: Number(b.plazo), diaVencimiento: Number(b.dia), hoyISO: hoy });
}

/** El tilde, el spinner o nada, según cómo va ese paso de la lectura. */
function IndicadorDePaso({ estado }: Readonly<{ estado: PasoDeLectura["estado"] }>) {
  if (estado === "listo") return <Icon name="check" size={17} />;
  return estado === "ahora" ? <Spinner /> : null;
}

const ESTADO_PARA_LECTORES: Record<PasoDeLectura["estado"], string> = { listo: ": listo", ahora: ": en curso", despues: "" };

function PantallaLeyendo({ progreso, lento, onSeguirEsperando, onCargarAMano }: Readonly<{
  progreso: Progreso;
  lento: boolean;
  onSeguirEsperando: () => void;
  onCargarAMano: () => void;
}>) {
  return (
    <main className="owner-wizard__body owner-pdf-reading" aria-busy="true">
      <span className="owner-pdf-reading__arco"><ArcoDeEspera /></span>
      <h1>{progreso.status === "QUEUED" ? "Esperando su turno…" : "Leyendo el contrato…"}</h1>
      <p>Tarda menos de un minuto. No hace falta que se quede mirando.</p>
      <ol aria-live="polite" aria-label="Avance de la lectura">
        {pasosDeLectura(progreso).map(({ clave, texto, estado, detalle }) => (
          <li key={clave} data-estado={estado}>
            <span aria-hidden="true"><IndicadorDePaso estado={estado} /></span>
            {texto}{detalle ? ` (${detalle})` : ""}
            <span className="sr-only">{ESTADO_PARA_LECTORES[estado]}</span>
          </li>
        ))}
      </ol>
      {lento && (
        <output className="owner-wizard-note owner-pdf-slow">
          <span>Está tardando más de lo normal. Puede seguir esperando o cargar el contrato a mano.</span>
          <span className="owner-pdf-slow__actions">
            <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={onSeguirEsperando}>Seguir esperando</button>
            <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={onCargarAMano}>Cargarlo a mano</button>
          </span>
        </output>
      )}
    </main>
  );
}

function PantallaDeFallo({ fallo, onReintentar, onOtroArchivo, onCargarAMano }: Readonly<{
  fallo: Fallo;
  onReintentar: () => void;
  onOtroArchivo: () => void;
  onCargarAMano: () => void;
}>) {
  return (
    <main className="owner-wizard__body">
      <h1>{fallo.titulo}</h1>
      <p role="alert">{fallo.mensaje}</p>
      <div className="owner-wizard-options">
        {fallo.reintentable && (
          <button type="button" className="owner-wizard-option" onClick={onReintentar}>
            <span className="owner-wizard-option__icon"><Icon name="clock" /></span>
            <span><b>Intentar de nuevo</b><small>Vuelve a leer el mismo archivo.</small></span>
          </button>
        )}
        <button type="button" className="owner-wizard-option" onClick={onOtroArchivo}>
          <span className="owner-wizard-option__icon"><FileUp aria-hidden="true" size={22} /></span>
          <span><b>Probar con otro archivo</b><small>Una versión más nítida, o el PDF original si lo tiene.</small></span>
        </button>
        <button type="button" className="owner-wizard-option" onClick={onCargarAMano}>
          <span className="owner-wizard-option__icon"><Icon name="edit" /></span>
          <span><b>Cargarlo a mano</b><small>Le pedimos los datos de a uno.</small></span>
        </button>
      </div>
    </main>
  );
}

/** El contrato se creó pero no se pudo adjuntar el PDF. */
function PantallaCreadoSinPdf({ contratoId, onOpenContract, onComplete }: Readonly<{
  contratoId: number;
  onOpenContract?: (contratoId: number) => void;
  onComplete: () => void;
}>) {
  return (
    <main className="owner-wizard__body">
      <h1>El contrato se creó</h1>
      <p><output>No pudimos adjuntar el PDF al contrato. El contrato está creado y no hace falta cargarlo de nuevo: puede adjuntar el archivo desde el detalle del contrato.</output></p>
      <div className="owner-wizard-options">
        {onOpenContract && (
          <button type="button" className="owner-wizard-option" onClick={() => onOpenContract(contratoId)}>
            <span className="owner-wizard-option__icon"><Icon name="file" /></span>
            <span><b>Ver el contrato</b><small>Desde ahí puede adjuntar el PDF.</small></span>
          </button>
        )}
        <button type="button" className="owner-wizard-option" onClick={onComplete}>
          <span className="owner-wizard-option__icon"><Icon name="check" /></span>
          <span><b>Listo</b><small>Volver a sus contratos.</small></span>
        </button>
      </div>
    </main>
  );
}

export default function ContractFromPdf({ onBack, onManual, onClose, onComplete, onOpenContract }: Readonly<{
  onBack: () => void;
  onManual: () => void;
  onClose: () => void;
  onComplete: () => void;
  /** Para ir al contrato recién creado cuando no se pudo adjuntar el PDF. */
  onOpenContract?: (contratoId: number) => void;
}>) {
  const [fase, setFase] = useState<Fase>("subir");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const [importId, setImportId] = useState<number | null>(null);
  const [progreso, setProgreso] = useState<Progreso>(SIN_PROGRESO);
  const [lento, setLento] = useState(false);
  const [fallo, setFallo] = useState<Fallo | null>(null);
  // Cada subida o reintento es un «intento»: lo que llega de uno cancelado se descarta.
  const intento = useRef(0);

  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [decisiones, setDecisiones] = useState<Decisiones>({});
  const [revisados, setRevisados] = useState<ReadonlySet<ItemId>>(new Set());
  const [sumados, setSumados] = useState<ReadonlySet<ItemId>>(new Set());
  const [existentes, setExistentes] = useState<{ propiedad: string | null; inquilino: string | null }>({ propiedad: null, inquilino: null });

  const [pagadoHasta, setPagadoHasta] = useState<RespuestaPagadoHasta>("");
  const [periodosBackend, setPeriodosBackend] = useState<{ clave: string; meses: string[] } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ mensaje: string; contratoActivoId?: number | null } | null>(null);
  const [erroresDelBackend, setErroresDelBackend] = useState<Record<string, string>>({});
  const [itemsConError, setItemsConError] = useState<ReadonlySet<ItemId>>(new Set());
  const [creado, setCreado] = useState<number | null>(null);
  const [confirmandoSalida, setConfirmandoSalida] = useState<(() => void) | null>(null);

  // --- La lectura: se consulta hasta que termina ---

  const mostrarResultado = useCallback((respuesta: ContractImportResponse) => {
    const leida = leerResultado(respuesta);
    setLectura(leida);
    setBorrador(leida.borrador);
    setDecisiones({});
    setRevisados(new Set());
    setSumados(new Set());
    setExistentes({ propiedad: null, inquilino: null });
    setFase("revisar");
    // Los nombres de lo que el propietario ya tiene: sólo para decir «Ya la tiene cargada: …».
    const { propiedadId, inquilinoId } = leida.coincidencias;
    if (propiedadId !== null) {
      AlquiaBackendClient.properties.get(propiedadId)
        .then((propiedad) => setExistentes((previos) => ({ ...previos, propiedad: formatearDireccion(propiedad) })))
        .catch(() => {});
    }
    if (inquilinoId !== null) {
      AlquiaBackendClient.tenants.get(inquilinoId)
        .then((inquilino) => setExistentes((previos) => ({ ...previos, inquilino: `${inquilino.firstName} ${inquilino.lastName}` })))
        .catch(() => {});
    }
  }, []);

  const fallar = useCallback((respuesta: ContractImportResponse) => {
    const incierto = respuesta.failureReason === "UNCERTAIN";
    setFallo({
      titulo: "No pudimos leer este documento",
      mensaje: incierto
        ? "La lectura se cortó antes de terminar y no sabemos si llegó a completarse. Puede intentarla de nuevo sin gastar otra lectura, probar con otro archivo o cargar el contrato a mano."
        : "Pasa con escaneos borrosos, fotos torcidas o archivos dañados. Puede probar con otra copia, o cargar el contrato a mano.",
      reintentable: true,
    });
    setFase("fallo");
  }, []);

  const rechazar = useCallback((mensaje: string) => {
    setFallo({ titulo: "No pudimos usar este archivo", mensaje, reintentable: false });
    setFase("fallo");
  }, []);

  const atender = useCallback((respuesta: ContractImportResponse) => {
    setProgreso(respuesta);
    if (respuesta.status === "READY") return mostrarResultado(respuesta);
    if (respuesta.status === "FAILED") return fallar(respuesta);
    if (respuesta.status === "COMPLETED") return rechazar("Ya cargó un contrato a partir de este mismo archivo. Búsquelo en su lista de contratos.");
    if (respuesta.status === "ABANDONED") return rechazar("Esta lectura se descartó. Suba el archivo de nuevo para empezar otra.");
  }, [mostrarResultado, fallar, rechazar]);

  useConsultaDeLectura({ activa: fase === "leyendo", importId, atender, rechazar });

  // Después de un rato largo se avisa que tarda, sin cortar nada.
  useEffect(() => {
    if (fase !== "leyendo") return;
    const temporizador = setTimeout(() => setLento(true), ESPERA_LARGA_MS);
    return () => clearTimeout(temporizador);
  }, [fase, importId]);

  // --- Subir ---

  function elegirArchivo(elegido: File | undefined) {
    if (!elegido) return;
    const problema = revisarArchivo(elegido);
    setErrorArchivo(problema);
    setArchivo(problema ? null : elegido);
  }

  function empezarEspera() {
    setProgreso(SIN_PROGRESO);
    setLento(false);
    setFallo(null);
    setFase("leyendo");
  }

  async function leer() {
    if (!archivo) return;
    const mio = ++intento.current;
    setImportId(null);
    empezarEspera();
    try {
      const respuesta = await AlquiaBackendClient.contractImports.upload(archivo);
      if (intento.current !== mio) {
        // Canceló mientras subía: no se deja una lectura huérfana.
        AlquiaBackendClient.contractImports.discard(respuesta.id).catch(() => {});
        return;
      }
      setImportId(respuesta.id);
      atender(respuesta);
    } catch (err) {
      if (intento.current === mio) rechazar(mensajeDeRechazo(err));
    }
  }

  async function reintentar() {
    if (importId === null) return;
    const mio = ++intento.current;
    empezarEspera();
    try {
      const respuesta = await AlquiaBackendClient.contractImports.retry(importId);
      if (intento.current !== mio) return;
      atender(respuesta);
    } catch (err) {
      if (intento.current === mio) {
        setFallo({ titulo: "No pudimos reintentar la lectura", mensaje: copyDeError(err, { fallback: "No pudimos reintentar la lectura. Pruebe con otro archivo o cargue el contrato a mano." }), reintentable: false });
        setFase("fallo");
      }
    }
  }

  function descartar() {
    if (importId !== null) AlquiaBackendClient.contractImports.discard(importId).catch(() => {});
  }

  function volverASubir() {
    intento.current += 1;
    descartar();
    setImportId(null);
    setArchivo(null);
    setErrorArchivo(null);
    setFallo(null);
    setLectura(null);
    setBorrador(null);
    setFase("subir");
  }

  function cancelarEspera() {
    volverASubir();
  }

  function cargarAMano() {
    intento.current += 1;
    descartar();
    onManual();
  }

  /** Salir con una lectura en curso o ya revisada se confirma: se descarta y el archivo no se guarda. */
  function pedirSalir(salir: () => void) {
    const conTrabajo = fase === "revisar" || (fase === "leyendo" && importId !== null);
    if (conTrabajo) setConfirmandoSalida(() => salir);
    else {
      // Si todavía estaba subiendo, lo que llegue después se descarta solo (ver `leer`).
      intento.current += 1;
      descartar();
      salir();
    }
  }

  function confirmarSalida() {
    const salir = confirmandoSalida;
    setConfirmandoSalida(null);
    intento.current += 1;
    descartar();
    salir?.();
  }

  // --- Revisar ---

  const b = borrador;
  const hoy = hoyEnArgentina();
  const fechasValidas = b !== null && /^\d{4}-\d{2}-\d{2}$/.test(b.inicio) && Number(b.plazo) > 0 && Number(b.dia) >= 1 && Number(b.dia) <= 28;
  const claveDeFechas = b ? `${b.inicio}|${b.plazo}|${b.dia}` : "";
  const mesesPorPagar = mesesPorPagarDe({ b, fechasValidas, periodosBackend, claveDeFechas, hoy });
  const respuestaVigente = respuestaVigenteDe(pagadoHasta, mesesPorPagar);

  const pendientes = lectura && b ? calcularPendientes(lectura, b, decisiones, revisados, sumados) : [];
  const restantes = pendientes.length + (faltaResponder(respuestaVigente, mesesPorPagar) ? 1 : 0);

  function cambiarDecision(id: ItemId, decision: Decision | null) {
    setDecisiones((previas) => {
      const siguientes = { ...previas };
      if (decision === null) delete siguientes[id];
      else siguientes[id] = decision;
      return siguientes;
    });
    // «Usar el día 28» carga ese día; deshacerlo lo deja otra vez sin elegir.
    if (id === "vencimiento") setBorrador((actual) => (actual ? { ...actual, dia: decision === "usar28" ? "28" : "" } : actual));
  }

  const marcarRevisado = (id: ItemId) => setRevisados((previos) => new Set(previos).add(id));
  const sumar = (id: ItemId) => setSumados((previos) => new Set(previos).add(id));

  const cargarDocumento = useCallback(() => AlquiaBackendClient.contractImports.document(importId!), [importId]);

  /** Pasa cerca de la medianoche o con un contrato por índice: la lista del backend manda y se vuelve a preguntar. */
  function preguntarOtraVezLasCuotas(err: ApiError, conListaDelBackend: boolean) {
    const periodos = conListaDelBackend ? periodosDelBackend(err.fieldErrors) : null;
    if (periodos) setPeriodosBackend({ clave: claveDeFechas, meses: periodos });
    setPagadoHasta("");
    setAviso({ mensaje: copyDeError(err) });
  }

  /** El inquilino ya existe con ese CUIT o teléfono: se ofrece usarlo en vez de crear otro. */
  function ofrecerInquilinoExistente(existente: number) {
    setLectura((actual) => (actual ? { ...actual, coincidencias: { ...actual.coincidencias, inquilinoId: existente } } : actual));
    setBorrador((actual) => (actual ? { ...actual, inquilinoId: existente } : actual));
    AlquiaBackendClient.tenants.get(existente)
      .then((inquilino) => setExistentes((previos) => ({ ...previos, inquilino: `${inquilino.firstName} ${inquilino.lastName}` })))
      .catch(() => {});
    setAviso({ mensaje: "Ya tiene cargado a ese inquilino con el mismo CUIT o teléfono. Lo dejamos elegido: revise y cree el contrato de nuevo." });
  }

  /** Si el servidor rechazó datos puntuales, se marcan en la revisión; devuelve si había alguno. */
  function marcarErroresDelServidor(err: ApiError): boolean {
    const errores = err.status === 400 ? ubicacionDeErrores(err.fieldErrors) : null;
    if (!errores || errores.ubicaciones.length === 0) return false;
    setErroresDelBackend(errores.porRuta);
    setItemsConError(new Set(itemsConErrorDelServidor(err.fieldErrors)));
    setAviso({ mensaje: "El servidor no aceptó algunos datos. Los marcamos para que los corrija." });
    return true;
  }

  function conAvisoDelAlta(err: unknown) {
    if (err instanceof ApiError) {
      if (err.type === ERROR.ELAPSED_INVOICES_DECISION_REQUIRED) return preguntarOtraVezLasCuotas(err, true);
      if (err.type === ERROR.ELAPSED_PAID_THROUGH_OUT_OF_RANGE) return preguntarOtraVezLasCuotas(err, false);
      const existente = idDelInquilinoExistente(err);
      if ((err.type === ERROR.DUPLICATE_TAX_ID || err.type === ERROR.DUPLICATE_PHONE_NUMBER) && existente !== null) {
        return ofrecerInquilinoExistente(existente);
      }
      if (err.type === ERROR.PROPERTY_HAS_ACTIVE_CONTRACT) {
        return setAviso({ mensaje: copyDeError(err), contratoActivoId: idDelContratoActivo(err) });
      }
      if (marcarErroresDelServidor(err)) return;
    }
    setAviso({ mensaje: copyDeError(err, { fallback: "No pudimos crear el contrato. Inténtelo de nuevo." }) });
  }

  async function crear() {
    if (!lectura || !b || importId === null) return;
    setGuardando(true);
    setAviso(null);
    setErroresDelBackend({});
    setItemsConError(new Set());
    let contrato;
    try {
      contrato = await AlquiaBackendClient.contracts.onboard(armarAlta(b, decisiones, paidThroughDe(respuestaVigente, mesesPorPagar)));
    } catch (err) {
      conAvisoDelAlta(err);
      setGuardando(false);
      return;
    }
    // El contrato ya existe: de acá en más no se vuelve a crear. Cerrar la lectura se intenta dos veces.
    const cierre = armarCierre(lectura, b, decisiones, revisados, contrato.id);
    for (let vez = 0; vez < 2; vez += 1) {
      try {
        await AlquiaBackendClient.contractImports.complete(importId, cierre);
        return onComplete();
      } catch {
        // Se reintenta una vez; si falla otra, se muestra el contrato como creado, sin el PDF.
      }
    }
    setCreado(contrato.id);
    setFase("creado");
    setGuardando(false);
  }

  const paso = fase === "revisar" || fase === "creado" ? 2 : 1;
  const hayPunitorios = b !== null && punitoriosCargados(b.otras.punitorios) && decisiones.punitorios !== "sinPunitorios";

  return (
    <section className="owner-wizard owner-pdf" aria-label="Asistente de nuevo contrato desde el PDF">
      <header className="owner-wizard__top">
        <button type="button" aria-label="Salir del asistente" onClick={() => pedirSalir(onClose)} disabled={guardando || fase === "creado"}><Icon name="x" /></button>
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
                <b>{archivo.name}</b>
                <small>PDF · {formatearBytes(archivo.size)}</small>
              </div>
              <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={() => input.current?.click()}>Cambiar</button>
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
          <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} aria-hidden="true" aria-label="Archivo del contrato"
            onChange={(e) => { elegirArchivo(e.target.files?.[0]); e.target.value = ""; }} />
          {errorArchivo && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{errorArchivo}</p>}
          <aside className="owner-wizard-note owner-pdf-note">
            <Icon name="paperclip" />
            <span>El PDF queda guardado dentro del contrato, para tenerlo a mano cuando lo necesite. Si no llega a crear el contrato, lo borramos.</span>
          </aside>
        </main>
      )}

      {fase === "leyendo" && (
        <PantallaLeyendo progreso={progreso} lento={lento} onSeguirEsperando={() => setLento(false)} onCargarAMano={cargarAMano} />
      )}

      {fase === "fallo" && fallo && (
        <PantallaDeFallo fallo={fallo} onReintentar={() => void reintentar()} onOtroArchivo={volverASubir} onCargarAMano={cargarAMano} />
      )}

      {fase === "revisar" && lectura && b && (
        <ImportReview
          lectura={lectura}
          nombreArchivo={archivo?.name ?? "contrato.pdf"}
          borrador={b}
          onBorrador={setBorrador}
          decisiones={decisiones}
          onDecision={cambiarDecision}
          revisados={revisados}
          onRevisar={marcarRevisado}
          sumados={sumados}
          onSumar={sumar}
          pendientes={pendientes}
          restantes={restantes}
          itemsConError={itemsConError}
          erroresDelBackend={erroresDelBackend}
          existentes={existentes}
          cargarDocumento={cargarDocumento}
          onManual={cargarAMano}
          aviso={aviso && (
            <div className="owner-wizard-alert" role="alert">
              <Icon name="alert" size={19} />
              <div>
                <p>{aviso.mensaje}</p>
                {aviso.contratoActivoId != null && onOpenContract && (
                  <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={() => pedirSalir(() => onOpenContract(aviso.contratoActivoId!))}>Ver ese contrato</button>
                )}
              </div>
            </div>
          )}
          antesDeCrear={mesesPorPagar.length > 0 && b ? (
            <>
              <h2 className="owner-pdf-group">Antes de crearlo</h2>
              <div className="owner-pdf-list">
                <article className="owner-pdf-item" data-estado={faltaResponder(respuestaVigente, mesesPorPagar) ? "falta" : "ok"}>
                  <PagosTranscurridos
                    meses={mesesPorPagar}
                    value={respuestaVigente}
                    onChange={setPagadoHasta}
                    inicioISO={b.inicio}
                    alquiler={Number(b.alquiler)}
                    frecuenciaMeses={Number(b.frecuencia)}
                    tieneRecargo={hayPunitorios}
                    hoyISO={hoy}
                  />
                </article>
              </div>
            </>
          ) : undefined}
        />
      )}

      {fase === "creado" && creado !== null && (
        <PantallaCreadoSinPdf contratoId={creado} onOpenContract={onOpenContract} onComplete={onComplete} />
      )}

      <footer className="owner-wizard__footer">
        {fase === "subir" && <>
          <button type="button" className="owner-wizard-quiet" onClick={onBack}>Atrás</button>
          <button type="button" className="owner-wizard-next" disabled={!archivo} onClick={() => void leer()}>Leer el contrato <Icon name="arrow" /></button>
        </>}
        {fase === "leyendo" && <button type="button" className="owner-wizard-quiet" onClick={cancelarEspera}>Cancelar</button>}
        {fase === "fallo" && <button type="button" className="owner-wizard-quiet" onClick={volverASubir}>Atrás</button>}
        {fase === "revisar" && <>
          <button type="button" className="owner-wizard-quiet" onClick={() => pedirSalir(onBack)} disabled={guardando}>Atrás</button>
          {restantes > 0 && <span className="owner-pdf-pending" aria-live="polite">{restantes === 1 ? "Queda 1 por resolver" : `Quedan ${restantes} por resolver`}</span>}
          <button type="button" className="owner-wizard-next" disabled={restantes > 0 || guardando} onClick={() => void crear()} aria-busy={guardando || undefined}>
            {guardando ? <><Spinner />Guardando…</> : "Crear contrato"}
          </button>
        </>}
      </footer>

      {confirmandoSalida && (
        <Dialog title="¿Salir sin crear el contrato?" onClose={() => setConfirmandoSalida(null)}>
          <div className="owner-dialog__body"><p>{TEXTO_DE_SALIDA}</p></div>
          <div className="owner-dialog__foot">
            <button type="button" className="owner-button owner-button--quiet" onClick={() => setConfirmandoSalida(null)}>Seguir revisando</button>
            <button type="button" className="owner-button owner-button--danger" onClick={confirmarSalida}>Salir</button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
