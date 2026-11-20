import { estadoDeCuota, type EstadoCuota } from "@/lib/cobranzas";
import { formatearDireccion, formatearFecha, formatearMonto, formatearTotales, sumarEnMoneda, type TotalesPorMoneda } from "@/lib/formato";
import type {
  ContractResponse,
  Currency,
  InvoiceResponse,
  PreInvoiceResponse,
  PropertyResponse,
} from "@/lib/backend-types";

/**
 * El `period` de la API es un `LocalDate`, no un mes: hay que mandar el día 1
 * («2026-09-01»), y `period=2026-09` devuelve 400. Verificado contra la
 * instancia el 28/09/2026.
 */
export function periodoCorriente(hoyISO: string): string {
  return `${hoyISO.slice(0, 7)}-01`;
}

export function periodoSiguiente(hoyISO: string): string {
  const [anio, mes] = hoyISO.split("-").map(Number);
  return new Date(Date.UTC(anio, mes, 1)).toISOString().slice(0, 10);
}

// --- Cobranza del mes ---

export interface ResumenCobranza {
  /** Por moneda: un contrato en dólares no se suma a uno en pesos (ALQ-187). */
  cobrado: TotalesPorMoneda;
  aVencer: TotalesPorMoneda;
  vencido: TotalesPorMoneda;
  emitido: TotalesPorMoneda;
  cuotas: number;
  cobradas: number;
  /** Cuántas cuotas cayeron en cada estado: la barra las usa si hay más de una moneda. */
  cantidades: { cobrado: number; aVencer: number; vencido: number };
}

/**
 * Los tres montos del mes. El estado de cada cuota lo resuelve `cobranzas.ts`,
 * que es el módulo que ya define esos criterios: replicarlos acá haría que
 * Inicio y Cobranzas pudieran discrepar sobre la misma cuota.
 *
 * Los importes son los que se adeudan hoy (`amountDue`): incluyen el recargo
 * por atraso, que sigue siendo plata que el propietario cobra.
 *
 * Una cuota con el pago esperando confirmación **no** está cobrada —todavía
 * falta que el propietario lo acepte—, así que cuenta según su vencimiento.
 *
 * Cada importe se acumula en la moneda de su contrato. `contracts` sólo hace
 * falta con un backend anterior a ALQ-187, que no manda la moneda en la cuota.
 */
export function resumenDeCobranza(
  invoices: InvoiceResponse[],
  contracts: ContractResponse[] = []
): ResumenCobranza {
  const resumen: ResumenCobranza = {
    cobrado: {},
    aVencer: {},
    vencido: {},
    emitido: {},
    cuotas: invoices.length,
    cobradas: 0,
    cantidades: { cobrado: 0, aVencer: 0, vencido: 0 },
  };
  const monedaDe = monedaDeCuota(contracts);
  const sumar = (clave: "cobrado" | "aVencer" | "vencido", invoice: InvoiceResponse) => {
    sumarEnMoneda(resumen[clave], invoice.amountDue, monedaDe(invoice));
    resumen.cantidades[clave] += 1;
  };

  for (const invoice of invoices) {
    sumarEnMoneda(resumen.emitido, invoice.amountDue, monedaDe(invoice));
    const estado: EstadoCuota = estadoDeCuota(invoice);
    if (estado === "Pagada") {
      sumar("cobrado", invoice);
      resumen.cobradas += 1;
    } else if (estado === "Vencida") {
      sumar("vencido", invoice);
    } else if (estado === "Pago a confirmar") {
      // El pago está cargado pero sin aceptar: se ubica por su vencimiento, que
      // es lo que determina si ya debería estar cobrada.
      sumar(invoice.status === "DUE" ? "vencido" : "aVencer", invoice);
    } else {
      sumar("aVencer", invoice);
    }
  }

  return resumen;
}

/** La moneda de una cuota: la suya o, con un backend anterior a ALQ-187, la de su contrato. */
function monedaDeCuota(contracts: ContractResponse[]): (invoice: InvoiceResponse) => Currency | undefined {
  const porContrato = new Map(contracts.map((c) => [c.id, c.currency]));
  return (invoice) => invoice.currency ?? porContrato.get(invoice.contractId);
}

function monedasCon(totales: TotalesPorMoneda): Currency[] {
  return (Object.keys(totales) as Currency[]).filter((m) => (totales[m] ?? 0) !== 0);
}

/**
 * Los tres porcentajes de la barra. Con una sola moneda, sobre lo emitido; con
 * pesos y dólares a la vez no hay un total común sin convertir, así que la barra
 * reparte por cantidad de cuotas. Sin nada emitido, los tres en cero.
 */
export function proporciones(resumen: ResumenCobranza): {
  cobrado: number;
  aVencer: number;
  vencido: number;
} {
  const monedas = monedasCon(resumen.emitido);
  if (monedas.length === 0) return { cobrado: 0, aVencer: 0, vencido: 0 };
  if (monedas.length === 1) {
    const [moneda] = monedas;
    const emitido = resumen.emitido[moneda] ?? 0;
    const pct = (totales: TotalesPorMoneda) => Math.round(((totales[moneda] ?? 0) / emitido) * 100);
    return { cobrado: pct(resumen.cobrado), aVencer: pct(resumen.aVencer), vencido: pct(resumen.vencido) };
  }
  const pct = (cantidad: number) => Math.round((cantidad / resumen.cuotas) * 100);
  return {
    cobrado: pct(resumen.cantidades.cobrado),
    aVencer: pct(resumen.cantidades.aVencer),
    vencido: pct(resumen.cantidades.vencido),
  };
}

// --- Proyección del mes siguiente ---

export interface Proyeccion {
  /** `null` cuando ningún contrato es determinable todavía: un «$ 0» ahí diría
   *  que no va a cobrar nada, que es lo contrario de «no se sabe». Por moneda,
   *  como la cobranza: pesos y dólares no se suman. */
  total: TotalesPorMoneda | null;
  /** Contratos vigentes sin proyección para ese mes. */
  aDefinir: number;
}

/**
 * El backend sólo escribe una `PreInvoice` cuando el período ya es cierto: para
 * un contrato por índice sin valor publicado, la fila no existe. Confirmado por
 * el backend el 17/09/2026. Así que la ausencia **es** el dato y no hay ningún
 * `amount: null` que interpretar.
 */
export function proyeccionDelMes(
  preInvoices: PreInvoiceResponse[],
  contracts: ContractResponse[]
): Proyeccion {
  const vigentes = contracts.filter((c) => c.status === "ACTIVE");
  const conProyeccion = new Set(preInvoices.map((p) => p.contractId));
  const aDefinir = vigentes.filter((c) => !conProyeccion.has(c.id)).length;
  const monedaDeContrato = new Map(contracts.map((c) => [c.id, c.currency]));
  const total: TotalesPorMoneda = {};
  for (const p of preInvoices) {
    sumarEnMoneda(total, p.amount, p.currency ?? monedaDeContrato.get(p.contractId));
  }
  return { total: preInvoices.length === 0 ? null : total, aDefinir };
}

// --- Lo que requiere acción ---

export type TonoAviso = "info" | "warn" | "bad";

export interface Aviso {
  id: string;
  tono: TonoAviso;
  titulo: string;
  cuerpo: string;
  /** Lo que dice el botón. Todos llevan a Cobranzas, que es donde se resuelven. */
  accion: string;
}

/** «hace 9 días», «hoy», «ayer». Sin fecha devuelve null y el aviso la omite. */
export function hace(desdeISO: string | undefined, hoyISO: string): string | null {
  if (!desdeISO) return null;
  const dia = (iso: string) => Date.UTC(...(iso.slice(0, 10).split("-").map(Number) as [number, number, number]));
  const dias = Math.round((dia(hoyISO) - dia(desdeISO)) / 86_400_000);
  if (dias < 0) return null;
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

/**
 * Las tres cosas que esperan una decisión del propietario, en orden de urgencia
 * para él: un comprobante cargado espera una respuesta suya; una cuota sin
 * confirmar bloquea el cobro; una cuota vencida ya es deuda.
 *
 * Las vencidas se agrupan en un solo aviso —tres cuotas impagas son un mismo
 * problema de cobro— mientras que las otras dos se listan por cuota, porque cada
 * una pide una acción puntual.
 */
export function avisosPendientes(
  invoices: InvoiceResponse[],
  contracts: ContractResponse[],
  hoyISO: string
): Aviso[] {
  const porContrato = new Map(contracts.map((c) => [c.id, c]));
  const direccionDe = (invoice: InvoiceResponse) => {
    const contrato = porContrato.get(invoice.contractId);
    return contrato ? formatearDireccion(contrato.property) : "Una propiedad";
  };
  // Backends anteriores a ALQ-187 no mandan la moneda en la cuota: sale del contrato.
  const monedaDe = (invoice: InvoiceResponse) =>
    invoice.currency ?? porContrato.get(invoice.contractId)?.currency;
  const inquilinoDe = (invoice: InvoiceResponse) => {
    const contrato = porContrato.get(invoice.contractId);
    return contrato ? `${contrato.tenant.firstName} ${contrato.tenant.lastName}` : "El inquilino";
  };

  const avisos: Aviso[] = [];

  for (const invoice of invoices) {
    const pago = invoice.payments.find((p) => p.status === "AWAITING_CONFIRMATION");
    if (!pago) continue;
    const cuando = hace(pago.submittedAt, hoyISO);
    avisos.push({
      id: `revisar-${invoice.id}`,
      tono: "info",
      titulo: `${inquilinoDe(invoice)} cargó un pago y espera su confirmación`,
      cuerpo: [
        `${direccionDe(invoice)} · ${formatearMonto(invoice.amountDue, monedaDe(invoice))}`,
        cuando && `Subió el comprobante ${cuando}.`,
      ]
        .filter(Boolean)
        .join(". "),
      accion: "Revisar",
    });
  }

  for (const invoice of invoices) {
    if (invoice.confirmed) continue;
    avisos.push({
      id: `confirmar-${invoice.id}`,
      tono: "warn",
      titulo: `La cuota de ${direccionDe(invoice)} está sin confirmar`,
      cuerpo: `Hasta que la confirme no se puede registrar un pago. Vence el ${formatearFecha(invoice.dueDate)}.`,
      accion: "Confirmar",
    });
  }

  const vencidas = invoices.filter((i) => estadoDeCuota(i) === "Vencida");
  if (vencidas.length > 0) {
    // Por moneda: sumar pesos con dólares daría un número que no existe.
    const total: TotalesPorMoneda = {};
    for (const i of vencidas) sumarEnMoneda(total, i.amountDue, monedaDe(i));
    // La más vieja fija el «desde cuándo»: es la que mide el atraso real.
    const masVieja = vencidas.reduce((a, b) => (a.dueDate <= b.dueDate ? a : b), vencidas[0]);
    const cuando = hace(masVieja.dueDate, hoyISO);
    avisos.push({
      id: "vencidas",
      tono: "bad",
      titulo:
        vencidas.length === 1
          ? "Una cuota vencida sin pago"
          : `${vencidas.length} cuotas vencidas sin pago`,
      cuerpo: [
        `${formatearTotales(total)} en total`,
        cuando && `La más antigua venció ${cuando}.`,
      ]
        .filter(Boolean)
        .join(". "),
      accion: "Ver",
    });
  }

  return avisos;
}

// --- Cartera ---

export interface ResumenCartera {
  total: number;
  conContrato: number;
  sinAlquilar: number;
}

export function resumenDeCartera(properties: PropertyResponse[]): ResumenCartera {
  const conContrato = properties.filter((p) => p.activeContract).length;
  return {
    total: properties.length,
    conContrato,
    sinAlquilar: properties.length - conContrato,
  };
}

/** Los contratos que la pantalla lista: sólo los vigentes. */
export function contratosVigentes(contracts: ContractResponse[]): ContractResponse[] {
  return contracts.filter((c) => c.status === "ACTIVE");
}
