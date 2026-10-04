import { describirAjuste, type LineaAjuste } from "@/lib/ajustes";
import { estadoDeCuota, type EstadoCuota } from "@/lib/cobranzas";
import { formatearFecha, formatearMonto, formatearPeriodo } from "@/lib/formato";
import type {
  InvoiceResponse,
  PaymentResponse,
  TenantCalendarCoverage,
  TenantCalendarInvoiceResponse,
  TenantCalendarPreInvoiceResponse,
} from "@/lib/backend-types";

/**
 * La misma cuota vista del otro lado. El estado sale de `estadoDeCuota`
 * —el criterio de Cobranzas—, no de uno propio: si en algún momento cambia qué
 * cuenta como «vencida», tiene que cambiar en un solo lugar o el propietario y
 * el inquilino terminan viendo dos verdades distintas de la misma cuota.
 */
export interface FilaCuotaInquilino {
  invoiceId: number;
  periodo: string;
  /** Mes ISO que ubica la cuota en el calendario, no el vencimiento. */
  periodoISO: string;
  vencimiento: string;
  vencimientoISO: string;
  monto: string;
  /** El importe antes de ajustes; sólo importa si hay ajustes que lo expliquen. */
  importeBase: string;
  /**
   * Cada ajuste con el motivo que escribió el propietario (`name`). Sin esto el
   * inquilino ve un total distinto al de su contrato y no sabe por qué.
   */
  ajustes: LineaAjuste[];
  estado: EstadoCuota;
  confirmada: boolean;
  /** El pago sobre el que el inquilino puede actuar o mirar, si hay alguno. */
  pago: PaymentResponse | null;
  puedeSubirComprobante: boolean;
}

/** Un importe conocido para el mes, aún no emitido como cuota ni confirmado. */
export interface ImportePendienteInquilino {
  contractId: number;
  periodoISO: string;
  monto: string;
}

export type EstadoMesCalendario =
  | "cuota"
  | "importe-pendiente-confirmacion"
  | "antes-del-contrato"
  | "sin-cuota-generada"
  | "sin-contrato-vigente"
  | "despues-del-contrato";

export interface MesCalendarioInquilino {
  periodoISO: string;
  nombre: string;
  estado: EstadoMesCalendario;
  cuotas: FilaCuotaInquilino[];
  importesPendientes: ImportePendienteInquilino[];
  cambioDeCondiciones: boolean;
}

const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/**
 * Sube comprobante cuando la cuota está confirmada —regla ya decidida en
 * `sistema-ui.md`: mostrar el botón sobre una cuota sin confirmar sólo lleva a
 * un 400— y no tiene un pago activo. `REJECTED` no cuenta como activo: el
 * backend lo excluye a propósito (`PaymentService.submit`) para que el
 * inquilino pueda volver a intentar después de un rechazo.
 */
export function puedeSubirComprobante(invoice: InvoiceResponse): boolean {
  if (!invoice.confirmed) return false;
  const activo = invoice.payments.find(
    (p) => p.status === "AWAITING_CONFIRMATION" || p.status === "CONFIRMED"
  );
  return activo === undefined;
}

/** El pago que le importa mostrar al inquilino: el más reciente, cualquiera sea su estado. */
function pagoRelevante(invoice: InvoiceResponse): PaymentResponse | null {
  if (invoice.payments.length === 0) return null;
  return [...invoice.payments].sort((a, b) => b.id - a.id)[0];
}

export function buildFilasInquilino(
  invoices: (InvoiceResponse | TenantCalendarInvoiceResponse)[]
): FilaCuotaInquilino[] {
  return invoices.map((invoice) => ({
    invoiceId: invoice.id,
    periodo: formatearPeriodo(invoice.period),
    periodoISO: invoice.period.slice(0, 7),
    vencimiento: formatearFecha(invoice.dueDate),
    vencimientoISO: invoice.dueDate,
    monto: formatearMonto(invoice.total),
    importeBase: formatearMonto(invoice.baseAmount),
    ajustes: invoice.adjustments.map((a) => describirAjuste(a, invoice.baseAmount)),
    estado: estadoDeCuota(invoice),
    confirmada: invoice.confirmed,
    pago: pagoRelevante(invoice),
    // En el calendario real la autorización viene del backend. El fallback se
    // conserva para el prototipo y los consumidores históricos de esta función.
    puedeSubirComprobante:
      "canSubmitPayment" in invoice ? invoice.canSubmitPayment : puedeSubirComprobante(invoice),
  }));
}

export function buildImportesPendientesInquilino(
  preInvoices: TenantCalendarPreInvoiceResponse[] | undefined
): ImportePendienteInquilino[] {
  return (preInvoices ?? []).map((preInvoice) => ({
    contractId: preInvoice.contractId,
    periodoISO: preInvoice.period.slice(0, 7),
    monto: formatearMonto(preInvoice.amount),
  }));
}

function mesISO(fecha: string): string {
  return fecha.slice(0, 7);
}

function estaCubierto(periodo: string, coverage: TenantCalendarCoverage[]): boolean {
  return coverage.some(({ startDate, effectiveEndDate }) => {
    return periodo >= mesISO(startDate) && periodo <= mesISO(effectiveEndDate);
  });
}

/** Años que el selector debe poder mostrar: vigencia e historial de cuotas. */
export function aniosDelCalendario(
  coverage: TenantCalendarCoverage[],
  filas: FilaCuotaInquilino[],
  importesPendientes: ImportePendienteInquilino[] = []
): number[] {
  const anios = new Set<number>();
  for (const intervalo of coverage) {
    for (let anio = Number(intervalo.startDate.slice(0, 4)); anio <= Number(intervalo.effectiveEndDate.slice(0, 4)); anio += 1) {
      anios.add(anio);
    }
  }
  for (const fila of filas) anios.add(Number(fila.periodoISO.slice(0, 4)));
  for (const importe of importesPendientes) anios.add(Number(importe.periodoISO.slice(0, 4)));
  return [...anios].sort((a, b) => a - b);
}

/**
 * Clasifica los 12 meses de un año a partir de los intervalos del backend. La
 * existencia de una cuota siempre gana: un dato histórico inconsistente sigue
 * siendo consultable y nunca desaparece por la etiqueta de vigencia.
 */
export function mesesDelCalendario(
  anio: number,
  coverage: TenantCalendarCoverage[],
  filas: FilaCuotaInquilino[],
  importesPendientes: ImportePendienteInquilino[] = []
): MesCalendarioInquilino[] {
  const porPeriodo = new Map<string, FilaCuotaInquilino[]>();
  for (const fila of filas) {
    const existentes = porPeriodo.get(fila.periodoISO) ?? [];
    existentes.push(fila);
    porPeriodo.set(fila.periodoISO, existentes);
  }
  const pendientesPorPeriodo = new Map<string, ImportePendienteInquilino[]>();
  for (const importe of importesPendientes) {
    const existentes = pendientesPorPeriodo.get(importe.periodoISO) ?? [];
    existentes.push(importe);
    pendientesPorPeriodo.set(importe.periodoISO, existentes);
  }
  const inicio = coverage[0] ? mesISO(coverage[0].startDate) : undefined;
  const fin = coverage.at(-1) ? mesISO(coverage.at(-1)!.effectiveEndDate) : undefined;
  const iniciosSucesores = new Set(coverage.slice(1).map((intervalo) => mesISO(intervalo.startDate)));

  return NOMBRES_MESES.map((nombre, indice) => {
    const periodoISO = `${anio}-${String(indice + 1).padStart(2, "0")}`;
    const cuotas = porPeriodo.get(periodoISO) ?? [];
    const pendientes = pendientesPorPeriodo.get(periodoISO) ?? [];
    let estado: EstadoMesCalendario;
    if (cuotas.length > 0) estado = "cuota";
    else if (pendientes.length > 0) estado = "importe-pendiente-confirmacion";
    else if (inicio && periodoISO < inicio) estado = "antes-del-contrato";
    else if (fin && periodoISO > fin) estado = "despues-del-contrato";
    else if (estaCubierto(periodoISO, coverage)) estado = "sin-cuota-generada";
    else estado = "sin-contrato-vigente";
    return {
      periodoISO,
      nombre,
      estado,
      cuotas,
      importesPendientes: pendientes,
      cambioDeCondiciones: iniciosSucesores.has(periodoISO),
    };
  });
}

/**
 * Las que requieren atención primero: vencida, a vencer, pago a confirmar, y
 * recién después las pagadas — el inquilino entra a mirar qué le falta, no a
 * repasar lo que ya está resuelto.
 */
const ORDEN: Record<EstadoCuota, number> = {
  Vencida: 0,
  "A vencer": 1,
  "Pago a confirmar": 2,
  Pagada: 3,
};

export function ordenarCuotas(filas: FilaCuotaInquilino[]): FilaCuotaInquilino[] {
  return [...filas].sort((a, b) => {
    const porEstado = ORDEN[a.estado] - ORDEN[b.estado];
    if (porEstado !== 0) return porEstado;
    return a.vencimientoISO.localeCompare(b.vencimientoISO);
  });
}
