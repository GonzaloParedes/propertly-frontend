import { apiGet, apiPost, apiPostForm, apiPut, apiPutForm, apiDelete, apiGetBlob } from "@/lib/api";
import type {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ConfirmEmailRequest,
  ResendVerificationRequest,
  UserResponse,
  UserUpdateRequest,
  TenantRequest,
  TenantResponse,
  PropertyRequest,
  PropertyResponse,
  RentEstimate,
  Currency,
  ContractRequest,
  ContractOnboardingRequest,
  ContractResponse,
  ContractTerminateRequest,
  ContractListParams,
  PaymentResponse,
  TenantSessionRequest,
  TenantCalendarResponse,
  InvoiceResponse,
  InvoiceAdjustmentRequest,
  LateFeeOverrideRequest,
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
  ContractImportResponse,
  ContractImportCompletionRequest,
  ContractImportQuotaResponse,
  ContractDraft,
  ContractDraftSummary,
  ContractDraftRequest,
  ContractDraftUpdateRequest,
  PropertyDraft,
  PropertyDraftSummary,
  PropertyDraftRequest,
  PropertyDraftUpdateRequest,
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
    confirmEmail: (body: ConfirmEmailRequest): Promise<void> =>
      apiPost("/auth/confirm-email", body, { retry: false }),
    resendVerification: (body: ResendVerificationRequest): Promise<void> =>
      apiPost("/auth/resend-verification", body, { retry: false }),
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
    create: (body: PropertyRequest, options: { draftId?: number } = {}): Promise<PropertyResponse> =>
      apiPost<PropertyResponse>(`/properties${buildQuery(options)}`, body),
    get: (id: number): Promise<PropertyResponse> =>
      apiGet<PropertyResponse>(`/properties/${id}`),
    // `currency` es obligatorio en el backend (sin default → 400). La UI la elige
    // con el toggle de la tarjeta de estimación; ARS es el default.
    getRentEstimate: (id: number, currency: Currency = "ARS"): Promise<RentEstimate> =>
      apiGet<RentEstimate>(`/properties/${id}/rent-estimate?currency=${currency}`),
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
    // Propiedad, inquilino y contrato en un solo pedido: o se crea todo, o nada.
    onboard: (body: ContractOnboardingRequest): Promise<ContractResponse> =>
      apiPost<ContractResponse>("/contracts/onboarding", body),
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

  // La lectura de un contrato firmado. El backend nunca crea nada con lo que lee: el alta pasa
  // por `contracts.onboard` y recién después se cierra con `complete`.
  contractImports: {
    quota: (): Promise<ContractImportQuotaResponse> =>
      apiGet<ContractImportQuotaResponse>("/contract-imports/quota"),
    upload: (file: File): Promise<ContractImportResponse> => {
      const form = new FormData();
      form.append("file", file);
      return apiPostForm<ContractImportResponse>("/contract-imports", form);
    },
    get: (id: number): Promise<ContractImportResponse> =>
      apiGet<ContractImportResponse>(`/contract-imports/${id}`),
    // Un reintento explícito: no vuelve a gastar una lectura.
    retry: (id: number): Promise<ContractImportResponse> =>
      apiPost<ContractImportResponse>(`/contract-imports/${id}/retry`),
    complete: (id: number, body: ContractImportCompletionRequest): Promise<ContractImportResponse> =>
      apiPost<ContractImportResponse>(`/contract-imports/${id}/complete`, body),
    // Descarta la lectura y borra el archivo: 204 sin cuerpo.
    discard: (id: number): Promise<void> => apiDelete(`/contract-imports/${id}`),
    document: (id: number): Promise<Blob> => apiGetBlob(`/contract-imports/${id}/document`),
  },

  // El contrato a medio cargar. El backend guarda el contenido sin leerlo y no crea nada: el
  // contrato se crea con `contracts.onboard` mandando el `draftId`, y ahí el borrador desaparece.
  contractDrafts: {
    list: (): Promise<ContractDraftSummary[]> =>
      apiGet<ContractDraftSummary[]>("/contract-drafts"),
    get: (id: number): Promise<ContractDraft> => apiGet<ContractDraft>(`/contract-drafts/${id}`),
    // Con `idempotencyKey` el alta se puede repetir sin duplicar: el backend contesta con el borrador
    // que ya creó (200) en vez de ocupar otro lugar. `keepalive`: el alta al cerrar la pestaña.
    create: (
      body: ContractDraftRequest,
      { idempotencyKey, keepalive }: { idempotencyKey?: string; keepalive?: boolean } = {}
    ): Promise<ContractDraft> =>
      apiPost<ContractDraft>("/contract-drafts", body, {
        ...(keepalive ? { keepalive } : {}),
        ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
      }),
    // `keepalive`: el guardado al cerrar la pestaña tiene que terminar aunque la página no.
    update: (
      id: number,
      body: ContractDraftUpdateRequest,
      options?: { keepalive?: boolean }
    ): Promise<ContractDraft> => apiPut<ContractDraft>(`/contract-drafts/${id}`, body, options),
    // Borra el borrador y su PDF: 204 sin cuerpo.
    remove: (id: number): Promise<void> => apiDelete(`/contract-drafts/${id}`),
    // Guardar, reemplazar o quitar el PDF cambia la versión del borrador: el alta devuelve el
    // resumen nuevo; quitarlo no devuelve nada y hay que volver a leer el borrador.
    attachDocument: (id: number, file: File): Promise<ContractDraftSummary> => {
      const form = new FormData();
      form.append("file", file);
      return apiPutForm<ContractDraftSummary>(`/contract-drafts/${id}/document`, form);
    },
    getDocument: (id: number): Promise<Blob> => apiGetBlob(`/contract-drafts/${id}/document`),
    removeDocument: (id: number): Promise<void> => apiDelete(`/contract-drafts/${id}/document`),
  },

  propertyDrafts: {
    list: (): Promise<PropertyDraftSummary[]> => apiGet<PropertyDraftSummary[]>("/property-drafts"),
    get: (id: number): Promise<PropertyDraft> => apiGet<PropertyDraft>(`/property-drafts/${id}`),
    create: (
      body: PropertyDraftRequest,
      { idempotencyKey, keepalive }: { idempotencyKey?: string; keepalive?: boolean } = {}
    ): Promise<PropertyDraft> =>
      apiPost<PropertyDraft>("/property-drafts", body, {
        ...(keepalive ? { keepalive } : {}),
        ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
      }),
    update: (
      id: number,
      body: PropertyDraftUpdateRequest,
      options?: { keepalive?: boolean }
    ): Promise<PropertyDraft> => apiPut<PropertyDraft>(`/property-drafts/${id}`, body, options),
    remove: (id: number): Promise<void> => apiDelete(`/property-drafts/${id}`),
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
    // Fija el recargo a mano (0 lo perdona). Tope: el recargo contractual de hoy.
    setLateFee: (id: number, body: LateFeeOverrideRequest): Promise<InvoiceResponse> =>
      apiPut<InvoiceResponse>(`/invoices/${id}/late-fee`, body),
    // Vuelve al recargo que calcula el contrato.
    clearLateFee: (id: number): Promise<InvoiceResponse> =>
      apiDelete<InvoiceResponse>(`/invoices/${id}/late-fee`),
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
    // Un calendario de toda la cadena predecesor/sucesor del enlace. El backend
    // resuelve el alcance: el cliente nunca manda ni elige un contractId.
    calendar: (): Promise<TenantCalendarResponse> =>
      apiGet<TenantCalendarResponse>("/tenant/calendar", { retry: false }),
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
  ContractImportResponse,
  ContractImportCompletionRequest,
  ContractImportQuotaResponse,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ConfirmEmailRequest,
  ResendVerificationRequest,
  UserResponse,
  UserUpdateRequest,
  TenantRequest,
  TenantResponse,
  PropertyRequest,
  PropertyResponse,
  RentEstimate,
  ComparableListing,
  ListingSource,
  ContractRequest,
  ContractOnboardingRequest,
  ContractTerms,
  PropertySelection,
  TenantSelection,
  ContractResponse,
  ContractTerminateRequest,
  ContractListParams,
  IncrementMethod,
  LateFeeMethod,
  LateFeeResponse,
  LateFeeState,
  LateFeeOverrideRequest,
  ContractStatus,
  PaymentResponse,
  PaymentStatus,
  PaymentOrigin,
  ElapsedDecision,
  TenantSessionRequest,
  TenantCalendarResponse,
  TenantCalendarCoverage,
  TenantCalendarInvoiceResponse,
  TenantCalendarPreInvoiceResponse,
  ActiveContractSummary,
  PriceConfidence,
  Currency,
  GuaranteeType,
  GuaranteeRequest,
  GuaranteeResponse,
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
