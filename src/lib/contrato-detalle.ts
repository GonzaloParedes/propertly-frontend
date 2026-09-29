import { formatearFecha } from "@/lib/formato";
import type {
  ContractResponse,
  Currency,
  RentIncrementResponse,
} from "@/lib/backend-types";

/**
 * Los importes del contrato pueden estar pactados en dólares. `currency` es
 * opcional y ausente significa pesos: el backend no la exige y las cuotas
 * heredan la del contrato.
 */
export function formatearImporte(monto: number, moneda: Currency | undefined): string {
  const simbolo = moneda === "USD" ? "US$" : "$";
  return `${simbolo} ${monto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

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

const DEPOSITO: Record<string, string> = {
  CASH: "Depósito en efectivo",
  SURETY_INSURANCE: "Seguro de caución",
  PROPERTY_GUARANTEE: "Garantía propietaria",
};

const PAGADOR: Record<string, string> = {
  LANDLORD: "la paga el propietario",
  TENANT: "la paga el inquilino",
  SHARED: "compartida",
};

/**
 * Lo que el contrato pactó y hasta ahora no se mostraba en ningún lado. Sólo se
 * listan las condiciones cargadas: mostrar «Depósito: $ 0» o «Renovación
 * automática: No» sobre un campo que nadie completó afirma algo que no se pactó.
 */
export function condicionesComerciales(contract: ContractResponse): Condicion[] {
  const condiciones: Condicion[] = [];
  const moneda = contract.currency;

  if (contract.depositAmount) {
    condiciones.push({
      etiqueta: "Depósito",
      valor: [
        formatearImporte(contract.depositAmount, moneda),
        contract.depositType && DEPOSITO[contract.depositType],
      ]
        .filter(Boolean)
        .join(" · "),
    });
  } else if (contract.depositType) {
    condiciones.push({ etiqueta: "Depósito", valor: DEPOSITO[contract.depositType] });
  }

  if (contract.commissionPercent) {
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

  if (contract.lateFeeValue) {
    const valor =
      contract.lateFeeType === "PERCENTAGE"
        ? `${contract.lateFeeValue} % por mora`
        : `${formatearImporte(contract.lateFeeValue, moneda)} por mora`;
    const gracia = contract.lateFeeGraceDays
      ? `tras ${contract.lateFeeGraceDays} ${contract.lateFeeGraceDays === 1 ? "día" : "días"} de gracia`
      : null;
    condiciones.push({ etiqueta: "Punitorios", valor: [valor, gracia].filter(Boolean).join(" · ") });
  }

  if (contract.autoRenewal !== undefined && contract.autoRenewal !== null) {
    condiciones.push({
      etiqueta: "Renovación",
      valor: contract.autoRenewal ? "Automática" : "No se renueva automáticamente",
    });
  }

  if (contract.terminationNoticeMonths) {
    condiciones.push({
      etiqueta: "Preaviso de rescisión",
      valor: `${contract.terminationNoticeMonths} ${contract.terminationNoticeMonths === 1 ? "mes" : "meses"}`,
    });
  }

  if (contract.earlyTerminationPenalty) {
    condiciones.push({
      etiqueta: "Multa por rescisión anticipada",
      valor: formatearImporte(contract.earlyTerminationPenalty, moneda),
    });
  }

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
  const tipo = contract.documentContentType?.startsWith("image/")
    ? "Imagen"
    : contract.documentContentType === "application/pdf"
      ? "PDF"
      : "Archivo";
  const mb = contract.documentSizeBytes
    ? `${(contract.documentSizeBytes / 1_048_576).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`
    : null;
  const cuando = contract.documentUploadedAt
    ? `cargado el ${formatearFecha(contract.documentUploadedAt.slice(0, 10))}`
    : null;
  return [tipo, mb, cuando].filter(Boolean).join(" · ");
}
