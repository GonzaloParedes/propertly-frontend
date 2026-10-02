import { coincideTexto } from "@/lib/busqueda";
import { formatearDireccion, formatearFecha, formatearMonto } from "@/lib/formato";
import type { ContractResponse } from "@/lib/backend-types";

/**
 * Los cinco estados del backend, dichos como los dice la UI. `SUPERSEDED` no
 * se dobla en «Finalizado»: es el contrato que quedó reemplazado por un cambio
 * de condiciones, y confundirlo con uno que terminó esconde que hay un sucesor.
 */
export type EstadoContrato = "Vigente" | "Por terminar" | "Finalizado" | "Vencido" | "Reemplazado" | "Programado";

/**
 * Un contrato entra en «por terminar» tres meses antes de su fin. Es cuando se
 * empieza a hablar la renovación, así que es cuando tiene que aparecer en la
 * pantalla como algo que pide atención.
 */
const MESES_DE_AVISO = 3;

/**
 * Se compara contra una fecha de corte en vez de contar meses enteros: contarlos
 * redondea para abajo, y un contrato a tres meses y veintinueve días caía dentro
 * de la ventana igual que uno a tres meses justos.
 *
 * En un fin de mes el corte puede correrse un día (31 de enero + 1 mes no
 * existe), y para una ventana de aviso de tres meses eso da lo mismo.
 */
function sumarMeses(fechaISO: string, meses: number): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1 + meses, dia)).toISOString().slice(0, 10);
}

export function estadoDeContrato(contract: ContractResponse, hoyISO: string): EstadoContrato {
  if (contract.status === "SUPERSEDED") return "Reemplazado";
  if (contract.status === "SCHEDULED") return "Programado";
  if (contract.status === "TERMINATED") return "Finalizado";
  if (contract.status === "EXPIRED") return "Vencido";
  return contract.endDate <= sumarMeses(hoyISO, MESES_DE_AVISO) ? "Por terminar" : "Vigente";
}

/**
 * Cómo sube el alquiler, en una línea. El asistente hoy sólo carga porcentajes,
 * pero la lista tiene que saber leer los tres métodos: un contrato por monto
 * fijo pudo entrar por otra vía y no puede quedar sin describir.
 */
export function describirActualizacion(contract: ContractResponse): string {
  const cada = `cada ${contract.incrementFrequencyMonths} ${contract.incrementFrequencyMonths === 1 ? "mes" : "meses"}`;
  if (contract.incrementMethod === "INDEX") {
    return `Ajusta por ${contract.incrementIndexName ?? "índice"} ${cada}`;
  }
  if (contract.incrementMethod === "FIXED_AMOUNT") {
    return `Sube ${formatearMonto(contract.incrementValue ?? 0)} ${cada}`;
  }
  return `Sube ${contract.incrementValue ?? 0} % ${cada}`;
}

export interface FilaContrato {
  id: number;
  direccion: string;
  inquilino: string;
  actualizacion: string;
  /** La fecha real de fin: si se rescindió antes, manda la efectiva. */
  fin: string;
  finISO: string;
  alquiler: string;
  estado: EstadoContrato;
  /** El contrato que lo reemplazó, cuando hubo un cambio de condiciones. */
  sucesorId: number | null;
}

export function buildFilasContrato(
  contracts: ContractResponse[],
  hoyISO: string
): FilaContrato[] {
  return contracts
    .map((contract) => {
      const fin = contract.actualEndDate ?? contract.endDate;
      return {
        id: contract.id,
        direccion: formatearDireccion(contract.property),
        inquilino: `${contract.tenant.firstName} ${contract.tenant.lastName}`,
        actualizacion: describirActualizacion(contract),
        fin: formatearFecha(fin),
        finISO: fin,
        alquiler: formatearMonto(contract.currentRent),
        estado: estadoDeContrato(contract, hoyISO),
        sucesorId: contract.successorContractId ?? null,
      };
    })
    // Los que siguen corriendo primero, y dentro de cada grupo el que termina
    // antes arriba: es el que va a necesitar una decisión más pronto.
    .sort((a, b) => {
      const vivo = (f: FilaContrato) => (f.estado === "Vigente" || f.estado === "Por terminar" ? 0 : 1);
      return vivo(a) - vivo(b) || a.finISO.localeCompare(b.finISO);
    });
}

export type FiltroContrato = "vigentes" | "porTerminar" | "programados" | "finalizados";

const COINCIDE: Record<FiltroContrato, (fila: FilaContrato) => boolean> = {
  vigentes: (f) => f.estado === "Vigente" || f.estado === "Por terminar",
  porTerminar: (f) => f.estado === "Por terminar",
  // Todavía no rige: no es vigente, pero tampoco terminó.
  programados: (f) => f.estado === "Programado",
  // Un contrato reemplazado ya no rige, así que cuenta acá aunque se nombre distinto.
  finalizados: (f) => f.estado === "Finalizado" || f.estado === "Vencido" || f.estado === "Reemplazado",
};

/** Por dirección o inquilino. */
export function buscarContratos(filas: FilaContrato[], texto: string): FilaContrato[] {
  return filas.filter((f) => coincideTexto([f.direccion, f.inquilino], texto));
}

export function filtrarContratos(filas: FilaContrato[], filtro: FiltroContrato): FilaContrato[] {
  return filas.filter(COINCIDE[filtro]);
}

export function contarContratos(filas: FilaContrato[]): Record<FiltroContrato, number> {
  return {
    vigentes: filtrarContratos(filas, "vigentes").length,
    porTerminar: filtrarContratos(filas, "porTerminar").length,
    programados: filtrarContratos(filas, "programados").length,
    finalizados: filtrarContratos(filas, "finalizados").length,
  };
}

export function resumenContratos(filas: FilaContrato[]): string {
  if (filas.length === 0) return "Todavía no cargó ningún contrato.";
  const { vigentes, porTerminar } = contarContratos(filas);
  const base = `${vigentes} ${vigentes === 1 ? "vigente" : "vigentes"}`;
  return porTerminar > 0 ? `${base} · ${porTerminar} por terminar` : base;
}
