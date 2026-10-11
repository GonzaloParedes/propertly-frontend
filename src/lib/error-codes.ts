import { ApiError } from "./api";

// Espejo del catálogo `ApiErrorType` del backend (RFC 9457). Cada `type` es un URN
// estable `urn:alquia:error:<slug>`. Se mantiene sincronizado A MANO con el back
// (no hay pipeline cross-repo todavía — ALQ-32): ante un `type` que no esté acá, el
// front cae al fallback en español, nunca muestra el texto en inglés del backend.
// Sólo se listan los `type` que alguna pantalla distingue; el resto usa el fallback.
export const ERROR = {
  EMAIL_NOT_VERIFIED: "urn:alquia:error:email-not-verified",
  INVALID_OR_EXPIRED_TOKEN: "urn:alquia:error:invalid-or-expired-token",
  DUPLICATE_EMAIL: "urn:alquia:error:duplicate-email",
  DUPLICATE_TAX_ID: "urn:alquia:error:duplicate-tax-id",
  DUPLICATE_PHONE_NUMBER: "urn:alquia:error:duplicate-phone-number",
  PROPERTY_HAS_ACTIVE_CONTRACT: "urn:alquia:error:property-has-active-contract",
  PAYMENT_ON_UNCONFIRMED_INVOICE: "urn:alquia:error:payment-on-unconfirmed-invoice",
  ADJUSTMENT_ON_CONFIRMED_INVOICE: "urn:alquia:error:adjustment-on-confirmed-invoice",
  INVOICE_TOTAL_NEGATIVE: "urn:alquia:error:invoice-total-negative",
  SCHEMA_CHANGE_OVER_PAID_INVOICE: "urn:alquia:error:schema-change-over-paid-invoice",
  GUARANTEES_LIMIT_EXCEEDED: "urn:alquia:error:guarantees-limit-exceeded",
  GUARANTEE_FIELD_NOT_ALLOWED: "urn:alquia:error:guarantee-field-not-allowed",
  LATE_FEE_NOT_CONFIGURED: "urn:alquia:error:late-fee-not-configured",
  LATE_FEE_ALREADY_SETTLED: "urn:alquia:error:late-fee-already-settled",
  CONTRACT_ALREADY_HAS_SUCCESSOR: "urn:alquia:error:contract-already-has-successor",
  EFFECTIVE_FROM_NOT_FIRST_OF_MONTH: "urn:alquia:error:effective-from-not-first-of-month",
  EFFECTIVE_FROM_NOT_FUTURE: "urn:alquia:error:effective-from-not-future",
  EFFECTIVE_FROM_OUTSIDE_TERM: "urn:alquia:error:effective-from-outside-term",
} as const;

export type ErrorType = (typeof ERROR)[keyof typeof ERROR];

// Copy en español por defecto para cada `type`. Una pantalla puede sobrescribir el
// texto de un `type` puntual pasando `overrides` a `copyDeError`.
const COPY: Record<string, string> = {
  [ERROR.EMAIL_NOT_VERIFIED]:
    "Tenés que verificar tu correo. Te reenviamos el enlace, revisá tu casilla (y el spam).",
  [ERROR.INVALID_OR_EXPIRED_TOKEN]: "El enlace venció o no es válido. Pedí uno nuevo.",
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
  [ERROR.GUARANTEES_LIMIT_EXCEEDED]: "Un contrato admite hasta tres garantías.",
  [ERROR.GUARANTEE_FIELD_NOT_ALLOWED]: "Hay un dato que no corresponde al tipo de garantía. Revise cada una.",
  [ERROR.LATE_FEE_NOT_CONFIGURED]: "Este contrato no tiene punitorios, así que la cuota no tiene recargo.",
  [ERROR.LATE_FEE_ALREADY_SETTLED]: "La cuota ya está paga: su recargo quedó firme y no se puede cambiar.",
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
