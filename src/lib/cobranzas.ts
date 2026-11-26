import { nombreDeInquilino } from "@/lib/inquilino";
import { coincideTexto } from "@/lib/busqueda";
import {
  diferenciaEnDias,
  formatearDiaMes,
  formatearDireccion,
  formatearFecha,
  formatearMonto,
  formatearPeriodo,
  formatearTotales,
  hoyEnArgentina,
  sumarEnMoneda,
  type TotalesPorMoneda,
} from "@/lib/formato";
import { recargoEditable, recargoEnCurso, vistaDeRecargo, type RecargoEditable, type RecargoVista } from "@/lib/recargo";
import type {
  AdjustmentResponse,
  ContractResponse,
  Currency,
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

/**
 * Una cuota que el propietario todavía no confirmó: el inquilino no puede
 * pagarla, pero si el contrato tiene punitorios el recargo corre igual.
 */
export interface AvisoSinConfirmar {
  /** La fecha de vencimiento ya pasó. */
  urgente: boolean;
  texto: string;
  /** El contrato tiene punitorios: el recargo corre aunque el inquilino no pueda pagar. */
  correRecargo: boolean;
}

/**
 * Lo que dice la columna «Vence» y su equivalente en los anchos donde esa
 * columna desaparece. Cuatro textos porque la tabla tiene cuatro formas y cada
 * una cuenta lo mismo con el espacio que tiene.
 */
export interface PlazoDeCuota {
  /** «10/08/2026». */
  fecha: string;
  /** Debajo de la fecha: «hace 15 días», «en 3 días», «pagada el 04/08». */
  relativo: string;
  /** Sólo la cuota vencida se pinta de rojo: lo demás es información, no un reclamo. */
  vencida: boolean;
  /** Tercera línea bajo la dirección cuando no hay columna: «Venció el 10/08, hace 15 días». */
  largo: string;
  /** Una frase corta para el celular: «venció 10/08». */
  corto: string;
}

export interface FilaCobranza {
  invoiceId: number;
  contractId: number;
  direccion: string;
  inquilino: string;
  periodo: string;
  /** Lo que se adeuda hoy: el total de la cuota más el recargo por atraso. */
  monto: string;
  /** La del contrato. Los importes en crudo de abajo están en esta moneda. */
  moneda?: Currency;
  recargo: RecargoVista | null;
  /** Null si no hay recargo que cambiar: contrato sin punitorios, cuota paga o recargo en cero. */
  recargoEditable: RecargoEditable | null;
  sinConfirmar: AvisoSinConfirmar | null;
  /** Algo de la fila cambia a la medianoche: el recargo corre, el aviso pasa a urgente o «hace N días» suma uno. */
  dependeDelDia: boolean;
  /**
   * Los tres en crudo, además del monto ya formateado: el diálogo de ajuste
   * calcula la diferencia contra el total vigente (sin recargo) y muestra de dónde sale.
   */
  importeBase: number;
  totalVigente: number;
  ajustes: AdjustmentResponse[];
  vencimiento: string;
  vencimientoISO: string;
  /** Calculado contra el día en que se armó la fila: por eso `dependeDelDia` la cuenta. */
  plazo: PlazoDeCuota;
  /** Lo que se adeuda hoy, en crudo (`amountDue`): el monto de arriba, sin formatear. */
  importeAdeudado: number;
  /** El vencimiento cae en el mes corriente (al armar la fila). Para «Cobrado del mes». */
  delMes: boolean;
  estado: EstadoCuota;
  confirmada: boolean;
  accion: AccionCuota;
  /** El pago que espera resolución, para el diálogo de revisión. */
  pagoPendiente: PaymentResponse | null;
  /** El pago aceptado, para poder bajar su comprobante. */
  pagoConfirmado: PaymentResponse | null;
}

/** Lo que dice un pago que registró el alta de un contrato en curso: no hay comprobante ni nada que hacerle. */
export const ETIQUETA_PAGO_DEL_ALTA = "Registrado al dar de alta · sin comprobante";

export function esPagoDelAlta(pago: PaymentResponse | null | undefined): boolean {
  return pago?.origin === "ONBOARDING";
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

export function avisoSinConfirmar(invoice: InvoiceResponse, hoyISO: string): AvisoSinConfirmar | null {
  if (invoice.confirmed) return null;
  const recargo = vistaDeRecargo(invoice, "propietario");
  // `lateFee` viene sólo si el contrato tiene punitorios, aunque hoy no sume nada.
  const hoySuma = recargo?.monto ? `: hoy suma ${recargo.monto}` : "";
  const correRecargo = invoice.lateFee === null
    ? ""
    : ` El recargo por atraso corre igual, según el contrato${hoySuma}.`;
  return {
    urgente: invoice.dueDate < hoyISO,
    texto: `El inquilino todavía no puede pagarla en el portal.${correRecargo}`,
    correRecargo: invoice.lateFee !== null,
  };
}

/** El día de un vencimiento o de un pago, sin año si es el corriente: «10/08». */
function diaCorto(fechaISO: string, hoyISO: string): string {
  return fechaISO.slice(0, 4) === hoyISO.slice(0, 4) ? formatearDiaMes(fechaISO) : formatearFecha(fechaISO);
}

/** «hace 15 días», «ayer», «hoy», «mañana», «en 3 días». `dias` es lo que falta (negativo si ya pasó). */
function distanciaEnPalabras(dias: number): string {
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  if (dias === -1) return "ayer";
  return dias > 0 ? `en ${dias} días` : `hace ${-dias} días`;
}

/** El día en que el inquilino mandó el comprobante, en hora argentina (el mismo criterio que la liquidación). */
function diaDelPago(pago: PaymentResponse | null): string | null {
  return pago?.submittedAt ? hoyEnArgentina(new Date(pago.submittedAt)) : null;
}

function plazoDeLoPagado(fecha: string, dia: string | null, verbo: string, hoyISO: string): PlazoDeCuota {
  const cuando = dia ? ` el ${diaCorto(dia, hoyISO)}` : "";
  const texto = `${verbo}${cuando}`;
  return { fecha, relativo: texto, vencida: false, largo: capitalizar(texto), corto: texto };
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Cuándo vence una cuota o, si ya hay un pago, cuándo se pagó. Con el vencimiento
 * y el estado alcanza; el pago sólo aporta el día (puede faltar: un pago del
 * alta no tiene comprobante, y entonces sólo se dice que está pagada).
 */
export function plazoDeCuota(
  cuota: Pick<FilaCobranza, "estado" | "vencimientoISO" | "pagoPendiente" | "pagoConfirmado">,
  hoyISO: string,
): PlazoDeCuota {
  const fecha = formatearFecha(cuota.vencimientoISO);
  if (cuota.estado === "Pagada") {
    return plazoDeLoPagado(fecha, diaDelPago(cuota.pagoConfirmado), "pagada", hoyISO);
  }
  if (cuota.estado === "Pago a confirmar") {
    return plazoDeLoPagado(fecha, diaDelPago(cuota.pagoPendiente), "pagó", hoyISO);
  }
  const dias = diferenciaEnDias(hoyISO, cuota.vencimientoISO);
  const dia = diaCorto(cuota.vencimientoISO, hoyISO);
  const relativo = distanciaEnPalabras(dias);
  const vencio = dias < 0;
  const verbo = vencio ? "Venció" : "Vence";
  return {
    fecha,
    relativo,
    vencida: cuota.estado === "Vencida",
    largo: dias === 0 ? "Vence hoy" : `${verbo} el ${dia}, ${relativo}`,
    corto: `${verbo.toLowerCase()} ${dia}`,
  };
}

export type TonoDeRecargo = "adv" | "neutro";

/**
 * La línea que lleva la tabla: un renglón, no el detalle. El monto de la fila ya
 * es lo que se adeuda hoy (`amountDue`, con el recargo adentro), así que dice
 * «incluye» y no «+»: un «+» pide sumarlo, y el total quedaría contado dos veces.
 * El resto (días, tasa, «desde mañana») queda para el diálogo de recargo.
 */
export function resumenDeRecargo(vista: RecargoVista | null): { texto: string; tono: TonoDeRecargo } | null {
  if (!vista) return null;
  if (vista.monto) return { texto: `incluye ${vista.monto} de recargo`, tono: "adv" };
  if (vista.modificado === "Recargo perdonado") return { texto: "Recargo perdonado", tono: "neutro" };
  if (vista.desde) return { texto: `Recargo desde el ${vista.desde}`, tono: "neutro" };
  return null;
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
  contracts: ContractResponse[],
  hoyISO: string = hoyEnArgentina()
): FilaCobranza[] {
  const porContrato = new Map(contracts.map((c) => [c.id, c]));

  return invoices
    .map((cuota) => {
      const contrato = porContrato.get(cuota.contractId);
      // Backends anteriores a ALQ-187 no mandan la moneda en la cuota: sale del contrato.
      const invoice = { ...cuota, currency: cuota.currency ?? contrato?.currency };
      const estado = estadoDeCuota(invoice);
      const pagoPendiente = invoice.payments.find((p) => p.status === "AWAITING_CONFIRMATION") ?? null;
      const pagoConfirmado = invoice.payments.find((p) => p.status === "CONFIRMED") ?? null;
      return {
        invoiceId: invoice.id,
        contractId: invoice.contractId,
        direccion: contrato ? formatearDireccion(contrato.property) : "—",
        inquilino: contrato ? nombreDeInquilino(contrato.tenant) : "—",
        periodo: formatearPeriodo(invoice.period),
        // Fallback al total si el backend es anterior a los recargos (sin `amountDue`).
        monto: formatearMonto(invoice.amountDue ?? invoice.total, invoice.currency),
        moneda: invoice.currency,
        recargo: vistaDeRecargo(invoice, "propietario"),
        recargoEditable: recargoEditable(invoice),
        sinConfirmar: avisoSinConfirmar(invoice, hoyISO),
        dependeDelDia: recargoEnCurso(invoice) || (!invoice.confirmed && invoice.dueDate >= hoyISO) || estado === "Vencida" || estado === "A vencer",
        importeBase: invoice.baseAmount,
        totalVigente: invoice.total,
        ajustes: invoice.adjustments,
        vencimiento: formatearFecha(invoice.dueDate),
        vencimientoISO: invoice.dueDate,
        plazo: plazoDeCuota({ estado, vencimientoISO: invoice.dueDate, pagoPendiente, pagoConfirmado }, hoyISO),
        importeAdeudado: invoice.amountDue ?? invoice.total,
        delMes: invoice.dueDate.slice(0, 7) === hoyISO.slice(0, 7),
        estado,
        confirmada: invoice.confirmed,
        accion: accionDeCuota(invoice, estado),
        pagoPendiente,
        pagoConfirmado,
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

/** Por dirección, inquilino o período («octubre»). */
export function buscarCobranzas(filas: FilaCobranza[], texto: string): FilaCobranza[] {
  return filas.filter((f) => coincideTexto([f.direccion, f.inquilino, f.periodo], texto));
}

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

/**
 * El aviso de arriba de la tabla: una cuota sin confirmar frena el cobro (el
 * inquilino no puede pagarla) y cada fila ya tiene su «Confirmar importe», así
 * que con varias el aviso sólo cuenta cuántas son. Con una también ofrece el
 * botón, porque es lo único que hay que hacer.
 */
export interface AvisoDeCuotasSinConfirmar {
  urgente: boolean;
  titulo: string;
  detalle: string;
  /** La cuota a confirmar desde el aviso; null si son varias. */
  cuota: FilaCobranza | null;
}

export function avisoDeCuotasSinConfirmar(filas: FilaCobranza[]): AvisoDeCuotasSinConfirmar | null {
  const pendientes = filas.filter((f) => f.sinConfirmar);
  if (pendientes.length === 0) return null;
  const urgente = pendientes.some((f) => f.sinConfirmar?.urgente);
  const correRecargo = pendientes.some((f) => f.sinConfirmar?.correRecargo);
  const recargo = correRecargo ? " El recargo por atraso corre igual." : "";
  if (pendientes.length === 1) {
    return {
      urgente,
      titulo: `${pendientes[0].direccion} tiene el importe sin confirmar.`,
      detalle: `El inquilino no puede pagarla en el portal hasta que lo confirme.${recargo}`,
      cuota: pendientes[0],
    };
  }
  return {
    urgente,
    titulo: `${pendientes.length} cuotas tienen el importe sin confirmar.`,
    detalle: `Los inquilinos no pueden pagarlas en el portal hasta que se confirmen.${recargo}`,
    cuota: null,
  };
}

/**
 * «Cobrado del mes $ X de $ Y»: las cuotas que vencen en el mes corriente, lo
 * pagado contra lo que se adeuda. Un pago esperando revisión todavía no es plata
 * cobrada. Por moneda, sin sumar pesos con dólares. Null si el mes no tiene cuotas.
 */
export function cobradoDelMes(filas: FilaCobranza[]): { cobrado: string; total: string } | null {
  const delMes = filas.filter((f) => f.delMes);
  if (delMes.length === 0) return null;
  const cobrado: TotalesPorMoneda = {};
  const total: TotalesPorMoneda = {};
  for (const fila of delMes) {
    sumarEnMoneda(total, fila.importeAdeudado, fila.moneda);
    if (fila.estado === "Pagada") sumarEnMoneda(cobrado, fila.importeAdeudado, fila.moneda);
  }
  return { cobrado: formatearTotales(cobrado), total: formatearTotales(total) };
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
