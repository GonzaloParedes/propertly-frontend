// --- Auth ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  taxId: string;
  phoneNumber: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// --- Users ---

export interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  taxId?: string;
  realEstateAgency?: boolean;
  phoneNumber?: string;
}

/**
 * Es un reemplazo total, no un patch: los cuatro campos son @NotBlank en el
 * backend, así que cambiar sólo el teléfono obliga a reenviar el resto.
 */
export interface UserUpdateRequest {
  firstName: string;
  lastName: string;
  taxId: string;
  phoneNumber: string;
}

// --- Tenants ---

export interface TenantRequest {
  firstName: string;
  lastName: string;
  taxId: string;
  email: string;
  phoneNumber: string;
}

export interface TenantResponse {
  id: number;
  firstName: string;
  lastName: string;
  taxId: string;
  email: string;
  phoneNumber: string;
}

// --- Properties ---

// Las ocho de la lista de producto. Las cuatro últimas llegaron con la rama
// `codex/frontend-integration-lots` (P1-3); antes había que ofrecer sólo cuatro.
export type PropertyCategory =
  | "PH"
  | "HOUSE"
  | "APARTMENT"
  | "COMMERCIAL_PREMISES"
  | "OFFICE"
  | "GARAGE"
  | "LAND"
  | "OTHER";

/**
 * El contrato vigente de la propiedad, reducido. Evita traerse `/contracts`
 * entero para saber si una propiedad está alquilada (P0-7).
 */
export interface ActiveContractSummary {
  id: number;
  currentRent: number;
  status: ContractStatus;
}

export interface PropertyRequest {
  street: string;
  number: string;
  floorUnit?: string;
  city: string;
  province: string;
  postalCode?: string;
  /**
   * Las dos van juntas o no va ninguna: el backend valida rango en cada una por
   * separado, pero media coordenada no ubica nada. `/address-lookup/resolve` las
   * devuelve juntas, así que en la práctica sale de ahí o no sale.
   */
  latitude?: number;
  longitude?: number;
  tenantId?: number;
  bedrooms?: number;
  bathrooms?: number;
  coveredArea?: number;
  petsAllowed?: boolean;
  furnished?: boolean;
  category: PropertyCategory;
}

export interface PropertyResponse {
  id: number;
  street: string;
  number: string;
  floorUnit?: string;
  city: string;
  province: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  /** Decoración heredada: no se sincroniza con nada. El inquilino sale del
   *  contrato. Confirmado por el backend el 17/09/2026. */
  tenant?: TenantResponse;
  bedrooms?: number;
  bathrooms?: number;
  coveredArea?: number;
  petsAllowed?: boolean;
  furnished?: boolean;
  category: PropertyCategory;
  /**
   * `null` cuando la propiedad no tiene contrato vigente — el backend manda el
   * campo siempre, con valor nulo. Verificado contra la instancia el 28/09/2026.
   * Ausente (`undefined`) sólo contra un build anterior a
   * `codex/frontend-integration-lots`, y esa diferencia es la que deja
   * distinguir «sin alquilar» de «el backend no me lo dijo».
   */
  activeContract?: ActiveContractSummary | null;
  /** Instante ISO-8601. `null` si no está archivada. */
  archivedAt?: string | null;
}

// --- Contracts ---

export type IncrementMethod = "FIXED_PERCENTAGE" | "FIXED_AMOUNT" | "INDEX";
export type ContractStatus = "ACTIVE" | "SCHEDULED" | "TERMINATED" | "EXPIRED" | "SUPERSEDED";

export type Currency = "ARS" | "USD";

// Tres, no las cinco que ofrecía `ContractForm`: no existen aval bancario ni
// «otro». Ver el pendiente de P1-4 en docs/backend/.
export type DepositType = "CASH" | "SURETY_INSURANCE" | "PROPERTY_GUARANTEE";

// `SHARED`, no `SPLIT`: pedimos uno y mandaron el otro. Manda el backend.
export type CommissionPayer = "LANDLORD" | "TENANT" | "SHARED";

/** Un aumento ya aplicado. La ventana del índice sólo viene en contratos INDEX. */
export interface RentIncrementResponse {
  periodNumber: number;
  appliedAt: string;
  sourceValue: number;
  resultingRent: number;
  indexWindowStartPeriod?: string;
  indexWindowEndPeriod?: string;
}

/** El enlace del portal, para copiarlo sin reenviar el mail. */
export interface TenantAccessResponse {
  url: string;
}

export interface ContractRequest {
  propertyId: number;
  tenantId: number;
  initialRentAmount: number;
  startDate: string;
  termMonths: number;
  /** Día de vencimiento. El backend lo acota a 1–28: febrero fija el techo. */
  dueDay: number;
  incrementMethod: IncrementMethod;
  incrementFrequencyMonths: number;
  incrementIndexName?: string;
  incrementValue?: number;
  /** Ausente = ARS. El backend no la exige y las cuotas heredan la del contrato. */
  currency?: Currency;
  depositAmount?: number;
  depositType?: DepositType;
  /** 0 a 100. */
  commissionPercent?: number;
  commissionPayer?: CommissionPayer;
  /** Reusa el enum de los ajustes: porcentaje o monto fijo. */
  lateFeeType?: AdjustmentValueType;
  lateFeeValue?: number;
  lateFeeGraceDays?: number;
  autoRenewal?: boolean;
  terminationNoticeMonths?: number;
  earlyTerminationPenalty?: number;
}

export interface ContractResponse {
  id: number;
  property: PropertyResponse;
  tenant: TenantResponse;
  initialRentAmount: number;
  startDate: string;
  termMonths: number;
  dueDay: number;
  endDate: string;
  actualEndDate?: string;
  status: ContractStatus;
  incrementMethod: IncrementMethod;
  incrementFrequencyMonths: number;
  incrementIndexName?: string;
  incrementValue?: number;
  /** Ausente = ARS. El backend no la exige y las cuotas heredan la del contrato. */
  currency?: Currency;
  depositAmount?: number;
  depositType?: DepositType;
  /** 0 a 100. */
  commissionPercent?: number;
  commissionPayer?: CommissionPayer;
  /** Reusa el enum de los ajustes: porcentaje o monto fijo. */
  lateFeeType?: AdjustmentValueType;
  lateFeeValue?: number;
  lateFeeGraceDays?: number;
  autoRenewal?: boolean;
  terminationNoticeMonths?: number;
  earlyTerminationPenalty?: number;
  currentRent: number;
  /** Cuándo se aplica el próximo aumento. Lo calcula el backend (P0-3). */
  nextIncrementDate?: string;
  /** Sólo cuando es calculable: en un contrato por índice sin valor publicado no viene. */
  nextIncrementRent?: number;
  documentFileName?: string;
  documentContentType?: string;
  documentSizeBytes?: number;
  /** Instante ISO-8601. */
  documentUploadedAt?: string;
  predecessorContractId?: number;
  successorContractId?: number;
}

export interface ContractTerminateRequest {
  terminationDate: string;
}

export interface ContractListParams {
  propertyId?: number;
  tenantId?: number;
}

// --- Payments ---

// El commit bb50542 del backend movió el pago: dejó de colgar del contrato y
// pasó a colgar de la cuota, y sus estados no son los de la cuota. Tipos
// corregidos el 30/08/2026; los métodos de `backend-client.ts`, el 07/09/2026
// al construir Cobranzas — ya no queda deuda en este grupo.
export type PaymentStatus = "AWAITING_CONFIRMATION" | "CONFIRMED" | "REJECTED";

export interface PaymentResponse {
  id: number;
  invoiceId: number;
  status: PaymentStatus;
  submittedByTenant: boolean;
  receiptFileName?: string;
  receiptContentType?: string;
  receiptSizeBytes?: number;
  /** Instante ISO-8601 en que se subió el comprobante (P0-4). */
  submittedAt?: string;
  /** Sólo en un pago REJECTED, y sólo si el propietario escribió un motivo. */
  rejectionReason?: string;
}

/** El motivo es opcional: `POST /payments/{id}/reject` acepta body vacío. */
export interface PaymentRejectionRequest {
  reason?: string;
}

// --- Invoices ---

export type InvoiceStatus = "PENDING" | "DUE" | "PAID";
export type AdjustmentKind = "DISCOUNT" | "SURCHARGE";
export type AdjustmentValueType = "FIXED_AMOUNT" | "PERCENTAGE";

export interface AdjustmentResponse {
  id: number;
  name: string;
  kind: AdjustmentKind;
  valueType: AdjustmentValueType;
  value: number;
}

export interface InvoiceResponse {
  id: number;
  contractId: number;
  period: string;
  dueDate: string;
  baseAmount: number;
  total: number;
  status: InvoiceStatus;
  confirmed: boolean;
  adjustments: AdjustmentResponse[];
  payments: PaymentResponse[];
}

export interface InvoiceAdjustmentRequest {
  name: string;
  kind: AdjustmentKind;
  valueType: AdjustmentValueType;
  value: number;
}

export interface SchemaChangeRequest {
  rentBaseline: number;
  dueDay: number;
  incrementMethod: IncrementMethod;
  incrementFrequencyMonths: number;
  incrementIndexName?: string;
  incrementValue?: number;
}

/**
 * Las condiciones nuevas más el mes desde el que rigen. `effectiveFrom` es el
 * primer día de un mes posterior al corriente («2026-10-01»); cualquier otro
 * día es un 400. Es el endpoint de contrato, no el de cuota.
 */
export interface ScheduledSchemaChangeRequest extends SchemaChangeRequest {
  effectiveFrom: string;
}

/**
 * `period` no se combina con `periodFrom`/`periodTo`: mandar ambos es un 400.
 * Las tres son fechas ISO completas («2026-08-01»), no «2026-08»: el backend
 * las parsea como `LocalDate`. Se usa el día 1 porque el período es el mes.
 */
export interface InvoiceListParams {
  contractId?: number;
  tenantId?: number;
  period?: string;
  periodFrom?: string;
  periodTo?: string;
  /** Repetible. Vacío es un 400. */
  status?: InvoiceStatus[];
}

// --- Pre-invoices ---

/**
 * La proyección de una cuota futura. Que no venga la del período es la forma en
 * que el backend dice «todavía no se puede saber»: para un contrato por índice
 * sin valor publicado, la fila no existe. No hay `amount: null` (P0-2).
 */
export interface PreInvoiceResponse {
  contractId: number;
  period: string;
  amount: number;
}

/** Mismas reglas de período que `InvoiceListParams`. */
export interface PreInvoiceListParams {
  contractId?: number;
  period?: string;
  periodFrom?: string;
  periodTo?: string;
}

// --- Reminder settings ---

/** Los días están acotados a 0–30 en el backend. */
export interface ReminderSettingsResponse {
  daysBeforeDue: number;
  dueDateReminderEnabled: boolean;
  daysAfterDue: number;
  enabled: boolean;
}

export type ReminderSettingsRequest = ReminderSettingsResponse;

// --- Tenant portal ---

export interface TenantSessionRequest {
  token: string;
}
