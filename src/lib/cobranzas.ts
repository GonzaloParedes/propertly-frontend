import { formatearDireccion, formatearFecha, formatearMonto, formatearPeriodo } from "@/lib/formato";
import type {
  AdjustmentResponse,
  ContractResponse,
  InvoiceResponse,
  PaymentResponse,
} from "@/lib/backend-types";

/**
 * Los cuatro estados del dinero que ya define el sistema de diseño, menos
 * «Proyectada»: esa sale de `PreInvoice`, que el backend todavía no expone
 * (P0-2 en docs/backend/pedido-de-cambios-api.md).
 *
 * «Pago a confirmar» no es un estado de la cuota sino del pago, pero gana:
 * mientras haya un comprobante esperando, lo que la pantalla tiene que decir es
 * que falta un click del propietario, no que la cuota está vencida.
 */
export type EstadoCuota = "Pagada" | "Vencida" | "A vencer" | "Pago a confirmar";

/**
 * Lo único que se puede hacer con la cuota, ya resuelto acá para que la tabla no
 * tenga que encadenar condiciones. El orden importa y lo impone el backend:
 * una cuota sin confirmar no acepta pagos («Cannot submit a payment for an
 * unconfirmed invoice»), así que confirmar va antes que registrar.
 */
export type AccionCuota = "revisar" | "confirmar" | "registrar" | "comprobante";

export interface FilaCobranza {
  invoiceId: number;
  direccion: string;
  inquilino: string;
  periodo: string;
  monto: string;
  /**
   * Los tres en crudo, además del monto ya formateado: el diálogo de ajuste
   * calcula la diferencia contra el total vigente y muestra de dónde sale.
   */
  importeBase: number;
  totalVigente: number;
  ajustes: AdjustmentResponse[];
  vencimiento: string;
  vencimientoISO: string;
  estado: EstadoCuota;
  confirmada: boolean;
  accion: AccionCuota;
  /** El pago que espera resolución, para el diálogo de revisión. */
  pagoPendiente: PaymentResponse | null;
  /** El pago aceptado, para poder bajar su comprobante. */
  pagoConfirmado: PaymentResponse | null;
}

export function estadoDeCuota(invoice: InvoiceResponse): EstadoCuota {
  if (invoice.payments.some((p) => p.status === "AWAITING_CONFIRMATION")) {
    return "Pago a confirmar";
  }
  if (invoice.status === "PAID") return "Pagada";
  if (invoice.status === "DUE") return "Vencida";
  return "A vencer";
}

function accionDeCuota(invoice: InvoiceResponse, estado: EstadoCuota): AccionCuota {
  if (estado === "Pago a confirmar") return "revisar";
  if (!invoice.confirmed) return "confirmar";
  if (estado === "Pagada") return "comprobante";
  return "registrar";
}

/**
 * Cruza cuotas con contratos para poder nombrar cada fila por su propiedad e
 * inquilino: `InvoiceResponse` sólo trae `contractId`.
 *
 * Se ordena por vencimiento descendente porque `GET /invoices` todavía no se
 * puede acotar por período (P0-5) y devuelve la historia entera: así lo que
 * necesita atención hoy queda arriba en vez de sepultado bajo dos años de
 * cuotas pagadas. Cuando exista el filtro, esto pasa a ser un selector de mes.
 */
export function buildFilasCobranza(
  invoices: InvoiceResponse[],
  contracts: ContractResponse[]
): FilaCobranza[] {
  const porContrato = new Map(contracts.map((c) => [c.id, c]));

  return invoices
    .map((invoice) => {
      const contrato = porContrato.get(invoice.contractId);
      const estado = estadoDeCuota(invoice);
      return {
        invoiceId: invoice.id,
        direccion: contrato ? formatearDireccion(contrato.property) : "—",
        inquilino: contrato ? `${contrato.tenant.firstName} ${contrato.tenant.lastName}` : "—",
        periodo: formatearPeriodo(invoice.period),
        monto: formatearMonto(invoice.total),
        importeBase: invoice.baseAmount,
        totalVigente: invoice.total,
        ajustes: invoice.adjustments,
        vencimiento: formatearFecha(invoice.dueDate),
        vencimientoISO: invoice.dueDate,
        estado,
        confirmada: invoice.confirmed,
        accion: accionDeCuota(invoice, estado),
        pagoPendiente: invoice.payments.find((p) => p.status === "AWAITING_CONFIRMATION") ?? null,
        pagoConfirmado: invoice.payments.find((p) => p.status === "CONFIRMED") ?? null,
      };
    })
    .sort((a, b) => b.vencimientoISO.localeCompare(a.vencimientoISO));
}

/**
 * Las cuotas que le piden algo al propietario: las vencidas y las que tienen un
 * comprobante esperando su revisión. Es el número del menú lateral.
 */
export function contarCuotasPendientes(invoices: InvoiceResponse[]): number {
  return invoices.filter((i) => {
    const estado = estadoDeCuota(i);
    return estado === "Vencida" || estado === "Pago a confirmar";
  }).length;
}

export type FiltroCobranza = "todas" | "vencidas" | "aVencer" | "pagadas";

const COINCIDE: Record<FiltroCobranza, (fila: FilaCobranza) => boolean> = {
  todas: () => true,
  vencidas: (fila) => fila.estado === "Vencida",
  // Una cuota con el pago esperando confirmación todavía no está cobrada, así
  // que cuenta como pendiente y no como pagada.
  aVencer: (fila) => fila.estado === "A vencer" || fila.estado === "Pago a confirmar",
  pagadas: (fila) => fila.estado === "Pagada",
};

export function filtrar(filas: FilaCobranza[], filtro: FiltroCobranza): FilaCobranza[] {
  return filas.filter(COINCIDE[filtro]);
}

export function contarPorFiltro(filas: FilaCobranza[]): Record<FiltroCobranza, number> {
  return {
    todas: filas.length,
    vencidas: filtrar(filas, "vencidas").length,
    aVencer: filtrar(filas, "aVencer").length,
    pagadas: filtrar(filas, "pagadas").length,
  };
}

/** La bajada del encabezado, que dice lo que hay en vez de afirmar un mes fijo. */
export function resumenCobranzas(filas: FilaCobranza[]): string {
  if (filas.length === 0) return "Todavía no hay cuotas emitidas.";
  const { vencidas, aVencer } = contarPorFiltro(filas);
  const partes = [
    vencidas > 0 && `${vencidas} ${vencidas === 1 ? "vencida" : "vencidas"}`,
    aVencer > 0 && `${aVencer} por cobrar`,
  ].filter(Boolean);
  const cantidad = `${filas.length} ${filas.length === 1 ? "cuota" : "cuotas"}`;
  const detalle = partes.length > 0 ? partes.join(" · ") : "todo cobrado";
  return `${cantidad} · ${detalle}`;
}
