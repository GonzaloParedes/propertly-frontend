import { formatearCuit, soloDigitos } from "@/lib/cuit";
import { formatearDireccion, formatearMonto } from "@/lib/formato";
import type {
  ContractResponse,
  InvoiceResponse,
  TenantResponse,
} from "@/lib/backend-types";

export type EstadoInquilino =
  | "Al día"
  | "Vencida"
  | "A vencer"
  | "Pago a confirmar"
  | "Sin contrato";

export interface TenantRow {
  id: number;
  /** «Jorge Paletta», para mostrar. */
  nombre: string;
  /**
   * El nombre y el apellido por separado, además del completo: el formulario de
   * edición los pide en dos campos y partir «nombre» por el espacio se equivoca
   * con cualquier apellido compuesto.
   */
  nombrePila: string;
  apellido: string;
  cuit: string;
  email: string;
  telefono: string;
  contratoId: number | null;
  direccion: string | null;
  alquiler: string | null;
  estado: EstadoInquilino;
}

export { formatearDireccion, formatearMonto } from "@/lib/formato";

/**
 * El backend guarda el documento sin formato y acepta también un DNI de 7 u 8
 * dígitos, que no se separa en tres grupos como el CUIT. Se formatea sólo lo
 * que tiene 11 dígitos; el resto se muestra tal cual vino.
 */
function formatearDocumento(taxId: string): string {
  return soloDigitos(taxId).length === 11 ? formatearCuit(taxId) : taxId;
}

/**
 * El chip es uno por inquilino, pero las cuotas son varias y pueden estar en
 * estados distintos. Gana la que pide atención antes.
 *
 * «Vencida» va primero, salvo que esa misma cuota ya tenga un comprobante
 * esperando: en ese caso lo que falta es un click del propietario para
 * confirmarlo, no reclamarle al inquilino. Una cuota vencida sin comprobante
 * sigue ganándole a otra que sí lo tiene, para no tapar la deuda real.
 */
export function estadoDeCuotas(invoices: InvoiceResponse[]): EstadoInquilino {
  const esperaConfirmacion = (invoice: InvoiceResponse) =>
    invoice.payments.some((payment) => payment.status === "AWAITING_CONFIRMATION");

  if (invoices.some((invoice) => invoice.status === "DUE" && !esperaConfirmacion(invoice))) {
    return "Vencida";
  }
  if (invoices.some(esperaConfirmacion)) return "Pago a confirmar";
  if (invoices.some((invoice) => invoice.status === "PENDING")) return "A vencer";
  return "Al día";
}

/**
 * Cruza las tres listas que devuelve el backend en una fila por inquilino.
 * Sólo cuenta el contrato ACTIVE: los TERMINATED, EXPIRED y SUPERSEDED son
 * historia y no describen la situación de hoy.
 */
export function buildTenantRows(
  tenants: TenantResponse[],
  contracts: ContractResponse[],
  invoices: InvoiceResponse[]
): TenantRow[] {
  return tenants.map((tenant) => {
    const contrato =
      contracts.find((c) => c.tenant.id === tenant.id && c.status === "ACTIVE") ?? null;
    const cuotas = contrato ? invoices.filter((i) => i.contractId === contrato.id) : [];

    return {
      id: tenant.id,
      nombre: `${tenant.firstName} ${tenant.lastName}`,
      nombrePila: tenant.firstName,
      apellido: tenant.lastName,
      cuit: formatearDocumento(tenant.taxId),
      email: tenant.email,
      telefono: tenant.phoneNumber,
      contratoId: contrato?.id ?? null,
      direccion: contrato ? formatearDireccion(contrato.property) : null,
      alquiler: contrato ? formatearMonto(contrato.currentRent) : null,
      estado: contrato ? estadoDeCuotas(cuotas) : "Sin contrato",
    };
  });
}

/**
 * La bajada de la cabecera era texto fijo que afirmaba «todos con contrato
 * vigente». Ahora se calcula, para que no diga algo que dejó de ser cierto.
 */
export function resumenInquilinos(rows: TenantRow[]): string {
  const total = rows.length;
  const sinContrato = rows.filter((row) => row.contratoId === null).length;
  const base = total === 1 ? "1 inquilino" : `${total} inquilinos`;
  if (sinContrato === 0) return base;
  const detalleSinContrato = sinContrato === 1 ? "1 sin contrato" : `${sinContrato} sin contrato`;
  return `${base} · ${detalleSinContrato}`;
}
