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
}

export interface UserUpdateRequest {
  firstName?: string;
  lastName?: string;
  taxId?: string;
}

// --- Tenants ---

export interface TenantRequest {
  firstName: string;
  lastName: string;
  taxId: string;
  email: string;
}

export interface TenantResponse {
  id: number;
  firstName: string;
  lastName: string;
  taxId: string;
  email: string;
}

// --- Properties ---

export interface PropertyRequest {
  street: string;
  number: string;
  floorUnit?: string;
  city: string;
  province: string;
  tenantId?: number;
  bedrooms?: number;
  bathrooms?: number;
  coveredArea?: number;
  petsAllowed?: boolean;
  furnished?: boolean;
}

export interface PropertyResponse {
  id: number;
  street: string;
  number: string;
  floorUnit?: string;
  city: string;
  province: string;
  tenant?: TenantResponse;
  bedrooms?: number;
  bathrooms?: number;
  coveredArea?: number;
  petsAllowed?: boolean;
  furnished?: boolean;
}

// --- Contracts ---

export type IncrementMethod = "FIXED_PERCENTAGE" | "FIXED_AMOUNT" | "INDEX";
export type ContractStatus = "ACTIVE" | "TERMINATED" | "EXPIRED" | "SUPERSEDED";

export interface ContractRequest {
  propertyId: number;
  tenantId: number;
  initialRentAmount: number;
  startDate: string;
  termMonths: number;
  incrementMethod: IncrementMethod;
  incrementFrequencyMonths: number;
  incrementIndexName?: string;
  incrementValue?: number;
}

export interface ContractResponse {
  id: number;
  property: PropertyResponse;
  tenant: TenantResponse;
  initialRentAmount: number;
  startDate: string;
  termMonths: number;
  endDate: string;
  actualEndDate?: string;
  status: ContractStatus;
  incrementMethod: IncrementMethod;
  incrementFrequencyMonths: number;
  incrementIndexName?: string;
  incrementValue?: number;
  currentRent: number;
  documentFileName?: string;
  documentContentType?: string;
  documentSizeBytes?: number;
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

export type PaymentStatus = "PENDING" | "DUE" | "PAID" | "AWAITING_CONFIRMATION";

export interface PaymentResponse {
  id: number;
  contractId: number;
  period: string;
  dueDate: string;
  amount: number;
  status: PaymentStatus;
  receiptFileName?: string;
  receiptContentType?: string;
  receiptSizeBytes?: number;
}

export interface PaymentAmountUpdateRequest {
  amount: number;
  futureImpact: boolean;
}

export interface PaymentStatusUpdateRequest {
  status: PaymentStatus;
}

export interface PaymentListParams {
  contractId?: number;
  tenantId?: number;
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
  incrementMethod: IncrementMethod;
  incrementFrequencyMonths: number;
  incrementIndexName?: string;
  incrementValue?: number;
}

export interface InvoiceListParams {
  contractId?: number;
  tenantId?: number;
}

// --- Tenant portal ---

export interface TenantSessionRequest {
  token: string;
}
