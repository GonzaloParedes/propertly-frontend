import { formatearMonto, formatearPeriodo } from "@/lib/formato";
import type { ContractResponse, ScheduledSchemaChangeRequest } from "@/lib/backend-types";

/** Cómo sube el alquiler, en los términos del asistente de contratos. */
export type MetodoActualizacion = "FIXED_PERCENTAGE" | "ICL" | "IPC";

export interface CondicionesNuevas {
  /** Primer día del mes desde el que rigen, «2026-10-01». */
  mes: string;
  alquiler: string;
  diaVencimiento: number;
  metodo: MetodoActualizacion;
  porcentaje: string;
  frecuencia: number;
}

export interface MesElegible {
  /** Lo que se manda como `effectiveFrom`. */
  valor: string;
  /** Cómo se lo nombra en pantalla: «octubre 2026». */
  etiqueta: string;
}

function primerDia(anio: number, mesIndice: number): string {
  const d = new Date(Date.UTC(anio, mesIndice, 1));
  return d.toISOString().slice(0, 10);
}

/**
 * Los meses desde los que se puede programar el cambio: del siguiente al
 * corriente hasta el último mes que el contrato factura. El backend rechaza
 * cualquier otro, así que ofrecer sólo estos evita el 400 en vez de explicarlo.
 *
 * `endDate` es el último día inclusive; un contrato que termina el día 1 no
 * factura ese mes (el backend lee el fin como cota exclusiva de períodos).
 */
export function mesesElegibles(contract: ContractResponse, hoyISO: string): MesElegible[] {
  const [hoyAnio, hoyMes] = hoyISO.split("-").map(Number);
  const [finAnio, finMes, finDia] = contract.endDate.split("-").map(Number);
  const ultimo = (finAnio * 12 + (finMes - 1)) - (finDia === 1 ? 1 : 0);
  const meses: MesElegible[] = [];
  for (let m = hoyAnio * 12 + hoyMes; m <= ultimo; m++) {
    const valor = primerDia(Math.floor(m / 12), m % 12);
    meses.push({ valor, etiqueta: formatearPeriodo(valor) });
  }
  return meses;
}

function indiceDelContrato(contract: ContractResponse): "IPC" | "ICL" | null {
  if (contract.incrementMethod !== "INDEX") return null;
  return contract.incrementIndexName === "IPC" ? "IPC" : "ICL";
}

/** Las condiciones actuales, para que el propietario cambie sólo lo que cambia. */
export function condicionesIniciales(contract: ContractResponse, meses: MesElegible[]): CondicionesNuevas {
  const indice = indiceDelContrato(contract);
  return {
    mes: meses[0]?.valor ?? "",
    alquiler: String(Math.round(contract.currentRent)),
    diaVencimiento: contract.dueDay,
    metodo: indice ?? "FIXED_PERCENTAGE",
    porcentaje: contract.incrementMethod === "FIXED_PERCENTAGE" && contract.incrementValue != null
      ? String(contract.incrementValue)
      : "",
    frecuencia: contract.incrementFrequencyMonths,
  };
}

export type ErroresCondiciones = Partial<Record<"mes" | "alquiler" | "diaVencimiento" | "porcentaje" | "frecuencia", string>>;

export function validarCondiciones(c: CondicionesNuevas, meses: MesElegible[]): ErroresCondiciones {
  const errores: ErroresCondiciones = {};
  if (!meses.some((m) => m.valor === c.mes)) errores.mes = "Elija un mes posterior al actual y dentro del contrato.";
  if (!(Number(c.alquiler) > 0)) errores.alquiler = "Escriba un alquiler mayor a cero.";
  if (!Number.isInteger(c.diaVencimiento) || c.diaVencimiento < 1 || c.diaVencimiento > 28) {
    errores.diaVencimiento = "El día de vencimiento va del 1 al 28.";
  }
  if (!Number.isInteger(c.frecuencia) || c.frecuencia < 1) errores.frecuencia = "La actualización es cada 1 mes o más.";
  if (c.metodo === "FIXED_PERCENTAGE" && !(Number(c.porcentaje) > 0)) {
    errores.porcentaje = "Escriba un porcentaje mayor a cero.";
  }
  return errores;
}

/**
 * El backend separa el cómo del qué y es excluyente: FIXED_PERCENTAGE exige
 * `incrementValue` y prohíbe `incrementIndexName`; INDEX al revés. Mandar los
 * dos, o ninguno, es un 400.
 */
export function armarPedido(c: CondicionesNuevas): ScheduledSchemaChangeRequest {
  return {
    effectiveFrom: c.mes,
    rentBaseline: Number(c.alquiler),
    dueDay: c.diaVencimiento,
    incrementFrequencyMonths: c.frecuencia,
    ...(c.metodo === "FIXED_PERCENTAGE"
      ? { incrementMethod: "FIXED_PERCENTAGE" as const, incrementValue: Number(c.porcentaje) }
      : { incrementMethod: "INDEX" as const, incrementIndexName: c.metodo }),
  };
}

/** Lo que rige desde el mes elegido, en una línea por condición. */
export function resumenDeCondiciones(c: CondicionesNuevas): string[] {
  const cada = `cada ${c.frecuencia} ${c.frecuencia === 1 ? "mes" : "meses"}`;
  return [
    `Alquiler de ${formatearMonto(Number(c.alquiler))} por mes`,
    `Vence el día ${c.diaVencimiento}`,
    c.metodo === "FIXED_PERCENTAGE" ? `Sube ${c.porcentaje} % ${cada}` : `Ajusta por ${c.metodo} ${cada}`,
  ];
}
