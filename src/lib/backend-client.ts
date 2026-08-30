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
  PaymentAmountUpdateRequest,
  PaymentStatusUpdateRequest,
  PaymentListParams,
  TenantSessionRequest,
  InvoiceStatus,
  AdjustmentKind,
  AdjustmentValueType,
  AdjustmentResponse,
  InvoiceResponse,
  InvoiceAdjustmentRequest,
  SchemaChangeRequest,
  InvoiceListParams,
} from "@/lib/backend-types";

function buildQuery(params: object): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, number] => entry[1] !== undefined
  );
  if (entries.length === 0) return "";
  const search = new URLSearchParams();
  for (const [key, value] of entries) search.set(key, String(value));
  return `?${search.toString()}`;
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
  },

  tenants: {
    list: (): Promise<TenantResponse[]> => apiGet<TenantResponse[]>("/tenants"),
    create: (body: TenantRequest): Promise<TenantResponse> =>
      apiPost<TenantResponse>("/tenants", body),
    get: (id: number): Promise<TenantResponse> =>
      apiGet<TenantResponse>(`/tenants/${id}`),
    update: (id: number, body: TenantRequest): Promise<TenantResponse> =>
      apiPut<TenantResponse>(`/tenants/${id}`, body),
    remove: (id: number): Promise<void> => apiDelete(`/tenants/${id}`),
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
    attachDocument: (id: number, file: File): Promise<ContractResponse> => {
      const form = new FormData();
      form.append("file", file);
      return apiPostForm<ContractResponse>(`/contracts/${id}/document`, form);
    },
    getDocument: (id: number): Promise<Blob> => apiGetBlob(`/contracts/${id}/document`),
    removeDocument: (id: number): Promise<void> => apiDelete(`/contracts/${id}/document`),
    resendTenantAccess: (id: number): Promise<void> =>
      apiPost(`/contracts/${id}/tenant-access/resend`, undefined),
  },

  payments: {
    list: (params?: PaymentListParams): Promise<PaymentResponse[]> =>
      apiGet<PaymentResponse[]>(`/payments${buildQuery(params ?? {})}`),
    updateAmount: (id: number, body: PaymentAmountUpdateRequest): Promise<PaymentResponse> =>
      apiPut<PaymentResponse>(`/payments/${id}`, body),
    updateStatus: (id: number, body: PaymentStatusUpdateRequest): Promise<PaymentResponse> =>
      apiPost<PaymentResponse>(`/payments/${id}/status`, body),
    attachReceipt: (id: number, file: File): Promise<PaymentResponse> => {
      const form = new FormData();
      form.append("file", file);
      return apiPostForm<PaymentResponse>(`/payments/${id}/receipt`, form);
    },
    getReceipt: (id: number): Promise<Blob> => apiGetBlob(`/payments/${id}/receipt`),
    removeReceipt: (id: number): Promise<void> => apiDelete(`/payments/${id}/receipt`),
    confirmReceipt: (id: number): Promise<PaymentResponse> =>
      apiPost<PaymentResponse>(`/payments/${id}/confirm`, undefined),
    rejectReceipt: (id: number): Promise<PaymentResponse> =>
      apiPost<PaymentResponse>(`/payments/${id}/reject`, undefined),
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
      apiPost<InvoiceResponse>(`/invoices/${id}/confirm`, undefined),
    schemaChange: (id: number, body: SchemaChangeRequest): Promise<ContractResponse> =>
      apiPost<ContractResponse>(`/invoices/${id}/schema-change`, body),
  },

  tenantAuth: {
    session: (body: TenantSessionRequest): Promise<void> =>
      apiPost("/tenant-auth/session", body, { retry: false }),
  },

  tenantPortal: {
    payments: {
      list: (): Promise<PaymentResponse[]> =>
        apiGet<PaymentResponse[]>("/tenant/payments", { retry: false }),
      attachReceipt: (id: number, file: File): Promise<PaymentResponse> => {
        const form = new FormData();
        form.append("file", file);
        return apiPostForm<PaymentResponse>(`/tenant/payments/${id}/receipt`, form, {
          retry: false,
        });
      },
      getReceipt: (id: number): Promise<Blob> =>
        apiGetBlob(`/tenant/payments/${id}/receipt`, { retry: false }),
    },
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
  PaymentAmountUpdateRequest,
  PaymentStatusUpdateRequest,
  PaymentListParams,
  PaymentStatus,
  TenantSessionRequest,
} from "@/lib/backend-types";
