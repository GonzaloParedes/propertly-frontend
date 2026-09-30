// Entidad de directorio: un propietario existe una sola vez y se referencia
// desde cada inmueble, en vez de retipear nombre/teléfono/email en cada alta.
export interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
}

// La relación inmueble-propietario (el % de tenencia) es propia de ESE
// inmueble, no del propietario — por eso vive acá y no en Owner.
export interface PropertyOwner {
  owner: Owner;
  ownershipPercent: string;
}

export interface Property {
  id: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  propertyType: string;
  owners: PropertyOwner[];
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  isGuarantor: boolean;
}

export type IndexType = "IPC" | "ICL" | "CUSTOM";
export type AdjustmentFrequency = "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
export type Currency = "ARS" | "USD";
export type CommissionPayer = "PROPIETARIO" | "INQUILINO" | "COMPARTIDA";
export type LateFeeType = "PORCENTAJE" | "MONTO_FIJO";
export type ContractStatus = "vigente";

export interface Contract {
  id: string;
  property: Property;
  tenants: Tenant[];
  startDate: string;
  endDate: string;
  rentAmount: string;
  currency: Currency;
  paymentDueDay: string;
  depositAmount: string;
  depositType: string;
  commissionPercent: string;
  commissionPayer: CommissionPayer;
  indexType: IndexType;
  customIndexPercent: string;
  adjustmentFrequency: AdjustmentFrequency;
  autoRenewal: boolean;
  terminationNoticeMonths: string;
  hasEarlyTerminationPenalty: boolean;
  earlyTerminationPenalty: string;
  lateFeeType: LateFeeType;
  lateFeeValue: string;
  lateFeeGraceDays: string;
  signedContractFile: File | null;
  status: ContractStatus;
}
