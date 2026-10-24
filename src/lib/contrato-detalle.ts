import { formatearFecha, formatearImporte } from "@/lib/formato";
import { describirGarantia } from "@/lib/garantias";
import type {
  ContractResponse,
  Currency,
  RentIncrementResponse,
} from "@/lib/backend-types";

// `formatearImporte` vive ahora en `@/lib/formato` (junto a los demás
// formateadores). Se re-exporta acá para no romper a quienes lo importaban
// desde este módulo.
export { formatearImporte };

// --- Vigencia ---

/**
 * «del 01/03/2025 al 28/02/2028». En fechas y no en meses a propósito: el
 * backend reportó que `termMonths` queda un mes corto en todo contrato
 * renegociado —el corte del schema-change cae el día de vencimiento, así que el
 * sucesor arranca a mitad de mes— y las fechas son además lo que el propietario
 * reconoce de su contrato en papel.
 *
 * Si terminó antes de lo previsto, manda la fecha real: es la que rige.
 */
export function vigenciaEnFechas(contract: ContractResponse): string {
  const fin = contract.actualEndDate ?? contract.endDate;
  const base = `del ${formatearFecha(contract.startDate)} al ${formatearFecha(fin)}`;
  return contract.actualEndDate && contract.actualEndDate !== contract.endDate
    ? `${base} · terminó antes del ${formatearFecha(contract.endDate)} previsto`
    : base;
}

// --- Próxima actualización ---

export interface ProximaActualizacion {
  fecha: string;
  /** `null` cuando el importe todavía depende de un índice sin publicar. */
  importe: string | null;
}

/**
 * Sale del backend, nunca de `startDate + incrementFrequencyMonths`: esa cuenta
 * sólo coincide mientras el contrato no haya tenido una renegociación, y el
 * backend ya soporta ese corte. Sin fecha no hay hito que mostrar.
 */
export function proximaActualizacion(contract: ContractResponse): ProximaActualizacion | null {
  if (!contract.nextIncrementDate) return null;
  return {
    fecha: formatearFecha(contract.nextIncrementDate),
    importe:
      contract.nextIncrementRent !== undefined && contract.nextIncrementRent !== null
        ? formatearImporte(contract.nextIncrementRent, contract.currency)
        : null,
  };
}

/** «Sube 8 % cada 3 meses», «Ajusta por ICL cada 6 meses». */
export function comoSeActualiza(contract: ContractResponse): string {
  const cada = `cada ${contract.incrementFrequencyMonths} ${contract.incrementFrequencyMonths === 1 ? "mes" : "meses"}`;
  if (contract.incrementMethod === "INDEX") {
    return `Ajusta por ${contract.incrementIndexName ?? "índice"} ${cada}`;
  }
  if (contract.incrementMethod === "FIXED_AMOUNT") {
    return `Sube ${formatearImporte(contract.incrementValue ?? 0, contract.currency)} ${cada}`;
  }
  return `Sube ${contract.incrementValue ?? 0} % ${cada}`;
}

// --- Condiciones comerciales ---

export interface Condicion {
  etiqueta: string;
  valor: string;
}

const PAGADOR: Record<string, string> = {
  LANDLORD: "la paga el propietario",
  TENANT: "la paga el inquilino",
  SHARED: "compartida",
};

function agregarDeposito(condiciones: Condicion[], contract: ContractResponse, moneda: Currency | undefined) {
  if (!contract.depositAmount) return;
  condiciones.push({ etiqueta: "Depósito", valor: formatearImporte(contract.depositAmount, moneda) });
}

/** Una línea por garantía: «Garantía» si hay una sola, «Garantía 1», «Garantía 2»… si hay varias. */
function agregarGarantias(condiciones: Condicion[], contract: ContractResponse) {
  const garantias = contract.guarantees ?? [];
  garantias.forEach((garantia, indice) => {
    condiciones.push({
      etiqueta: garantias.length > 1 ? `Garantía ${indice + 1}` : "Garantía",
      valor: describirGarantia(garantia),
    });
  });
}

function agregarComision(condiciones: Condicion[], contract: ContractResponse) {
  if (!contract.commissionPercent) return;
  condiciones.push({
    etiqueta: "Comisión",
    valor: [
      `${contract.commissionPercent} %`,
      contract.commissionPayer && PAGADOR[contract.commissionPayer],
    ]
      .filter(Boolean)
      .join(" · "),
  });
}

function pluralizar(cantidad: number, singular: string, plural: string): string {
  return cantidad === 1 ? singular : plural;
}

function agregarPunitorios(condiciones: Condicion[], contract: ContractResponse, moneda: Currency | undefined) {
  const { lateFeeMethod: metodo, lateFeeValue: valor } = contract;
  if (!metodo || valor === undefined || valor === null) return;
  const porcentaje = `${valor.toLocaleString("es-AR", { maximumFractionDigits: 2 })} %`;
  const importe = formatearImporte(valor, moneda);
  const desde = `desde el día ${(contract.lateFeeGraceDays ?? 0) + 1} de atraso`;
  const tasa = {
    PERCENT_PER_DAY: `${porcentaje} diario sobre la cuota`,
    PERCENT_PER_MONTH: `${porcentaje} mensual, cobrado por día de atraso`,
    PERCENT_PER_YEAR: `${porcentaje} anual, cobrado por día de atraso`,
    FIXED_PER_DAY: `${importe} por cada día de atraso`,
    FIXED_ONCE: `Multa única de ${importe}`,
  }[metodo];
  condiciones.push({ etiqueta: "Punitorios", valor: `${tasa}, ${desde}` });
}

function agregarRenovacion(condiciones: Condicion[], contract: ContractResponse) {
  if (contract.autoRenewal === undefined || contract.autoRenewal === null) return;
  condiciones.push({
    etiqueta: "Renovación",
    valor: contract.autoRenewal ? "Automática" : "No se renueva automáticamente",
  });
}

function agregarPreaviso(condiciones: Condicion[], contract: ContractResponse) {
  if (!contract.terminationNoticeMonths) return;
  const meses = contract.terminationNoticeMonths;
  condiciones.push({
    etiqueta: "Preaviso de rescisión",
    valor: `${meses} ${pluralizar(meses, "mes", "meses")}`,
  });
}

function agregarMulta(condiciones: Condicion[], contract: ContractResponse, moneda: Currency | undefined) {
  if (!contract.earlyTerminationPenalty) return;
  condiciones.push({
    etiqueta: "Multa por rescisión anticipada",
    valor: formatearImporte(contract.earlyTerminationPenalty, moneda),
  });
}

/**
 * Lo que el contrato pactó y hasta ahora no se mostraba en ningún lado. Sólo se
 * listan las condiciones cargadas: mostrar «Depósito: $ 0» o «Renovación
 * automática: No» sobre un campo que nadie completó afirma algo que no se pactó.
 */
export function condicionesComerciales(contract: ContractResponse): Condicion[] {
  const condiciones: Condicion[] = [];
  const moneda = contract.currency;

  agregarDeposito(condiciones, contract, moneda);
  agregarGarantias(condiciones, contract);
  agregarComision(condiciones, contract);
  agregarPunitorios(condiciones, contract, moneda);
  agregarRenovacion(condiciones, contract);
  agregarPreaviso(condiciones, contract);
  agregarMulta(condiciones, contract, moneda);

  // La moneda va sólo si no es la de siempre: decir «Pesos argentinos» en todos
  // los contratos es ruido.
  if (contract.currency === "USD") {
    condiciones.unshift({ etiqueta: "Moneda", valor: "Dólares (USD)" });
  }

  return condiciones;
}

// --- Historial de aumentos ---

export interface LineaDeAumento {
  id: string;
  fecha: string;
  resultado: string;
  /** El período del índice usado. Sólo en los aumentos por índice. */
  ventana: string | null;
}

export function historialDeAumentos(
  incrementos: RentIncrementResponse[],
  moneda: Currency | undefined
): LineaDeAumento[] {
  return [...incrementos]
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
    .map((incremento) => ({
      id: `${incremento.periodNumber}-${incremento.appliedAt}`,
      fecha: formatearFecha(incremento.appliedAt),
      resultado: formatearImporte(incremento.resultingRent, moneda),
      ventana:
        incremento.indexWindowStartPeriod && incremento.indexWindowEndPeriod
          ? `índice de ${formatearFecha(incremento.indexWindowStartPeriod)} a ${formatearFecha(incremento.indexWindowEndPeriod)}`
          : null,
    }));
}

// --- Documento ---

/** «PDF · 2,4 MB · cargado el 01/03/2025». Sin fecha, se omite esa parte. */
export function descripcionDocumento(contract: ContractResponse): string {
  const tipo = tipoDeDocumento(contract.documentContentType);
  const mb = contract.documentSizeBytes
    ? `${(contract.documentSizeBytes / 1_048_576).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`
    : null;
  const cuando = contract.documentUploadedAt
    ? `cargado el ${formatearFecha(contract.documentUploadedAt.slice(0, 10))}`
    : null;
  return [tipo, mb, cuando].filter(Boolean).join(" · ");
}

function tipoDeDocumento(contentType: string | undefined): string {
  if (contentType?.startsWith("image/")) return "Imagen";
  if (contentType === "application/pdf") return "PDF";
  return "Archivo";
}
