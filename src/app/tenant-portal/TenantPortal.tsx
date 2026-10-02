"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlquiaBackendClient } from "@/lib/backend-client";
import { ApiError } from "@/lib/api";
import {
  aniosDelCalendario,
  buildFilasInquilino,
  mesesDelCalendario,
  type FilaCuotaInquilino,
  type MesCalendarioInquilino,
} from "@/lib/portal-inquilino";
import type { TenantCalendarResponse } from "@/lib/backend-types";
import { Cargando, Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import "./tenant-portal.css";

type Estado =
  | { fase: "cargando" }
  | { fase: "invalido" }
  | { fase: "error" }
  | { fase: "listo"; calendar: TenantCalendarResponse };

function Icon({ name, size = 20 }: Readonly<{ name: "check" | "clock" | "alert" | "file" | "download"; size?: number }>) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    check: <path d="M20 6 9 17l-5-5" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
    alert: <><path d="M12 9v4M12 16.5h.01" /><path d="M10.3 3.9 1.8 18a1.7 1.7 0 0 0 1.5 2.6h17.4a1.7 1.7 0 0 0 1.5-2.6L13.7 3.9a1.7 1.7 0 0 0-3.4 0Z" /></>,
    file: <><path d="M6 2.5h8l4 4V21.5H6z" /><path d="M14 2.5v4h4" /></>,
    download: <><path d="M12 4v11m0 0-4-4m4 4 4-4" /><path d="M4 19.5h16" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" {...common}>{paths[name]}</svg>;
}

function EstadoBadge({ children }: Readonly<{ children: FilaCuotaInquilino["estado"] }>) {
  const config: Record<FilaCuotaInquilino["estado"], ["ok" | "warn" | "bad" | "info", Parameters<typeof Icon>[0]["name"]]> = {
    Pagada: ["ok", "check"], "A vencer": ["warn", "clock"], Vencida: ["bad", "alert"], "Pago a confirmar": ["info", "clock"],
  };
  const [tono, icono] = config[children];
  return <span className={`tenant-badge tenant-badge--${tono}`}><Icon name={icono} size={15} />{children}</span>;
}

function etiquetaMesVacio(mes: MesCalendarioInquilino): string {
  const etiquetas = {
    "antes-del-contrato": "Antes del contrato", "sin-cuota-generada": "Sin cuota generada",
    "sin-contrato-vigente": "Sin contrato vigente", "despues-del-contrato": "Después del contrato", cuota: "",
  } as const;
  return etiquetas[mes.estado];
}

function anioInicial(anios: number[]): number {
  const actual = new Date().getFullYear();
  if (anios.includes(actual)) return actual;
  return anios.reduce((masCercano, anio) => Math.abs(anio - actual) < Math.abs(masCercano - actual) ? anio : masCercano);
}

function CuotaDetalle({ fila, perteneceACondicionesAnteriores, subiendo, viendoComprobante, inputsRef, subirComprobante, verComprobante }: Readonly<{
  fila: FilaCuotaInquilino;
  perteneceACondicionesAnteriores: boolean;
  subiendo: number | null;
  viendoComprobante: number | null;
  inputsRef: React.MutableRefObject<Record<number, HTMLInputElement | null>>;
  subirComprobante: (invoiceId: number, archivo: File) => Promise<void>;
  verComprobante: (pagoId: number) => Promise<void>;
}>) {
  return (
    <article className="tenant-cuota">
      <div className="tenant-cuota__cabecera">
        <div><b>{fila.periodo}</b><small>Vence el {fila.vencimiento}</small></div>
        <EstadoBadge>{fila.estado}</EstadoBadge>
      </div>
      <div className="tenant-cuota__monto">
        <span>{fila.monto}</span>
        {fila.ajustes.length > 0 && <dl className="tenant-cuota__desglose" aria-label={`Detalle del importe de ${fila.periodo}`}>
          <div><dt>Importe del contrato</dt><dd>{fila.importeBase}</dd></div>
          {fila.ajustes.map((ajuste) => <div key={ajuste.id}><dt>{ajuste.nombre}{ajuste.detalle && <small> · {ajuste.detalle}</small>}</dt><dd>{ajuste.efecto}</dd></div>)}
        </dl>}
        {!fila.confirmada && <small className="tenant-cuota__aviso">El propietario todavía no cerró este importe: puede cambiar.</small>}
        {fila.estado === "Vencida" && perteneceACondicionesAnteriores && <small className="tenant-cuota__aviso">Esta cuota sigue pendiente aunque las condiciones hayan cambiado.</small>}
      </div>
      {fila.pago && <div className="tenant-cuota__pago">
        {fila.pago.status === "AWAITING_CONFIRMATION" && <span className="tenant-pago-estado tenant-pago-estado--info">Comprobante esperando confirmación del propietario</span>}
        {fila.pago.status === "CONFIRMED" && <span className="tenant-pago-estado tenant-pago-estado--ok">Pago confirmado</span>}
        {fila.pago.status === "REJECTED" && <span className="tenant-pago-estado tenant-pago-estado--bad">El propietario rechazó este comprobante{fila.pago.rejectionReason && `: ${fila.pago.rejectionReason}`}</span>}
        <button type="button" className="tenant-link-boton" disabled={viendoComprobante === fila.pago.id} onClick={() => void verComprobante(fila.pago!.id)}>
          <Icon name="download" size={16} />{viendoComprobante === fila.pago.id ? <><Spinner />Abriendo…</> : "Ver comprobante"}
        </button>
      </div>}
      {fila.puedeSubirComprobante && <div className="tenant-cuota__subir">
        <input ref={(el) => { inputsRef.current[fila.invoiceId] = el; }} type="file" className="sr-only" aria-label={`Subir comprobante de ${fila.periodo}`} onChange={(event) => {
          const archivo = event.target.files?.[0];
          if (archivo) void subirComprobante(fila.invoiceId, archivo);
          event.target.value = "";
        }} />
        <button type="button" className="tenant-boton" disabled={subiendo === fila.invoiceId} onClick={() => inputsRef.current[fila.invoiceId]?.click()}>
          <Icon name="file" size={16} />{subiendo === fila.invoiceId ? <><Spinner />Subiendo…</> : "Subir comprobante"}
        </button>
      </div>}
    </article>
  );
}

export default function TenantPortal() {
  const searchParams = useSearchParams();
  const tokenDeLaUrl = searchParams.get("token");
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });
  const [anioSeleccionado, setAnioSeleccionado] = useState<number | null>(null);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string | null>(null);
  const [mostrarAnios, setMostrarAnios] = useState(false);
  const [subiendo, setSubiendo] = useState<number | null>(null);
  const [viendoComprobante, setViendoComprobante] = useState<number | null>(null);
  const toast = useToast();
  const inputsRef = useRef<Record<number, HTMLInputElement | null>>({});
  const botonesMesRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const detalleRef = useRef<HTMLElement>(null);

  async function cargarCalendario() {
    try {
      setEstado({ fase: "cargando" });
      const calendar = await AlquiaBackendClient.tenantPortal.calendar();
      setEstado({ fase: "listo", calendar });
    } catch (err) {
      setEstado(err instanceof ApiError && err.status === 401 ? { fase: "invalido" } : { fase: "error" });
    }
  }

  useEffect(() => {
    let cancelado = false;
    async function iniciar() {
      if (tokenDeLaUrl) {
        try { await AlquiaBackendClient.tenantAuth.session({ token: tokenDeLaUrl }); }
        catch { if (!cancelado) setEstado({ fase: "invalido" }); return; }
      }
      if (!cancelado) await cargarCalendario();
    }
    void iniciar();
    return () => { cancelado = true; };
    // El token de la URL no cambia durante esta sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function subirComprobante(invoiceId: number, archivo: File) {
    setSubiendo(invoiceId);
    try {
      await AlquiaBackendClient.tenantPortal.createPayment(invoiceId, archivo);
      await cargarCalendario();
      toast.exito("Recibimos su comprobante. Queda esperando la confirmación del propietario.");
    } catch (err) {
      toast.error(err instanceof ApiError && err.status === 400 ? "No pudimos registrar el comprobante. Verifique el archivo e intente de nuevo." : "No pudimos subir el comprobante. Inténtelo de nuevo más tarde.");
    } finally { setSubiendo(null); }
  }

  async function verComprobante(pagoId: number) {
    setViendoComprobante(pagoId);
    try {
      const blob = await AlquiaBackendClient.tenantPortal.getReceipt(pagoId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { toast.error("No pudimos abrir el comprobante. Inténtelo de nuevo más tarde."); }
    finally { setViendoComprobante(null); }
  }

  if (estado.fase === "cargando") return <main className="tenant-portal tenant-portal--centrado"><Cargando>Cargando sus cuotas…</Cargando></main>;
  if (estado.fase === "invalido") return <main className="tenant-portal tenant-portal--centrado"><div className="tenant-mensaje"><Icon name="alert" size={28} /><h1>Este enlace no funciona</h1><p>Puede haber vencido o no ser válido. Pídale a su propietario que se lo reenvíe.</p></div></main>;
  if (estado.fase === "error") return <main className="tenant-portal tenant-portal--centrado"><div className="tenant-mensaje" role="alert"><Icon name="alert" size={28} /><h1>No pudimos cargar sus cuotas</h1><p>Inténtelo de nuevo más tarde.</p><button type="button" className="tenant-link-boton" onClick={() => void cargarCalendario()}>Reintentar</button></div></main>;

  const filas = buildFilasInquilino(estado.calendar.invoices);
  const anios = aniosDelCalendario(estado.calendar.coverage, filas);
  const anio = anioSeleccionado && anios.includes(anioSeleccionado) ? anioSeleccionado : anioInicial(anios);
  const meses = mesesDelCalendario(anio, estado.calendar.coverage, filas);
  const mesSeleccionado = meses.find((mes) => mes.periodoISO === periodoSeleccionado);

  function seleccionarMes(mes: MesCalendarioInquilino) {
    setPeriodoSeleccionado(mes.periodoISO);
    requestAnimationFrame(() => detalleRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }
  function cerrarDetalle() {
    const periodo = periodoSeleccionado;
    setPeriodoSeleccionado(null);
    if (periodo) requestAnimationFrame(() => botonesMesRef.current[periodo]?.focus());
  }
  function cambiarAnio(siguiente: number) {
    if (!anios.includes(siguiente)) return;
    setAnioSeleccionado(siguiente); setPeriodoSeleccionado(null); setMostrarAnios(false);
  }

  return <main className="tenant-portal tenant-portal--calendar">
    <header className="tenant-header"><h1>Sus cuotas</h1><p>Elija un mes para ver el detalle de su cuota y su comprobante.</p></header>
    <section className="tenant-calendar" aria-label="Cuotas por año">
      <div className="tenant-calendar__bar">
        <div><h2>Cuotas de {anio}</h2><p>Seleccione un mes para ver su cuota.</p></div>
        <div className="tenant-calendar__years" aria-label="Cambiar año">
          <button type="button" onClick={() => cambiarAnio(anio - 1)} disabled={anio === anios[0]} aria-label="Año anterior">‹</button>
          <div className="tenant-calendar__year-picker"><button type="button" className="tenant-calendar__year-current" onClick={() => setMostrarAnios(!mostrarAnios)} aria-expanded={mostrarAnios} aria-label={`Elegir año, actual ${anio}`}>{anio} <span aria-hidden="true">⌄</span></button>
            {mostrarAnios && <div className="tenant-calendar__year-options" aria-label="Años disponibles">{anios.map((opcion) => <button type="button" key={opcion} aria-current={opcion === anio ? "date" : undefined} onClick={() => cambiarAnio(opcion)}>{opcion}</button>)}</div>}
          </div>
          <button type="button" onClick={() => cambiarAnio(anio + 1)} disabled={anio === anios[anios.length - 1]} aria-label="Año siguiente">›</button>
        </div>
      </div>
      <div className="tenant-calendar__months">
        {meses.map((mes) => {
          if (mes.estado !== "cuota") return <div className={`tenant-calendar__month tenant-calendar__month--empty tenant-calendar__month--${mes.estado}`} key={mes.periodoISO}><span className="tenant-calendar__month-name">{mes.nombre}</span><span>{etiquetaMesVacio(mes)}</span></div>;
          const estados = [...new Set(mes.cuotas.map((fila) => fila.estado))];
          const etiqueta = mes.cuotas.length === 1 ? estados[0] : `${mes.cuotas.length} cuotas`;
          const tono = estados.includes("Vencida") ? "bad" : estados.includes("Pago a confirmar") ? "info" : estados.includes("A vencer") ? "warn" : "ok";
          return <button ref={(elemento) => { botonesMesRef.current[mes.periodoISO] = elemento; }} type="button" className={`tenant-calendar__month tenant-calendar__month--${tono}${periodoSeleccionado === mes.periodoISO ? " tenant-calendar__month--selected" : ""}`} key={mes.periodoISO} onClick={() => seleccionarMes(mes)} aria-pressed={periodoSeleccionado === mes.periodoISO} aria-label={`${mes.nombre} ${anio}: ${etiqueta}. Ver detalle`}>
            <span className="tenant-calendar__month-name">{mes.nombre}</span>{mes.cambioDeCondiciones && <span className="tenant-calendar__change">Cambiaron las condiciones</span>}<span className="tenant-calendar__status"><span className="tenant-calendar__dot" />{etiqueta}</span><span className="tenant-calendar__detail-link">Ver detalle <span aria-hidden="true">→</span></span>
          </button>;
        })}
      </div>
      {mesSeleccionado?.cuotas.length ? <section ref={detalleRef} className="tenant-calendar__detail" aria-label={`Detalle de ${mesSeleccionado.nombre.toLowerCase()} ${anio}`} tabIndex={-1}>
        <div className="tenant-calendar__detail-head"><div><p>{mesSeleccionado.cuotas.length > 1 ? "Detalle de las cuotas" : "Detalle de la cuota"}</p><h3>{mesSeleccionado.nombre} {anio}</h3></div><button type="button" className="tenant-calendar__close" onClick={cerrarDetalle}>Cerrar <span aria-hidden="true">×</span></button></div>
        <div className="tenant-calendar__invoices">{mesSeleccionado.cuotas.map((fila) => <CuotaDetalle key={fila.invoiceId} fila={fila} perteneceACondicionesAnteriores={fila.estado === "Vencida" && estado.calendar.coverage.slice(1).some((tramo) => fila.periodoISO < tramo.startDate.slice(0, 7))} subiendo={subiendo} viendoComprobante={viendoComprobante} inputsRef={inputsRef} subirComprobante={subirComprobante} verComprobante={verComprobante} />)}</div>
      </section> : null}
    </section>
    <p className="tenant-calendar__note">«Antes del contrato» y «Después del contrato» son meses fuera de la vigencia. «Sin cuota generada» todavía no tiene un importe para consultar.</p>
  </main>;
}
