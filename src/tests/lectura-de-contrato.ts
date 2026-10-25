import type { ContractImportResponse, ImportEvidence, ImportField, ImportFieldStatus } from "@/lib/backend-types";

/** Lo que el backend devuelve al leer un contrato: se arma igual que él, con los datos de un contrato de ejemplo. */
export const cita = (page: number, quote: string, verified = true): ImportEvidence => ({ page, quote, verified });

export const campo = (value: unknown, status: ImportFieldStatus = "LITERAL", extra: Partial<ImportField> = {}): ImportField => ({
  value,
  status,
  evidence: value === null ? [] : [cita(1, "cita")],
  note: null,
  validation: [],
  ...extra,
});

/**
 * Un contrato leído casi sin problemas. Lo que queda para el propietario: el tipo de propiedad
 * (el contrato no lo dice), el correo y el teléfono (casi nunca figuran), el vencimiento y el
 * depósito (la lectura los interpretó).
 */
export function lectura(cambios: Record<string, ImportField> = {}, extra: Partial<ContractImportResponse> = {}): ContractImportResponse {
  return {
    id: 41,
    status: "READY",
    stage: null,
    pagesDone: null,
    pagesTotal: null,
    fileName: "contrato.pdf",
    pages: 6,
    failureReason: null,
    fields: {
      "property.street": campo("Colón"),
      "property.number": campo("2255"),
      "property.floorUnit": campo("4.º D"),
      "property.city": campo("Vicente López"),
      "property.province": campo("Buenos Aires"),
      "property.postalCode": campo(null, "MISSING"),
      "property.use": campo("DWELLING"),
      "tenant.firstName": campo("Lucía"),
      "tenant.lastName": campo("Benítez"),
      "tenant.taxId": campo("27334567899"),
      "tenant.email": campo(null, "MISSING"),
      "tenant.phone": campo(null, "MISSING"),
      "rent.initialAmount": campo(450000, "LITERAL", { evidence: [cita(2, "la suma de pesos cuatrocientos cincuenta mil ($ 450.000) mensuales")] }),
      "rent.currency": campo("ARS"),
      "rent.dueDay": campo(10, "INFERRED", { note: "El contrato dice «del 1 al 10 de cada mes»" }),
      "dates.startDate": campo("2026-09-01"),
      "dates.termMonths": campo(36),
      "increments.method": campo("INDEX"),
      "increments.indexName": campo("IPC"),
      "increments.value": campo(null, "MISSING"),
      "increments.frequencyMonths": campo(4),
      "deposit.amount": campo(450000, "INFERRED", { note: "Un mes de alquiler" }),
      "deposit.currency": campo("ARS"),
      "commission.percent": campo(null, "MISSING"),
      "lateFee.method": campo(null, "MISSING"),
      guarantors: campo([]),
      ...cambios,
    },
    unsupported: [],
    matches: {},
    ...extra,
  };
}
