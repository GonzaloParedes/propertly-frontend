import { apiGet, apiPost, apiPostForm, apiPut, apiDelete, apiGetBlob } from "@/lib/api";
import type {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UserResponse,
  UserUpdateRequest,
  TenantRequest,
  TenantResponse,
  PropertyRequest,
  PropertyResponse,
  ContractRequest,
  ContractResponse,
  ContractTerminateRequest,
  ContractListParams,
  PaymentResponse,
  TenantSessionRequest,
  InvoiceResponse,
  InvoiceAdjustmentRequest,
  SchemaChangeRequest,
  ScheduledSchemaChangeRequest,
  InvoiceListParams,
  PreInvoiceResponse,
  PreInvoiceListParams,
  ReminderSettingsResponse,
  ReminderSettingsRequest,
  RentIncrementResponse,
  TenantAccessResponse,
  AddressSuggestionResponse,
  ResolvedAddressResponse,
  PaymentRejectionRequest,
} from "@/lib/backend-types";

/**
 * Un array se repite como parámetro (`status=DUE&status=PAID`), que es como
 * Spring espera una `List<T>`. `undefined` se omite; un array vacío también,
 * porque el backend lo rechaza con un 400 y mandarlo nunca es intencional.
 */
function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
    } else {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const AlquiaBackendClient = {
  auth: {
    login: (body: LoginRequest): Promise<void> =>
      apiPost("/auth/login", body, { retry: false }),
    logout: (): Promise<void> => apiPost("/auth/logout", undefined, { retry: false }),
    refresh: (): Promise<void> => apiPost("/auth/refresh", undefined, { retry: false }),
    me: (options?: { retry?: boolean }): Promise<string> =>
      apiGet<string>("/auth/me", options),
    register: (body: RegisterRequest): Promise<void> =>
      apiPost("/auth/register", body, { retry: false }),
    forgotPassword: (body: ForgotPasswordRequest): Promise<void> =>
      apiPost("/auth/forgot-password", body, { retry: false }),
    resetPassword: (body: ResetPasswordRequest): Promise<void> =>
      apiPost("/auth/reset-password", body, { retry: false }),
  },

  users: {
    getMe: (options?: { retry?: boolean }): Promise<UserResponse> =>
      apiGet<UserResponse>("/users/me", options),
    updateMe: (body: UserUpdateRequest): Promise<UserResponse> =>
      apiPut<UserResponse>("/users/me", body),
    deleteMe: (): Promise<void> => apiDelete("/users/me"),
    getReminderSettings: (): Promise<ReminderSettingsResponse> =>
      apiGet<ReminderSettingsResponse>("/users/me/reminder-settings"),
    updateReminderSettings: (
      body: ReminderSettingsRequest
    ): Promise<ReminderSettingsResponse> =>
      apiPut<ReminderSettingsResponse>("/users/me/reminder-settings", body),
  },

  tenants: {
    list: (): Promise<TenantResponse[]> => apiGet<TenantResponse[]>("/tenants"),
    create: (body: TenantRequest): Promise<TenantResponse> =>
      apiPost<TenantResponse>("/tenants", body),
    get: (id: number): Promise<TenantResponse> =>
      apiGet<TenantResponse>(`/tenants/${id}`),
    update: (id: number, body: TenantRequest): Promise<TenantResponse> =>
      apiPut<TenantResponse>(`/tenants/${id}`, body),
    // Borrado físico. Para sacarlo de las listas sin perder su historia va
    // `archive`, que es lo que ofrece la UI.
    remove: (id: number): Promise<void> => apiDelete(`/tenants/${id}`),
    listArchived: (): Promise<TenantResponse[]> =>
      apiGet<TenantResponse[]>("/tenants/archived"),
    archive: (id: number): Promise<TenantResponse> =>
      apiPost<TenantResponse>(`/tenants/${id}/archive`),
    restore: (id: number): Promise<TenantResponse> =>
      apiPost<TenantResponse>(`/tenants/${id}/restore`),
  },

  properties: {
    list: (): Promise<PropertyResponse[]> => apiGet<PropertyResponse[]>("/properties"),
    create: (body: PropertyRequest): Promise<PropertyResponse> =>
      apiPost<PropertyResponse>("/properties", body),
    get: (id: number): Promise<PropertyResponse> =>
      apiGet<PropertyResponse>(`/properties/${id}`),
    update: (id: number, body: PropertyRequest): Promise<PropertyResponse> =>
      apiPut<PropertyResponse>(`/properties/${id}`, body),
    remove: (id: number): Promise<void> => apiDelete(`/properties/${id}`),
    listArchived: (): Promise<PropertyResponse[]> =>
      apiGet<PropertyResponse[]>("/properties/archived"),
    archive: (id: number): Promise<PropertyResponse> =>
      apiPost<PropertyResponse>(`/properties/${id}/archive`),
    restore: (id: number): Promise<PropertyResponse> =>
      apiPost<PropertyResponse>(`/properties/${id}/restore`),
  },

  contracts: {
    list: (params?: ContractListParams): Promise<ContractResponse[]> =>
      apiGet<ContractResponse[]>(`/contracts${buildQuery(params ?? {})}`),
    create: (body: ContractRequest): Promise<ContractResponse> =>
      apiPost<ContractResponse>("/contracts", body),
    get: (id: number): Promise<ContractResponse> =>
      apiGet<ContractResponse>(`/contracts/${id}`),
    update: (id: number, body: ContractRequest): Promise<ContractResponse> =>
      apiPut<ContractResponse>(`/contracts/${id}`, body),
    terminate: (id: number, body: ContractTerminateRequest): Promise<ContractResponse> =>
      apiPost<ContractResponse>(`/contracts/${id}/terminate`, body),
    // Programa las condiciones nuevas para un mes futuro: devuelve el sucesor
    // en SCHEDULED y deja vigente al contrato actual hasta ese mes.
    scheduleSchemaChange: (
      id: number,
      body: ScheduledSchemaChangeRequest
    ): Promise<ContractResponse> =>
      apiPost<ContractResponse>(`/contracts/${id}/schema-change`, body, { retry: false }),
    attachDocument: (id: number, file: File): Promise<ContractResponse> => {
      const form = new FormData();
      form.append("file", file);
      return apiPostForm<ContractResponse>(`/contracts/${id}/document`, form);
    },
    getDocument: (id: number): Promise<Blob> => apiGetBlob(`/contracts/${id}/document`),
    removeDocument: (id: number): Promise<void> => apiDelete(`/contracts/${id}/document`),
    resendTenantAccess: (id: number): Promise<void> =>
      apiPost(`/contracts/${id}/tenant-access/resend`),
    // Devuelve el enlace sin reenviar el mail: es lo que necesita «Copiar
    // enlace». El QR lo arma el front.
    getTenantAccess: (id: number): Promise<TenantAccessResponse> =>
      apiGet<TenantAccessResponse>(`/contracts/${id}/tenant-access`),
    rentIncrements: (id: number): Promise<RentIncrementResponse[]> =>
      apiGet<RentIncrementResponse[]>(`/contracts/${id}/rent-increments`),
  },

  payments: {
    // Un pago cuelga de la cuota, no del contrato: para llegar a él hay que
    // pasar por su `invoiceId`, que además es obligatorio.
    list: (invoiceId: number): Promise<PaymentResponse[]> =>
      apiGet<PaymentResponse[]>(`/payments?invoiceId=${invoiceId}`),
    // El comprobante es obligatorio al crear el pago: no hay un paso aparte de
    // "adjuntar". El que carga el propietario nace CONFIRMED; el del inquilino,
    // AWAITING_CONFIRMATION.
    create: (invoiceId: number, file: File): Promise<PaymentResponse> => {
      const form = new FormData();
      form.append("file", file);
      return apiPostForm<PaymentResponse>(`/payments?invoiceId=${invoiceId}`, form);
    },
    getReceipt: (id: number, options?: { download?: boolean }): Promise<Blob> =>
      apiGetBlob(`/payments/${id}/receipt${options?.download ? "?download=true" : ""}`),
    confirm: (id: number): Promise<PaymentResponse> =>
      apiPost<PaymentResponse>(`/payments/${id}/confirm`),
    // El motivo es opcional y viaja en el body; vuelve como `rejectionReason`.
    reject: (id: number, body?: PaymentRejectionRequest): Promise<PaymentResponse> =>
      apiPost<PaymentResponse>(`/payments/${id}/reject`, body),
  },

  invoices: {
    list: (params?: InvoiceListParams): Promise<InvoiceResponse[]> =>
      apiGet<InvoiceResponse[]>(`/invoices${buildQuery(params ?? {})}`),
    get: (id: number): Promise<InvoiceResponse> =>
      apiGet<InvoiceResponse>(`/invoices/${id}`),
    addAdjustment: (id: number, body: InvoiceAdjustmentRequest): Promise<InvoiceResponse> =>
      apiPost<InvoiceResponse>(`/invoices/${id}/adjustments`, body),
    editAdjustment: (
      id: number,
      adjustmentId: number,
      body: InvoiceAdjustmentRequest
    ): Promise<InvoiceResponse> =>
      apiPut<InvoiceResponse>(`/invoices/${id}/adjustments/${adjustmentId}`, body),
    removeAdjustment: (id: number, adjustmentId: number): Promise<void> =>
      apiDelete(`/invoices/${id}/adjustments/${adjustmentId}`),
    confirm: (id: number): Promise<InvoiceResponse> =>
      apiPost<InvoiceResponse>(`/invoices/${id}/confirm`),
    schemaChange: (id: number, body: SchemaChangeRequest): Promise<ContractResponse> =>
      apiPost<ContractResponse>(`/invoices/${id}/schema-change`, body),
  },

  addressLookup: {
    autocomplete: (query: string): Promise<AddressSuggestionResponse[]> =>
      apiGet<AddressSuggestionResponse[]>(`/address-lookup/autocomplete${buildQuery({ query })}`),
    resolve: (reference: string): Promise<ResolvedAddressResponse> =>
      apiGet<ResolvedAddressResponse>(`/address-lookup/resolve${buildQuery({ reference })}`),
  },

  preInvoices: {
    list: (params?: PreInvoiceListParams): Promise<PreInvoiceResponse[]> =>
      apiGet<PreInvoiceResponse[]>(`/pre-invoices${buildQuery(params ?? {})}`),
  },

  tenantAuth: {
    session: (body: TenantSessionRequest): Promise<void> =>
      apiPost("/tenant-auth/session", body, { retry: false }),
  },

  tenantPortal: {
    // El inquilino ve sus cuotas, no sus pagos: los pagos vienen embebidos en
    // cada InvoiceResponse.
    invoices: (): Promise<InvoiceResponse[]> =>
      apiGet<InvoiceResponse[]>("/tenant/invoices", { retry: false }),
    createPayment: (invoiceId: number, file: File): Promise<PaymentResponse> => {
      const form = new FormData();
      form.append("file", file);
      return apiPostForm<PaymentResponse>(`/tenant/payments?invoiceId=${invoiceId}`, form, {
        retry: false,
      });
    },
    getReceipt: (id: number): Promise<Blob> =>
      apiGetBlob(`/tenant/payments/${id}/receipt`, { retry: false }),
  },
};

export type {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UserResponse,
  UserUpdateRequest,
  TenantRequest,
  TenantResponse,
  PropertyRequest,
  PropertyResponse,
  ContractRequest,
  ContractResponse,
  ContractTerminateRequest,
  ContractListParams,
  IncrementMethod,
  ContractStatus,
  PaymentResponse,
  PaymentStatus,
  TenantSessionRequest,
  ActiveContractSummary,
  Currency,
  DepositType,
  CommissionPayer,
  PropertyCategory,
  InvoiceResponse,
  InvoiceStatus,
  InvoiceListParams,
  PreInvoiceResponse,
  PreInvoiceListParams,
  ReminderSettingsResponse,
  ReminderSettingsRequest,
  RentIncrementResponse,
  TenantAccessResponse,
  PaymentRejectionRequest,
} from "@/lib/backend-types";
