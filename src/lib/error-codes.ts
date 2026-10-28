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
  PAYMENT_RECEIPT_NOT_IMAGE: "urn:alquia:error:payment-receipt-not-image",
  PAYMENT_RECEIPT_EMPTY: "urn:alquia:error:payment-receipt-empty",
  ADJUSTMENT_ON_CONFIRMED_INVOICE: "urn:alquia:error:adjustment-on-confirmed-invoice",
  INVOICE_TOTAL_NEGATIVE: "urn:alquia:error:invoice-total-negative",
  SCHEMA_CHANGE_OVER_PAID_INVOICE: "urn:alquia:error:schema-change-over-paid-invoice",
  ELAPSED_INVOICES_DECISION_REQUIRED: "urn:alquia:error:elapsed-invoices-decision-required",
  ELAPSED_PAID_THROUGH_OUT_OF_RANGE: "urn:alquia:error:elapsed-paid-through-out-of-range",
  GUARANTEES_LIMIT_EXCEEDED: "urn:alquia:error:guarantees-limit-exceeded",
  GUARANTEE_FIELD_NOT_ALLOWED: "urn:alquia:error:guarantee-field-not-allowed",
  LATE_FEE_NOT_CONFIGURED: "urn:alquia:error:late-fee-not-configured",
  LATE_FEE_ALREADY_SETTLED: "urn:alquia:error:late-fee-already-settled",
  CONTRACT_ALREADY_HAS_SUCCESSOR: "urn:alquia:error:contract-already-has-successor",
  EFFECTIVE_FROM_NOT_FIRST_OF_MONTH: "urn:alquia:error:effective-from-not-first-of-month",
  EFFECTIVE_FROM_NOT_FUTURE: "urn:alquia:error:effective-from-not-future",
  EFFECTIVE_FROM_OUTSIDE_TERM: "urn:alquia:error:effective-from-outside-term",
  IMPORT_FILE_TOO_LARGE: "urn:alquia:error:import-file-too-large",
  IMPORT_FILE_NOT_PDF: "urn:alquia:error:import-file-not-pdf",
  IMPORT_FILE_CORRUPT: "urn:alquia:error:import-file-corrupt",
  IMPORT_FILE_ENCRYPTED: "urn:alquia:error:import-file-encrypted",
  IMPORT_FILE_TOO_MANY_PAGES: "urn:alquia:error:import-file-too-many-pages",
  IMPORT_FILE_ACTIVE_CONTENT: "urn:alquia:error:import-file-active-content",
  IMPORT_NOT_READY: "urn:alquia:error:import-not-ready",
  IMPORT_NOT_RETRYABLE: "urn:alquia:error:import-not-retryable",
  IMPORT_ALREADY_COMPLETED: "urn:alquia:error:import-already-completed",
  IMPORT_QUOTA_EXCEEDED: "urn:alquia:error:import-quota-exceeded",
  AI_IMPORTS_UNAVAILABLE: "urn:alquia:error:ai-imports-unavailable",
  CONTRACT_DRAFT_LIMIT_REACHED: "urn:alquia:error:contract-draft-limit-reached",
  CONTRACT_DRAFT_VERSION_CONFLICT: "urn:alquia:error:contract-draft-version-conflict",
  CONTRACT_DRAFT_TOO_LARGE: "urn:alquia:error:contract-draft-too-large",
  CONTRACT_DRAFT_PAYLOAD_INVALID: "urn:alquia:error:contract-draft-payload-invalid",
  CONTRACT_DRAFT_NOT_FOUND: "urn:alquia:error:contract-draft-not-found",
  PROPERTY_DRAFT_LIMIT_REACHED: "urn:alquia:error:property-draft-limit-reached",
  PROPERTY_DRAFT_VERSION_CONFLICT: "urn:alquia:error:property-draft-version-conflict",
  PROPERTY_DRAFT_TOO_LARGE: "urn:alquia:error:property-draft-too-large",
  PROPERTY_DRAFT_PAYLOAD_INVALID: "urn:alquia:error:property-draft-payload-invalid",
  PROPERTY_DRAFT_NOT_FOUND: "urn:alquia:error:property-draft-not-found",
  PROPERTY_DRAFT_IDEMPOTENCY_KEY_INVALID: "urn:alquia:error:property-draft-idempotency-key-invalid",
  RENT_ESTIMATE_UNAVAILABLE: "urn:alquia:error:rent-estimate-unavailable",
  RENT_ESTIMATE_NO_DATA: "urn:alquia:error:rent-estimate-no-data",
  RENT_ESTIMATE_NOT_ENOUGH_DATA: "urn:alquia:error:rent-estimate-not-enough-data",
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
  [ERROR.PAYMENT_RECEIPT_NOT_IMAGE]:
    "El comprobante tiene que ser una imagen PNG, JPG o WebP.",
  [ERROR.PAYMENT_RECEIPT_EMPTY]:
    "El comprobante está vacío. Suba una imagen PNG, JPG o WebP.",
  [ERROR.ADJUSTMENT_ON_CONFIRMED_INVOICE]:
    "La cuota quedó confirmada, así que su importe ya está cerrado.",
  [ERROR.INVOICE_TOTAL_NEGATIVE]: "El total de la cuota no puede quedar negativo.",
  [ERROR.SCHEMA_CHANGE_OVER_PAID_INVOICE]:
    "Ya hay una cuota paga desde ese mes, así que no se puede programar el cambio ahí.",
  [ERROR.ELAPSED_INVOICES_DECISION_REQUIRED]: "Hay cuotas anteriores a hoy. Indique hasta qué mes le pagaron.",
  [ERROR.ELAPSED_PAID_THROUGH_OUT_OF_RANGE]: "Ese mes no corresponde a una cuota anterior a hoy. Elija otro.",
  [ERROR.GUARANTEES_LIMIT_EXCEEDED]: "Un contrato admite hasta tres garantías.",
  [ERROR.GUARANTEE_FIELD_NOT_ALLOWED]: "Hay un dato que no corresponde al tipo de garantía. Revise cada una.",
  [ERROR.LATE_FEE_NOT_CONFIGURED]: "Este contrato no tiene punitorios, así que la cuota no tiene recargo.",
  [ERROR.LATE_FEE_ALREADY_SETTLED]: "La cuota ya está paga: su recargo quedó firme y no se puede cambiar.",
  [ERROR.CONTRACT_ALREADY_HAS_SUCCESSOR]: "Ese contrato ya tiene un cambio programado.",
  [ERROR.EFFECTIVE_FROM_NOT_FIRST_OF_MONTH]: "El cambio tiene que arrancar el primer día de un mes.",
  [ERROR.EFFECTIVE_FROM_NOT_FUTURE]: "El cambio tiene que arrancar en un mes posterior al actual.",
  [ERROR.EFFECTIVE_FROM_OUTSIDE_TERM]: "Ese mes queda fuera del plazo del contrato.",
  [ERROR.IMPORT_FILE_TOO_LARGE]: "El archivo es demasiado grande. El máximo es 20 MB.",
  [ERROR.IMPORT_FILE_NOT_PDF]: "Ese archivo no es un PDF. Si tiene el contrato en papel, escanéelo y guárdelo como PDF.",
  [ERROR.IMPORT_FILE_CORRUPT]: "No pudimos abrir el archivo: parece dañado. Pruebe con otra copia.",
  [ERROR.IMPORT_FILE_ENCRYPTED]: "El PDF tiene contraseña. Guárdelo sin contraseña y vuelva a subirlo.",
  [ERROR.IMPORT_FILE_TOO_MANY_PAGES]: "El PDF tiene demasiadas páginas para leerlo. Suba solo el contrato.",
  [ERROR.IMPORT_FILE_ACTIVE_CONTENT]:
    "Este PDF trae contenido que no podemos abrir con seguridad. Pruebe con una copia escaneada o impresa a PDF.",
  [ERROR.IMPORT_NOT_READY]: "Todavía estamos leyendo el contrato. Espere un momento.",
  [ERROR.IMPORT_NOT_RETRYABLE]: "Esta lectura no se puede volver a intentar. Suba el archivo de nuevo.",
  [ERROR.IMPORT_ALREADY_COMPLETED]: "Este contrato ya se creó desde esa lectura.",
  [ERROR.IMPORT_QUOTA_EXCEEDED]: "Ya usó todas las lecturas de contratos que tiene disponibles. Puede cargar el contrato a mano.",
  [ERROR.AI_IMPORTS_UNAVAILABLE]: "La lectura de contratos no está disponible en este momento. Puede cargar el contrato a mano.",
  [ERROR.CONTRACT_DRAFT_LIMIT_REACHED]:
    "Ya tiene el máximo de borradores guardados. Termine o descarte uno para empezar otro contrato.",
  [ERROR.CONTRACT_DRAFT_VERSION_CONFLICT]: "Este borrador cambió en otro dispositivo.",
  [ERROR.CONTRACT_DRAFT_TOO_LARGE]: "El borrador es demasiado grande para guardarlo.",
  [ERROR.CONTRACT_DRAFT_PAYLOAD_INVALID]: "No pudimos guardar el borrador. Inténtelo de nuevo.",
  [ERROR.CONTRACT_DRAFT_NOT_FOUND]: "Ese borrador ya no existe. Puede que se haya descartado o vencido.",
  [ERROR.PROPERTY_DRAFT_LIMIT_REACHED]:
    "Ya tiene el máximo de borradores guardados. Termine o descarte uno para empezar otra propiedad.",
  [ERROR.PROPERTY_DRAFT_VERSION_CONFLICT]: "Este borrador cambió en otro dispositivo.",
  [ERROR.PROPERTY_DRAFT_TOO_LARGE]: "El borrador es demasiado grande para guardarlo.",
  [ERROR.PROPERTY_DRAFT_PAYLOAD_INVALID]: "No pudimos guardar el borrador. Inténtelo de nuevo.",
  [ERROR.PROPERTY_DRAFT_NOT_FOUND]: "Ese borrador ya no existe. Puede que se haya descartado o vencido.",
  [ERROR.PROPERTY_DRAFT_IDEMPOTENCY_KEY_INVALID]: "No pudimos guardar el borrador. Inténtelo de nuevo.",
  [ERROR.RENT_ESTIMATE_UNAVAILABLE]:
    "El estimador de alquiler no está disponible en este momento. Probá de nuevo en un rato.",
  [ERROR.RENT_ESTIMATE_NO_DATA]:
    "El estimador está disponible, pero todavía no hay propiedades cargadas para estimar.",
  [ERROR.RENT_ESTIMATE_NOT_ENOUGH_DATA]:
    "No hay suficientes propiedades cerca para estimar el alquiler de esta propiedad.",
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

function idDeExtension(err: unknown, clave: string): number | null {
  if (!(err instanceof ApiError)) return null;
  const valor = err.extensions?.[clave];
  return typeof valor === "number" ? valor : null;
}

/** El inquilino que ya existe con ese CUIT o teléfono, en un 409 del alta de contrato. */
export function idDelInquilinoExistente(err: unknown): number | null {
  return idDeExtension(err, "existingTenantId");
}

/** El contrato vigente de la propiedad, en un 409 del alta de contrato. */
export function idDelContratoActivo(err: unknown): number | null {
  return idDeExtension(err, "activeContractId");
}

/** La versión que tiene el backend de un borrador, en un 409 de guardado. */
export function versionActualDelBorrador(err: unknown): number | null {
  return idDeExtension(err, "currentVersion");
}

/** Cuántos borradores admite el backend, en un 409 al crear uno de más. */
export function limiteDeBorradores(err: unknown): number | null {
  return idDeExtension(err, "limit");
}
