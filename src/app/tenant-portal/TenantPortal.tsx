"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { AlquiaBackendClient } from "@/lib/backend-client";
import { ApiError } from "@/lib/api";
import {
  aniosDelCalendario,
  buildFilasInquilino,
  buildImportesPendientesInquilino,
  mesesDelCalendario,
  type FilaCuotaInquilino,
  type MesCalendarioInquilino,
} from "@/lib/portal-inquilino";
import type { TenantCalendarResponse } from "@/lib/backend-types";
import { Cargando, Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";
import "./tenant-portal.css";

type Estado =
  | { fase: "cargando" }
  | { fase: "invalido" }
  | { fase: "error" }
  | { fase: "listo"; calendar: TenantCalendarResponse };

function AccessLinkArt() {
  const line = { fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg className="tenant-access-state__art" aria-hidden="true" viewBox="0 0 120 96">
    <circle cx="60" cy="50" r="42" fill="var(--indigo-suave)" />
    <path {...line} d="M39 76h42M43 76V48l17-14 17 14v28M53 76V62h14v14" />
    <path {...line} stroke="var(--rosa)" strokeWidth="4" d="m42 47 18-16 18 16" />
    <path {...line} d="m74 38 5-5a8 8 0 0 1 11 11l-5 5M82 50l-5 5a8 8 0 0 1-11-11l5-5" />
    <path {...line} d="m72 39 10 10" />
  </svg>;
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
    "antes-del-contrato": "Antes del contrato", "sin-cuota-generada": "Sin cuota",
    "sin-contrato-vigente": "Sin contrato vigente", "despues-del-contrato": "Después del contrato", cuota: "",
    "importe-pendiente-confirmacion": "",
  } as const;
  return etiquetas[mes.estado];
}

function anioInicial(anios: number[]): number {
  const actual = new Date().getFullYear();
  if (anios.includes(actual)) return actual;
  const primerAnio = anios[0];
  if (primerAnio === undefined) return actual;
  return anios.reduce((masCercano, anio) => Math.abs(anio - actual) < Math.abs(masCercano - actual) ? anio : masCercano, primerAnio);
}

function tonoDeCuotas(estados: FilaCuotaInquilino["estado"][]): "bad" | "info" | "warn" | "ok" {
  if (estados.includes("Vencida")) return "bad";
  if (estados.includes("Pago a confirmar")) return "info";
  if (estados.includes("A vencer")) return "warn";
  return "ok";
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
        catch {
          if (!cancelado) setEstado({ fase: "invalido" });
          return;
        }
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
  if (estado.fase === "invalido") return <main className="tenant-portal tenant-portal--centrado tenant-portal--access"><section className="tenant-access-state" aria-labelledby="tenant-access-title"><div className="tenant-access-state__brand"><Image src="/logos/lockup.svg" alt="Alquia" width={102} height={36} priority /><span>Portal de inquilinos</span></div><AccessLinkArt /><p className="tenant-access-state__eyebrow">Acceso al portal</p><h1 id="tenant-access-title">Este enlace ya no está disponible</h1><p className="tenant-access-state__description">No pudimos validar este acceso.</p><div className="tenant-access-state__next"><b>¿Qué puede hacer?</b><span>Pídale a su propietario que le envíe un enlace nuevo para ingresar.</span></div></section></main>;
  if (estado.fase === "error") return <main className="tenant-portal tenant-portal--centrado"><div className="tenant-mensaje" role="alert"><Icon name="alert" size={28} /><h1>No pudimos cargar sus cuotas</h1><p>Inténtelo de nuevo más tarde.</p><button type="button" className="tenant-link-boton" onClick={() => void cargarCalendario()}>Reintentar</button></div></main>;

  const filas = buildFilasInquilino(estado.calendar.invoices);
  const importesPendientes = buildImportesPendientesInquilino(estado.calendar.preInvoices);
  const anios = aniosDelCalendario(estado.calendar.coverage, filas, importesPendientes);
  const anio = anioSeleccionado && anios.includes(anioSeleccionado) ? anioSeleccionado : anioInicial(anios);
  const meses = mesesDelCalendario(anio, estado.calendar.coverage, filas, importesPendientes);
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
  function seleccionarAnio(siguiente: number) {
    setAnioSeleccionado(siguiente); setPeriodoSeleccionado(null);
  }

  const nombreInquilino = estado.calendar.tenant ? `${estado.calendar.tenant.firstName} ${estado.calendar.tenant.lastName}`.trim() : null;

  return <main className="tenant-portal tenant-portal--calendar">
    <header className="tenant-header">{nombreInquilino && <p className="tenant-header__greeting">Hola, {nombreInquilino}</p>}<h1>Sus cuotas</h1><p>Elija un mes para ver el detalle de su cuota y su comprobante.</p></header>
    <section className="tenant-calendar" aria-label="Cuotas por año">
      <div className="tenant-calendar__bar">
        <div><h2>Cuotas de {anio}</h2><p>Seleccione un mes para ver su cuota.</p></div>
        <div className="tenant-calendar__years" aria-label="Cambiar año">
          {anios.length === 1 ? <span className="tenant-calendar__year-static">{anio}</span> : anios.map((opcion) => <button type="button" className={`tenant-calendar__year-tab${opcion === anio ? " tenant-calendar__year-tab--selected" : ""}`} key={opcion} aria-pressed={opcion === anio} onClick={() => seleccionarAnio(opcion)}>{opcion}</button>)}
        </div>
      </div>
      <div className="tenant-calendar__months">
        {meses.map((mes) => {
          if (mes.estado === "importe-pendiente-confirmacion") return <div className="tenant-calendar__month tenant-calendar__month--estimate" key={mes.periodoISO}><span className="tenant-calendar__month-name">{mes.nombre}</span>{mes.cambioDeCondiciones && <span className="tenant-calendar__change">Cambiaron las condiciones</span>}<span className="tenant-calendar__estimate-amounts">{mes.importesPendientes.map((importe) => <span key={`${importe.contractId}-${importe.periodoISO}`}>{importe.monto}</span>)}</span><span className="tenant-calendar__estimate-status">Importe a confirmar</span></div>;
          if (mes.estado !== "cuota") return <div className={`tenant-calendar__month tenant-calendar__month--empty tenant-calendar__month--${mes.estado}`} key={mes.periodoISO}><span className="tenant-calendar__month-name">{mes.nombre}</span><span className="tenant-calendar__empty-status">{etiquetaMesVacio(mes)}</span></div>;
          const estados = [...new Set(mes.cuotas.map((fila) => fila.estado))];
          const etiqueta = mes.cuotas.length === 1 ? estados[0] : `${mes.cuotas.length} cuotas`;
          const tono = tonoDeCuotas(estados);
          return <button ref={(elemento) => { botonesMesRef.current[mes.periodoISO] = elemento; }} type="button" className={`tenant-calendar__month tenant-calendar__month--${tono}${periodoSeleccionado === mes.periodoISO ? " tenant-calendar__month--selected" : ""}`} key={mes.periodoISO} onClick={() => seleccionarMes(mes)} aria-pressed={periodoSeleccionado === mes.periodoISO} aria-label={`${mes.nombre} ${anio}: ${etiqueta}. Ver detalle`}>
            <span className="tenant-calendar__month-name">{mes.nombre}</span>{mes.cambioDeCondiciones && <span className="tenant-calendar__change">Cambiaron las condiciones</span>}<span className="tenant-calendar__status"><span className="tenant-calendar__dot" />{etiqueta}</span><span className="tenant-calendar__detail-link">Ver detalle <span aria-hidden="true">→</span></span>
          </button>;
        })}
      </div>
      {mesSeleccionado?.cuotas.length ? <section ref={detalleRef} className="tenant-calendar__detail" aria-label={`Detalle de ${mesSeleccionado.nombre.toLowerCase()} ${anio}`} tabIndex={-1}>
        <div className="tenant-calendar__detail-head"><div><p>{mesSeleccionado.cuotas.length > 1 ? "Detalle de las cuotas" : "Detalle de la cuota"}</p><h3>{mesSeleccionado.nombre} {anio}</h3></div><button type="button" className="tenant-calendar__close" onClick={cerrarDetalle}>Cerrar <span aria-hidden="true">×</span></button></div>
        <div className="tenant-calendar__invoices">{mesSeleccionado.cuotas.map((fila) => <CuotaDetalle key={fila.invoiceId} fila={fila} perteneceACondicionesAnteriores={fila.estado === "Vencida" && estado.calendar.coverage.slice(1).some((tramo) => fila.periodoISO < tramo.startDate.slice(0, 7))} subiendo={subiendo} viendoComprobante={viendoComprobante} inputsRef={inputsRef} subirComprobante={subirComprobante} verComprobante={verComprobante} />)}</div>
        {mesSeleccionado.importesPendientes.length > 0 && <section className="tenant-calendar__pending" aria-label="Importes pendientes de confirmación"><p>Importe pendiente de confirmación</p>{mesSeleccionado.importesPendientes.map((importe) => <span key={`${importe.contractId}-${importe.periodoISO}`}>{importe.monto}</span>)}<small>El importe puede cambiar antes de emitirse la cuota.</small></section>}
      </section> : null}
    </section>
    <p className="tenant-calendar__note">«Antes del contrato» y «Después del contrato» son meses fuera de la vigencia. «Sin cuota» todavía no tiene un importe para consultar. Un «Importe a confirmar» aún no es una cuota.</p>
  </main>;
}
