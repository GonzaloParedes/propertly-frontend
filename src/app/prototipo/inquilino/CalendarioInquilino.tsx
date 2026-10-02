"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { aniosDelCalendario, buildFilasInquilino, mesesDelCalendario } from "@/lib/portal-inquilino";
import type { TenantCalendarCoverage, TenantCalendarInvoiceResponse } from "@/lib/backend-types";
import "./calendario-inquilino.css";

// Datos ficticios para probar el historial de un contrato que fue reemplazado.
const COBERTURA: TenantCalendarCoverage[] = [
  { startDate: "2025-06-15", effectiveEndDate: "2025-09-30" },
  { startDate: "2025-10-01", effectiveEndDate: "2027-05-31" },
];

const CUOTAS: TenantCalendarInvoiceResponse[] = [
  ...Array.from({ length: 4 }, (_, indice) => {
    const mes = indice + 5;
    return {
      id: 202500 + mes,
      contractId: 1,
      period: `2025-${String(mes + 1).padStart(2, "0")}-01`,
      dueDate: `2025-${String(mes + 1).padStart(2, "0")}-10`,
      baseAmount: 410000,
      total: 410000,
      status: mes === 8 ? "DUE" as const : "PAID" as const,
      confirmed: true,
      adjustments: [],
      payments: [],
      canSubmitPayment: true,
    };
  }),
  ...Array.from({ length: 3 }, (_, indice) => {
    const mes = indice + 9;
    return {
      id: 202500 + mes,
      contractId: 2,
      period: `2025-${String(mes + 1).padStart(2, "0")}-01`,
      dueDate: `2025-${String(mes + 1).padStart(2, "0")}-10`,
      baseAmount: 455000,
      total: 455000,
      status: "PAID" as const,
      confirmed: true,
      adjustments: [],
      payments: [],
      canSubmitPayment: false,
    };
  }),
  ...Array.from({ length: 8 }, (_, mes) => ({
    id: 202600 + mes,
    contractId: 2,
    period: `2026-${String(mes + 1).padStart(2, "0")}-01`,
    dueDate: `2026-${String(mes + 1).padStart(2, "0")}-10`,
    baseAmount: 478691,
    total: 478691,
    status: "PAID" as const,
    confirmed: true,
    adjustments: [],
    payments: [],
    canSubmitPayment: false,
  })),
  {
    id: 202609, contractId: 2, period: "2026-09-01", dueDate: "2026-09-10",
    baseAmount: 478691, total: 478691, status: "DUE", confirmed: true,
    adjustments: [], payments: [], canSubmitPayment: true,
  },
  {
    id: 202610, contractId: 2, period: "2026-10-01", dueDate: "2026-10-10",
    baseAmount: 478691, total: 480022, status: "PENDING", confirmed: true,
    adjustments: [{ id: 7, name: "Reparación del calefón", kind: "SURCHARGE", valueType: "FIXED_AMOUNT", value: 1331 }],
    payments: [{ id: 10, invoiceId: 202610, status: "AWAITING_CONFIRMATION", submittedByTenant: true }], canSubmitPayment: false,
  },
  {
    id: 202611, contractId: 2, period: "2026-11-01", dueDate: "2026-11-10",
    baseAmount: 478691, total: 478691, status: "PENDING", confirmed: true,
    adjustments: [], payments: [], canSubmitPayment: true,
  },
  {
    id: 202612, contractId: 2, period: "2026-12-01", dueDate: "2026-12-10",
    baseAmount: 478691, total: 478691, status: "PENDING", confirmed: false,
    adjustments: [], payments: [], canSubmitPayment: false,
  },
  ...Array.from({ length: 3 }, (_, mes) => ({
    id: 202700 + mes,
    contractId: 2,
    period: `2027-${String(mes + 1).padStart(2, "0")}-01`,
    dueDate: `2027-${String(mes + 1).padStart(2, "0")}-10`,
    baseAmount: 478691,
    total: 478691,
    status: "PENDING" as const,
    confirmed: false,
    adjustments: [],
    payments: [],
    canSubmitPayment: false,
  })),
];

const FILAS = buildFilasInquilino(CUOTAS);
const ANIOS = aniosDelCalendario(COBERTURA, FILAS);

export default function CalendarioInquilino() {
  const [anio, setAnio] = useState(2026);
  const [mostrarAnios, setMostrarAnios] = useState(false);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string | null>(null);
  const detalleRef = useRef<HTMLElement>(null);
  const botonesRef = useRef<Record<number, HTMLButtonElement | null>>({});

  const meses = mesesDelCalendario(anio, COBERTURA, FILAS);
  const mesSeleccionado = meses.find((mes) => mes.periodoISO === periodoSeleccionado);
  const filaSeleccionada = mesSeleccionado?.cuotas[0] ?? null;

  function cambiarAnio(siguiente: number) {
    if (!ANIOS.includes(siguiente)) return;
    setAnio(siguiente);
    setPeriodoSeleccionado(null);
    setMostrarAnios(false);
  }

  function abrirMes(periodo: string) {
    setPeriodoSeleccionado(periodo);
    requestAnimationFrame(() => detalleRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  function cerrarDetalle() {
    const periodo = periodoSeleccionado;
    setPeriodoSeleccionado(null);
    if (periodo) requestAnimationFrame(() => botonesRef.current[Number(periodo.slice(-2)) - 1]?.focus());
  }

  return (
    <main className="calinquilino">
      <div className="calinquilino__marca">
        <Image src="/logos/lockup.svg" alt="Alquia" width={116} height={40} />
        <span>Vista de prueba · datos de ejemplo</span>
      </div>

      <header className="calinquilino__encabezado">
        <div>
          <p className="calinquilino__eyebrow">Su alquiler, mes a mes</p>
          <h1>Sus cuotas</h1>
          <p>Elija un mes para ver cuánto vence y el detalle del pago.</p>
          <p className="calinquilino__contrato">El contrato comenzó en junio de 2025 y cambió sus condiciones en octubre.</p>
        </div>
      </header>

      <section className="calinquilino__panel" aria-label="Cuotas por año">
        <div className="calinquilino__barra">
          <div>
            <h2>Cuotas de {anio}</h2>
            <p>Seleccione un mes para ver su cuota.</p>
          </div>
          <div className="calinquilino__anios" aria-label="Cambiar año">
            <button type="button" onClick={() => cambiarAnio(anio - 1)} disabled={anio === ANIOS[0]} aria-label="Año anterior">‹</button>
            <div className="calinquilino__selector">
              <button type="button" className="calinquilino__anio-actual" onClick={() => setMostrarAnios(!mostrarAnios)} aria-expanded={mostrarAnios} aria-label={`Elegir año, actual ${anio}`}>
                {anio} <span aria-hidden="true">⌄</span>
              </button>
              {mostrarAnios && (
                <div className="calinquilino__opciones" aria-label="Años disponibles">
                  {ANIOS.map((opcion) => (
                    <button type="button" key={opcion} aria-current={opcion === anio ? "date" : undefined} onClick={() => cambiarAnio(opcion)}>{opcion}</button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => cambiarAnio(anio + 1)} disabled={anio === ANIOS[ANIOS.length - 1]} aria-label="Año siguiente">›</button>
          </div>
        </div>

        <div className="calinquilino__meses">
          {meses.map((mes, indice) => {
            const fila = mes.cuotas[0];
            if (!fila) {
              const etiquetaVacia = mes.estado === "antes-del-contrato" ? "Antes del contrato" : mes.estado === "despues-del-contrato" ? "Después del contrato" : mes.estado === "sin-contrato-vigente" ? "Sin contrato vigente" : "Sin cuota generada";
              return (
                <div className="calinquilino__mes calinquilino__mes--vacio" key={mes.nombre}>
                  <span className="calinquilino__mes-nombre">{mes.nombre}</span>
                  <span>{etiquetaVacia}</span>
                </div>
              );
            }
            const tono = fila.estado === "Pagada" ? "ok" : fila.estado === "Vencida" ? "bad" : fila.estado === "Pago a confirmar" ? "info" : "warn";
            return (
              <button
                ref={(elemento) => { botonesRef.current[indice] = elemento; }}
                type="button"
                className={`calinquilino__mes calinquilino__mes--${tono}${periodoSeleccionado === mes.periodoISO ? " calinquilino__mes--elegido" : ""}`}
                key={mes.nombre}
                onClick={() => abrirMes(mes.periodoISO)}
                aria-pressed={periodoSeleccionado === mes.periodoISO}
                aria-label={`${mes.nombre} ${anio}: ${fila.estado}. Ver detalle`}
              >
                <span className="calinquilino__mes-nombre">{mes.nombre}</span>
                {mes.cambioDeCondiciones && <span className="calinquilino__cambio">Cambiaron las condiciones</span>}
                <span className="calinquilino__estado"><span className="calinquilino__punto" />{fila.estado}</span>
                <span className="calinquilino__ver">Ver detalle <span aria-hidden="true">→</span></span>
              </button>
            );
          })}
        </div>

        {filaSeleccionada && (
          <section ref={detalleRef} className="calinquilino__detalle" aria-label={`Detalle de ${filaSeleccionada.periodo}`} tabIndex={-1}>
            <div className="calinquilino__detalle-cabecera">
              <div>
                <p>Detalle de la cuota</p>
                <h3>{filaSeleccionada.periodo}</h3>
              </div>
              <button type="button" className="calinquilino__cerrar" onClick={cerrarDetalle} aria-label="Cerrar detalle">Cerrar <span aria-hidden="true">×</span></button>
            </div>
            <div className="calinquilino__datos">
              <div><span>Estado</span><strong>{filaSeleccionada.estado}</strong></div>
              <div><span>Vencimiento</span><strong>{filaSeleccionada.vencimiento}</strong></div>
              <div><span>Importe</span><strong>{filaSeleccionada.monto}</strong></div>
            </div>
            {filaSeleccionada.ajustes.length > 0 && (
              <dl className="calinquilino__ajustes" aria-label="Detalle del importe">
                <div><dt>Importe del contrato</dt><dd>{filaSeleccionada.importeBase}</dd></div>
                {filaSeleccionada.ajustes.map((ajuste) => <div key={ajuste.id}><dt>{ajuste.nombre}</dt><dd>{ajuste.efecto}</dd></div>)}
              </dl>
            )}
            {!filaSeleccionada.confirmada && <p className="calinquilino__aviso">El propietario todavía no cerró este importe: puede cambiar.</p>}
            {filaSeleccionada.estado === "Pago a confirmar" && <p className="calinquilino__info">Su comprobante está esperando confirmación del propietario.</p>}
            {filaSeleccionada.estado === "Vencida" && <p className="calinquilino__aviso">Esta cuota sigue pendiente aunque las condiciones hayan cambiado. Puede consultar con el propietario cómo regularizar el pago.</p>}
          </section>
        )}
      </section>
      <p className="calinquilino__nota">«Antes del contrato» significa que aún no correspondía pagar. «Sin cuota generada» significa que todavía no hay un importe para consultar. El historial muestra las cuotas previas y posteriores al cambio.</p>
    </main>
  );
}
