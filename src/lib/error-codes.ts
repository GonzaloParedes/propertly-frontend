import { ApiError } from "./api";

// Espejo del catálogo `ApiErrorType` del backend (RFC 9457). Cada `type` es un URN
// estable `urn:alquia:error:<slug>`. Se mantiene sincronizado A MANO con el back
// (no hay pipeline cross-repo todavía — ALQ-32): ante un `type` que no esté acá, el
// front cae al fallback en español, nunca muestra el texto en inglés del backend.
// Sólo se listan los `type` que alguna pantalla distingue; el resto usa el fallback.
export const ERROR = {
  DUPLICATE_EMAIL: "urn:alquia:error:duplicate-email",
  DUPLICATE_TAX_ID: "urn:alquia:error:duplicate-tax-id",
  DUPLICATE_PHONE_NUMBER: "urn:alquia:error:duplicate-phone-number",
  PROPERTY_HAS_ACTIVE_CONTRACT: "urn:alquia:error:property-has-active-contract",
  PAYMENT_ON_UNCONFIRMED_INVOICE: "urn:alquia:error:payment-on-unconfirmed-invoice",
  ADJUSTMENT_ON_CONFIRMED_INVOICE: "urn:alquia:error:adjustment-on-confirmed-invoice",
  INVOICE_TOTAL_NEGATIVE: "urn:alquia:error:invoice-total-negative",
  SCHEMA_CHANGE_OVER_PAID_INVOICE: "urn:alquia:error:schema-change-over-paid-invoice",
  CONTRACT_ALREADY_HAS_SUCCESSOR: "urn:alquia:error:contract-already-has-successor",
  EFFECTIVE_FROM_NOT_FIRST_OF_MONTH: "urn:alquia:error:effective-from-not-first-of-month",
  EFFECTIVE_FROM_NOT_FUTURE: "urn:alquia:error:effective-from-not-future",
  EFFECTIVE_FROM_OUTSIDE_TERM: "urn:alquia:error:effective-from-outside-term",
} as const;

export type ErrorType = (typeof ERROR)[keyof typeof ERROR];

// Copy en español por defecto para cada `type`. Una pantalla puede sobrescribir el
// texto de un `type` puntual pasando `overrides` a `copyDeError`.
const COPY: Record<string, string> = {
  [ERROR.DUPLICATE_EMAIL]: "Ese correo ya tiene una cuenta.",
  [ERROR.DUPLICATE_TAX_ID]: "Ese documento ya está registrado.",
  [ERROR.DUPLICATE_PHONE_NUMBER]: "Ese teléfono ya está registrado.",
  [ERROR.PROPERTY_HAS_ACTIVE_CONTRACT]:
    "Esa propiedad ya tiene un contrato vigente. Finalícelo antes de crear otro.",
  [ERROR.PAYMENT_ON_UNCONFIRMED_INVOICE]:
    "Primero hay que confirmar la cuota. Después se le puede registrar el pago.",
  [ERROR.ADJUSTMENT_ON_CONFIRMED_INVOICE]:
    "La cuota quedó confirmada, así que su importe ya está cerrado.",
  [ERROR.INVOICE_TOTAL_NEGATIVE]: "El total de la cuota no puede quedar negativo.",
  [ERROR.SCHEMA_CHANGE_OVER_PAID_INVOICE]:
    "Ya hay una cuota paga desde ese mes, así que no se puede programar el cambio ahí.",
  [ERROR.CONTRACT_ALREADY_HAS_SUCCESSOR]: "Ese contrato ya tiene un cambio programado.",
  [ERROR.EFFECTIVE_FROM_NOT_FIRST_OF_MONTH]: "El cambio tiene que arrancar el primer día de un mes.",
  [ERROR.EFFECTIVE_FROM_NOT_FUTURE]: "El cambio tiene que arrancar en un mes posterior al actual.",
  [ERROR.EFFECTIVE_FROM_OUTSIDE_TERM]: "Ese mes queda fuera del plazo del contrato.",
};

export const FALLBACK = "No se pudo completar la acción. Inténtelo de nuevo más tarde.";

/**
 * Resuelve el copy en español de un error del backend por su `type`:
 * `overrides` (copy propio de la pantalla) → `COPY` (copy por defecto) → `fallback`.
 * Nunca devuelve el `detail`/`title` crudos del backend (están en inglés): un `type`
 * desconocido o ausente cae al fallback.
 */
export function copyDeError(
  err: unknown,
  opts: { overrides?: Record<string, string>; fallback?: string } = {}
): string {
  const { overrides, fallback = FALLBACK } = opts;
  if (err instanceof ApiError && err.type) {
    return overrides?.[err.type] ?? COPY[err.type] ?? fallback;
  }
  return fallback;
}
