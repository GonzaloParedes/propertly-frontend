import { estadoDeCuota, type EstadoCuota } from "@/lib/cobranzas";
import { formatearFecha, formatearMonto, formatearPeriodo } from "@/lib/formato";
import type { InvoiceResponse, PaymentResponse } from "@/lib/backend-types";

/**
 * La misma cuota vista del otro lado. El estado sale de `estadoDeCuota`
 * —el criterio de Cobranzas—, no de uno propio: si en algún momento cambia qué
 * cuenta como «vencida», tiene que cambiar en un solo lugar o el propietario y
 * el inquilino terminan viendo dos verdades distintas de la misma cuota.
 */
export interface FilaCuotaInquilino {
  invoiceId: number;
  periodo: string;
  vencimiento: string;
  vencimientoISO: string;
  monto: string;
  estado: EstadoCuota;
  confirmada: boolean;
  /** El pago sobre el que el inquilino puede actuar o mirar, si hay alguno. */
  pago: PaymentResponse | null;
  puedeSubirComprobante: boolean;
}

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

export function buildFilasInquilino(invoices: InvoiceResponse[]): FilaCuotaInquilino[] {
  return invoices.map((invoice) => ({
    invoiceId: invoice.id,
    periodo: formatearPeriodo(invoice.period),
    vencimiento: formatearFecha(invoice.dueDate),
    vencimientoISO: invoice.dueDate,
    monto: formatearMonto(invoice.total),
    estado: estadoDeCuota(invoice),
    confirmada: invoice.confirmed,
    pago: pagoRelevante(invoice),
    puedeSubirComprobante: puedeSubirComprobante(invoice),
  }));
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
