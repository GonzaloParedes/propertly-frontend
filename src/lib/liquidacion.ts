import { describirAjuste } from "@/lib/ajustes";
import type { ContractResponse, Currency, InvoiceResponse, PaymentResponse } from "@/lib/backend-types";
import type { FilaCobranza } from "@/lib/cobranzas";
import { formatearCuit } from "@/lib/cuit";
import {
  formatearDireccion,
  formatearFecha,
  formatearMonto,
  formatearPeriodo,
  hoyEnArgentina,
  simboloDe,
} from "@/lib/formato";
import { nombreDeInquilino } from "@/lib/inquilino";
import { montoEnLetras } from "@/lib/numero-en-letras";

/** El pago que respalda la liquidación: el confirmado que cargó el inquilino o el propietario. */
function pagoLiquidable(invoice: Pick<InvoiceResponse, "status" | "payments">): PaymentResponse | null {
  if (invoice.status !== "PAID") return null;
  // Un pago del alta (ONBOARDING) es historia registrada, sin fecha de pago real: no se documenta.
  return invoice.payments.find((p) => p.status === "CONFIRMED" && p.origin !== "ONBOARDING") ?? null;
}

/** Si la cuota admite el documento: pagada, con un pago confirmado que no es del alta. */
export function puedeEmitirLiquidacion(invoice: Pick<InvoiceResponse, "status" | "payments">): boolean {
  return pagoLiquidable(invoice) !== null;
}

/** Lo mismo, desde la fila de Cobranzas: «Pagada» (sin pago esperando revisión) y con el pago confirmado a mano. */
export function puedeEmitirLiquidacionDeFila(fila: Pick<FilaCobranza, "estado" | "pagoConfirmado">): boolean {
  return puedeEmitirLiquidacion({
    status: fila.estado === "Pagada" ? "PAID" : "DUE",
    payments: fila.pagoConfirmado ? [fila.pagoConfirmado] : [],
  });
}

export interface PersonaLiquidacion {
  nombre: string;
  /** Ausente si no se cargó: el documento omite la línea en vez de mostrarla vacía. */
  taxId?: string;
}

export interface ConceptoLiquidacion {
  descripcion: string;
  /** Línea chica bajo la descripción: «10 % del importe base», «12 días de atraso». */
  detalle?: string;
  /** Ya formateado y con signo cuando es un extra: «− $ 70.000», «+ $ 30.000». */
  monto: string;
  /** Todo lo que no es la cuota base. */
  extra: boolean;
}

export interface Liquidacion {
  numero: string;
  fechaEmision: string;
  emisor: PersonaLiquidacion;
  inquilino: PersonaLiquidacion;
  periodo: string;
  cuota: { numero: number; total: number };
  direccion: string;
  vigencia: { desde: string; hasta: string };
  moneda: Currency;
  /** Siempre `amountDue` del backend: el front no recalcula el recargo. */
  montoPagado: string;
  montoEnLetras: string;
  /** Ausente si el backend no informó cuándo se cargó el pago. */
  fechaPago?: string;
  comprobante?: string;
  /** Null cuando se pagó sólo la cuota base: el documento muestra el monto y nada más. */
  conceptos: ConceptoLiquidacion[] | null;
  nombreArchivo: string;
}

export interface EntradaLiquidacion {
  invoice: InvoiceResponse;
  contract: ContractResponse;
  owner: { firstName: string; lastName: string; taxId?: string | null };
  /** Día de emisión (Argentina); por omisión, hoy. */
  hoyISO?: string;
}

function persona(nombre: string, taxId?: string | null): PersonaLiquidacion {
  const cuit = formatearCuit(taxId ?? "");
  return cuit ? { nombre, taxId: cuit } : { nombre };
}

/** Cuántos meses van desde el mes de inicio del contrato hasta el del período, contando ambos. */
export function numeroDeCuota(inicioISO: string, periodoISO: string): number {
  const [anioInicio, mesInicio] = inicioISO.split("-").map(Number);
  const [anioPeriodo, mesPeriodo] = periodoISO.split("-").map(Number);
  return (anioPeriodo - anioInicio) * 12 + (mesPeriodo - mesInicio) + 1;
}

/** Con centavos sólo si los hay, para que la cifra y las palabras digan lo mismo. */
function montoExacto(monto: number, moneda: Currency): string {
  if (Math.round(monto * 100) % 100 === 0) return formatearMonto(monto, moneda);
  return `${simboloDe(moneda)} ${monto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function conceptosDe(invoice: InvoiceResponse, moneda: Currency): ConceptoLiquidacion[] | null {
  const recargo = invoice.lateFee && invoice.lateFee.amount > 0 ? invoice.lateFee : null;
  if (invoice.adjustments.length === 0 && !recargo) return null;

  const conceptos: ConceptoLiquidacion[] = [
    { descripcion: `Alquiler ${formatearPeriodo(invoice.period)}`, monto: montoExacto(invoice.baseAmount, moneda), extra: false },
  ];
  for (const ajuste of invoice.adjustments) {
    const { efecto, detalle } = describirAjuste(ajuste, invoice.baseAmount, moneda);
    conceptos.push({ descripcion: ajuste.name, ...(detalle ? { detalle } : {}), monto: efecto, extra: true });
  }
  if (recargo) {
    conceptos.push({
      descripcion: "Recargo por atraso",
      detalle: `${recargo.daysLate} ${recargo.daysLate === 1 ? "día" : "días"} de atraso`,
      monto: `+ ${montoExacto(recargo.amount, moneda)}`,
      extra: true,
    });
  }
  return conceptos;
}

/**
 * El modelo de vista del PDF de liquidación: todo lo que el documento dice, ya
 * resuelto, para que el componente sólo lo dibuje. Lanza si la cuota no es
 * liquidable (`puedeEmitirLiquidacion`).
 */
export function armarLiquidacion({ invoice, contract, owner, hoyISO = hoyEnArgentina() }: EntradaLiquidacion): Liquidacion {
  const pago = pagoLiquidable(invoice);
  if (!pago) throw new Error("La cuota no tiene un pago confirmado que se pueda liquidar.");

  const moneda: Currency = invoice.currency ?? contract.currency ?? "ARS";
  const monto = invoice.amountDue;

  return {
    numero: `N° ${String(pago.id).padStart(8, "0")}`,
    fechaEmision: formatearFecha(hoyISO),
    emisor: persona(`${owner.firstName} ${owner.lastName}`.trim(), owner.taxId),
    inquilino: persona(nombreDeInquilino(contract.tenant), contract.tenant.taxId),
    periodo: formatearPeriodo(invoice.period),
    cuota: { numero: numeroDeCuota(contract.startDate, invoice.period), total: contract.termMonths },
    direccion: formatearDireccion(contract.property),
    vigencia: { desde: formatearFecha(contract.startDate), hasta: formatearFecha(contract.endDate) },
    moneda,
    montoPagado: montoExacto(monto, moneda),
    montoEnLetras: montoEnLetras(monto, moneda),
    ...(pago.submittedAt ? { fechaPago: formatearFecha(hoyEnArgentina(new Date(pago.submittedAt))) } : {}),
    ...(pago.receiptFileName ? { comprobante: pago.receiptFileName } : {}),
    conceptos: conceptosDe(invoice, moneda),
    nombreArchivo: `liquidacion-${invoice.period.slice(0, 7)}-${pago.id}.pdf`,
  };
}
