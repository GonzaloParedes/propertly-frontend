"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  aniosDelCalendario,
  buildFilasInquilino,
  buildImportesPendientesInquilino,
  mesesDelCalendario,
  type FilaCuotaInquilino,
  type MesCalendarioInquilino,
} from "@/lib/portal-inquilino";
import type { TenantCalendarCoverage, TenantCalendarInvoiceResponse, TenantCalendarPreInvoiceResponse } from "@/lib/backend-types";
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
const PRECUOTAS: TenantCalendarPreInvoiceResponse[] = [
  { contractId: 2, period: "2027-04-01", amount: 510000 },
  { contractId: 2, period: "2027-05-01", amount: 510000 },
];
const IMPORTES_PENDIENTES = buildImportesPendientesInquilino(PRECUOTAS);
const ANIOS = aniosDelCalendario(COBERTURA, FILAS, IMPORTES_PENDIENTES);

const ETIQUETAS_MESES_SIN_CUOTA: Record<MesCalendarioInquilino["estado"], string> = {
  cuota: "",
  "importe-pendiente-confirmacion": "",
  "antes-del-contrato": "Antes del contrato",
  "despues-del-contrato": "Después del contrato",
  "sin-contrato-vigente": "Sin contrato vigente",
  "sin-cuota-generada": "Sin cuota",
};

const TONOS_DE_CUOTA: Record<FilaCuotaInquilino["estado"], "ok" | "bad" | "info" | "warn"> = {
  Pagada: "ok",
  Vencida: "bad",
  "Pago a confirmar": "info",
  "A vencer": "warn",
};

function MesEstimado({ mes }: Readonly<{ mes: MesCalendarioInquilino }>) {
  return (
    <div className="calinquilino__mes calinquilino__mes--estimado">
      <span className="calinquilino__mes-nombre">{mes.nombre}</span>
      <span className="calinquilino__estimado-montos">{mes.importesPendientes.map((importe) => <span key={`${importe.contractId}-${importe.periodoISO}`}>{importe.monto}</span>)}</span>
      <span className="calinquilino__estimado-estado">Importe a confirmar</span>
    </div>
  );
}

function MesSinCuota({ mes }: Readonly<{ mes: MesCalendarioInquilino }>) {
  return (
    <div className="calinquilino__mes calinquilino__mes--vacio">
      <span className="calinquilino__mes-nombre">{mes.nombre}</span>
      <span className="calinquilino__vacio-estado">{ETIQUETAS_MESES_SIN_CUOTA[mes.estado]}</span>
    </div>
  );
}

function MesConCuota({ anio, fila, indice, mes, periodoSeleccionado, onAbrir, onButtonRef }: Readonly<{
  anio: number;
  fila: FilaCuotaInquilino;
  indice: number;
  mes: MesCalendarioInquilino;
  periodoSeleccionado: string | null;
  onAbrir: (periodo: string) => void;
  onButtonRef: (indice: number, elemento: HTMLButtonElement | null) => void;
}>) {
  const tono = TONOS_DE_CUOTA[fila.estado];
  const seleccionada = periodoSeleccionado === mes.periodoISO;
  const claseSeleccionada = seleccionada ? " calinquilino__mes--elegido" : "";
  return (
    <button
      ref={(elemento) => onButtonRef(indice, elemento)}
      type="button"
      className={`calinquilino__mes calinquilino__mes--${tono}${claseSeleccionada}`}
      onClick={() => onAbrir(mes.periodoISO)}
      aria-pressed={seleccionada}
      aria-label={`${mes.nombre} ${anio}: ${fila.estado}. Ver detalle`}
    >
      <span className="calinquilino__mes-nombre">{mes.nombre}</span>
      {mes.cambioDeCondiciones && <span className="calinquilino__cambio">Cambiaron las condiciones</span>}
      <span className="calinquilino__estado"><span className="calinquilino__punto" />{fila.estado}</span>
      <span className="calinquilino__ver">Ver detalle <span aria-hidden="true">→</span></span>
    </button>
  );
}

function MesDelCalendario({ anio, indice, mes, periodoSeleccionado, onAbrir, onButtonRef }: Readonly<{
  anio: number;
  indice: number;
  mes: MesCalendarioInquilino;
  periodoSeleccionado: string | null;
  onAbrir: (periodo: string) => void;
  onButtonRef: (indice: number, elemento: HTMLButtonElement | null) => void;
}>) {
  if (mes.estado === "importe-pendiente-confirmacion") return <MesEstimado mes={mes} />;
  const fila = mes.cuotas[0];
  if (!fila) return <MesSinCuota mes={mes} />;
  return <MesConCuota anio={anio} fila={fila} indice={indice} mes={mes} periodoSeleccionado={periodoSeleccionado} onAbrir={onAbrir} onButtonRef={onButtonRef} />;
}

export default function CalendarioInquilino() {
  const [anio, setAnio] = useState(2026);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string | null>(null);
  const detalleRef = useRef<HTMLElement>(null);
  const botonesRef = useRef<Record<number, HTMLButtonElement | null>>({});

  const meses = mesesDelCalendario(anio, COBERTURA, FILAS, IMPORTES_PENDIENTES);
  const mesSeleccionado = meses.find((mes) => mes.periodoISO === periodoSeleccionado);
  const filaSeleccionada = mesSeleccionado?.cuotas[0] ?? null;

  function seleccionarAnio(siguiente: number) {
    setAnio(siguiente);
    setPeriodoSeleccionado(null);
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
          <p className="calinquilino__eyebrow">Hola, Lucía Fernández</p>
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
            {ANIOS.map((opcion) => <button type="button" className={`calinquilino__anio-tab${opcion === anio ? " calinquilino__anio-tab--elegido" : ""}`} key={opcion} aria-pressed={opcion === anio} onClick={() => seleccionarAnio(opcion)}>{opcion}</button>)}
          </div>
        </div>

        <div className="calinquilino__meses">
          {meses.map((mes, indice) => <MesDelCalendario
            anio={anio}
            indice={indice}
            key={mes.periodoISO}
            mes={mes}
            periodoSeleccionado={periodoSeleccionado}
            onAbrir={abrirMes}
            onButtonRef={(indiceDeMes, elemento) => { botonesRef.current[indiceDeMes] = elemento; }}
          />)}
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
      <p className="calinquilino__nota">«Antes del contrato» significa que aún no correspondía pagar. «Sin cuota» significa que todavía no hay un importe para consultar. El historial muestra las cuotas previas y posteriores al cambio.</p>
    </main>
  );
}
