vi.mock("@/lib/api", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPostForm: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  apiGetBlob: vi.fn(),
}));

import { apiGet, apiPost, apiPostForm, apiPut, apiDelete, apiGetBlob } from "@/lib/api";
import { AlquiaBackendClient } from "@/lib/backend-client";

const mockGet = vi.mocked(apiGet);
const mockPost = vi.mocked(apiPost);
const mockPostForm = vi.mocked(apiPostForm);
const mockPut = vi.mocked(apiPut);
const mockDelete = vi.mocked(apiDelete);
const mockGetBlob = vi.mocked(apiGetBlob);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("AlquiaBackendClient.auth", () => {
  it("login pega a POST /auth/login sin reintento", async () => {
    await AlquiaBackendClient.auth.login({ email: "a@a.com", password: "123456" });
    expect(mockPost).toHaveBeenCalledWith(
      "/auth/login",
      { email: "a@a.com", password: "123456" },
      { retry: false }
    );
  });

  it("logout pega a POST /auth/logout sin body ni reintento", async () => {
    await AlquiaBackendClient.auth.logout();
    expect(mockPost).toHaveBeenCalledWith("/auth/logout", undefined, { retry: false });
  });

  it("refresh pega a POST /auth/refresh sin body ni reintento", async () => {
    await AlquiaBackendClient.auth.refresh();
    expect(mockPost).toHaveBeenCalledWith("/auth/refresh", undefined, { retry: false });
  });

  it("me pega a GET /auth/me reenviando las options tal cual", async () => {
    await AlquiaBackendClient.auth.me({ retry: false });
    expect(mockGet).toHaveBeenCalledWith("/auth/me", { retry: false });
  });

  it("me pega a GET /auth/me sin options cuando no se pasan", async () => {
    await AlquiaBackendClient.auth.me();
    expect(mockGet).toHaveBeenCalledWith("/auth/me", undefined);
  });

  it("register pega a POST /auth/register sin reintento", async () => {
    const body = {
      email: "a@a.com",
      password: "123456",
      firstName: "A",
      lastName: "B",
      taxId: "20345678901",
      phoneNumber: "1144552210",
    };
    await AlquiaBackendClient.auth.register(body);
    expect(mockPost).toHaveBeenCalledWith("/auth/register", body, { retry: false });
  });

  it("forgotPassword pega a POST /auth/forgot-password sin reintento", async () => {
    await AlquiaBackendClient.auth.forgotPassword({ email: "a@a.com" });
    expect(mockPost).toHaveBeenCalledWith(
      "/auth/forgot-password",
      { email: "a@a.com" },
      { retry: false }
    );
  });

  it("resetPassword pega a POST /auth/reset-password sin reintento", async () => {
    await AlquiaBackendClient.auth.resetPassword({ token: "t", newPassword: "123456" });
    expect(mockPost).toHaveBeenCalledWith(
      "/auth/reset-password",
      { token: "t", newPassword: "123456" },
      { retry: false }
    );
  });
});

describe("AlquiaBackendClient.users", () => {
  it("getMe pega a GET /users/me", async () => {
    await AlquiaBackendClient.users.getMe();
    // getMe reenvía options siempre, así que sin options apiGet recibe undefined
    // como segundo argumento, no un solo argumento.
    expect(mockGet).toHaveBeenCalledWith("/users/me", undefined);
  });

  it("updateMe pega a PUT /users/me", async () => {
    // UserUpdateRequest es un reemplazo total: los cuatro campos son @NotBlank.
    const body = { firstName: "A", lastName: "B", taxId: "20345678901", phoneNumber: "1144552210" };
    await AlquiaBackendClient.users.updateMe(body);
    expect(mockPut).toHaveBeenCalledWith("/users/me", body);
  });

  it("deleteMe pega a DELETE /users/me", async () => {
    await AlquiaBackendClient.users.deleteMe();
    expect(mockDelete).toHaveBeenCalledWith("/users/me");
  });
});

describe("AlquiaBackendClient.tenants", () => {
  it("list pega a GET /tenants", async () => {
    await AlquiaBackendClient.tenants.list();
    expect(mockGet).toHaveBeenCalledWith("/tenants");
  });

  it("create pega a POST /tenants", async () => {
    const body = { firstName: "A", lastName: "B", taxId: "1", email: "a@a.com", phoneNumber: "1144552210" };
    await AlquiaBackendClient.tenants.create(body);
    expect(mockPost).toHaveBeenCalledWith("/tenants", body);
  });

  it("get pega a GET /tenants/{id}", async () => {
    await AlquiaBackendClient.tenants.get(7);
    expect(mockGet).toHaveBeenCalledWith("/tenants/7");
  });

  it("update pega a PUT /tenants/{id}", async () => {
    const body = { firstName: "A", lastName: "B", taxId: "1", email: "a@a.com", phoneNumber: "1144552210" };
    await AlquiaBackendClient.tenants.update(7, body);
    expect(mockPut).toHaveBeenCalledWith("/tenants/7", body);
  });

  it("remove pega a DELETE /tenants/{id}", async () => {
    await AlquiaBackendClient.tenants.remove(7);
    expect(mockDelete).toHaveBeenCalledWith("/tenants/7");
  });
});

describe("AlquiaBackendClient.properties", () => {
  it("list pega a GET /properties", async () => {
    await AlquiaBackendClient.properties.list();
    expect(mockGet).toHaveBeenCalledWith("/properties");
  });

  it("create pega a POST /properties", async () => {
    const body = { street: "Main", number: "123", city: "CABA", province: "BA", category: "APARTMENT" as const };
    await AlquiaBackendClient.properties.create(body);
    expect(mockPost).toHaveBeenCalledWith("/properties", body);
  });

  it("get pega a GET /properties/{id}", async () => {
    await AlquiaBackendClient.properties.get(3);
    expect(mockGet).toHaveBeenCalledWith("/properties/3");
  });

  it("update pega a PUT /properties/{id}", async () => {
    const body = { street: "Main", number: "123", city: "CABA", province: "BA", category: "APARTMENT" as const };
    await AlquiaBackendClient.properties.update(3, body);
    expect(mockPut).toHaveBeenCalledWith("/properties/3", body);
  });

  it("remove pega a DELETE /properties/{id}", async () => {
    await AlquiaBackendClient.properties.remove(3);
    expect(mockDelete).toHaveBeenCalledWith("/properties/3");
  });
});

describe("AlquiaBackendClient.contracts", () => {
  it("list sin params pega a GET /contracts", async () => {
    await AlquiaBackendClient.contracts.list();
    expect(mockGet).toHaveBeenCalledWith("/contracts");
  });

  it("list con un param arma la query string", async () => {
    await AlquiaBackendClient.contracts.list({ propertyId: 5 });
    expect(mockGet).toHaveBeenCalledWith("/contracts?propertyId=5");
  });

  it("list con dos params arma la query string completa", async () => {
    await AlquiaBackendClient.contracts.list({ propertyId: 5, tenantId: 9 });
    expect(mockGet).toHaveBeenCalledWith("/contracts?propertyId=5&tenantId=9");
  });

  it("create pega a POST /contracts", async () => {
    const body = {
      propertyId: 1,
      tenantId: 2,
      initialRentAmount: 1000,
      startDate: "2026-01-01",
      termMonths: 36,
      dueDay: 1,
      incrementMethod: "FIXED_PERCENTAGE" as const,
      incrementFrequencyMonths: 3,
    };
    await AlquiaBackendClient.contracts.create(body);
    expect(mockPost).toHaveBeenCalledWith("/contracts", body);
  });

  it("get pega a GET /contracts/{id}", async () => {
    await AlquiaBackendClient.contracts.get(4);
    expect(mockGet).toHaveBeenCalledWith("/contracts/4");
  });

  it("update pega a PUT /contracts/{id}", async () => {
    const body = {
      propertyId: 1,
      tenantId: 2,
      initialRentAmount: 1000,
      startDate: "2026-01-01",
      termMonths: 36,
      dueDay: 1,
      incrementMethod: "FIXED_PERCENTAGE" as const,
      incrementFrequencyMonths: 3,
    };
    await AlquiaBackendClient.contracts.update(4, body);
    expect(mockPut).toHaveBeenCalledWith("/contracts/4", body);
  });

  it("terminate pega a POST /contracts/{id}/terminate", async () => {
    await AlquiaBackendClient.contracts.terminate(4, { terminationDate: "2026-06-01" });
    expect(mockPost).toHaveBeenCalledWith("/contracts/4/terminate", {
      terminationDate: "2026-06-01",
    });
  });

  it("attachDocument pega a POST /contracts/{id}/document con un FormData con el archivo", async () => {
    const file = new File(["contenido"], "contrato.pdf", { type: "application/pdf" });
    await AlquiaBackendClient.contracts.attachDocument(4, file);
    expect(mockPostForm).toHaveBeenCalledTimes(1);
    const [path, formData] = mockPostForm.mock.calls[0];
    expect(path).toBe("/contracts/4/document");
    expect(formData).toBeInstanceOf(FormData);
    expect((formData as FormData).get("file")).toBe(file);
  });

  it("getDocument pega a GET /contracts/{id}/document", async () => {
    await AlquiaBackendClient.contracts.getDocument(4);
    expect(mockGetBlob).toHaveBeenCalledWith("/contracts/4/document");
  });

  it("removeDocument pega a DELETE /contracts/{id}/document", async () => {
    await AlquiaBackendClient.contracts.removeDocument(4);
    expect(mockDelete).toHaveBeenCalledWith("/contracts/4/document");
  });

  it("resendTenantAccess pega a POST /contracts/{id}/tenant-access/resend sin body", async () => {
    await AlquiaBackendClient.contracts.resendTenantAccess(4);
    expect(mockPost).toHaveBeenCalledWith("/contracts/4/tenant-access/resend");
  });
});

describe("AlquiaBackendClient.payments", () => {
  it("list exige el invoiceId y lo manda como query", async () => {
    await AlquiaBackendClient.payments.list(7);
    expect(mockGet).toHaveBeenCalledWith("/payments?invoiceId=7");
  });

  it("create pega a POST /payments?invoiceId con un FormData con el archivo", async () => {
    const file = new File(["contenido"], "recibo.pdf", { type: "application/pdf" });
    await AlquiaBackendClient.payments.create(7, file);
    expect(mockPostForm).toHaveBeenCalledTimes(1);
    const [path, formData] = mockPostForm.mock.calls[0];
    expect(path).toBe("/payments?invoiceId=7");
    expect(formData).toBeInstanceOf(FormData);
    expect((formData as FormData).get("file")).toBe(file);
  });

  it("getReceipt pega a GET /payments/{id}/receipt", async () => {
    await AlquiaBackendClient.payments.getReceipt(7);
    expect(mockGetBlob).toHaveBeenCalledWith("/payments/7/receipt");
  });

  it("getReceipt con download pide el adjunto en vez de mostrarlo", async () => {
    await AlquiaBackendClient.payments.getReceipt(7, { download: true });
    expect(mockGetBlob).toHaveBeenCalledWith("/payments/7/receipt?download=true");
  });

  it("confirm pega a POST /payments/{id}/confirm sin body", async () => {
    await AlquiaBackendClient.payments.confirm(7);
    expect(mockPost).toHaveBeenCalledWith("/payments/7/confirm");
  });

  it("reject pega a POST /payments/{id}/reject sin body", async () => {
    await AlquiaBackendClient.payments.reject(7);
    expect(mockPost).toHaveBeenCalledWith("/payments/7/reject", undefined);
  });
});

describe("AlquiaBackendClient.invoices", () => {
  it("list sin params pega a GET /invoices", async () => {
    await AlquiaBackendClient.invoices.list();
    expect(mockGet).toHaveBeenCalledWith("/invoices");
  });

  it("list con un param arma la query string", async () => {
    await AlquiaBackendClient.invoices.list({ contractId: 5 });
    expect(mockGet).toHaveBeenCalledWith("/invoices?contractId=5");
  });

  it("list con dos params arma la query string completa", async () => {
    await AlquiaBackendClient.invoices.list({ contractId: 5, tenantId: 9 });
    expect(mockGet).toHaveBeenCalledWith("/invoices?contractId=5&tenantId=9");
  });

  it("get pega a GET /invoices/{id}", async () => {
    await AlquiaBackendClient.invoices.get(4);
    expect(mockGet).toHaveBeenCalledWith("/invoices/4");
  });

  it("addAdjustment pega a POST /invoices/{id}/adjustments", async () => {
    const body = {
      name: "Descuento buena fe",
      kind: "DISCOUNT" as const,
      valueType: "FIXED_AMOUNT" as const,
      value: 500,
    };
    await AlquiaBackendClient.invoices.addAdjustment(4, body);
    expect(mockPost).toHaveBeenCalledWith("/invoices/4/adjustments", body);
  });

  it("editAdjustment pega a PUT /invoices/{id}/adjustments/{adjustmentId}", async () => {
    const body = {
      name: "Descuento buena fe",
      kind: "DISCOUNT" as const,
      valueType: "FIXED_AMOUNT" as const,
      value: 700,
    };
    await AlquiaBackendClient.invoices.editAdjustment(4, 11, body);
    expect(mockPut).toHaveBeenCalledWith("/invoices/4/adjustments/11", body);
  });

  it("removeAdjustment pega a DELETE /invoices/{id}/adjustments/{adjustmentId}", async () => {
    await AlquiaBackendClient.invoices.removeAdjustment(4, 11);
    expect(mockDelete).toHaveBeenCalledWith("/invoices/4/adjustments/11");
  });

  it("confirm pega a POST /invoices/{id}/confirm sin body", async () => {
    await AlquiaBackendClient.invoices.confirm(4);
    expect(mockPost).toHaveBeenCalledWith("/invoices/4/confirm");
  });

  it("schemaChange pega a POST /invoices/{id}/schema-change", async () => {
    const body = {
      rentBaseline: 100000,
      dueDay: 1,
      incrementMethod: "FIXED_PERCENTAGE" as const,
      incrementFrequencyMonths: 3,
    };
    await AlquiaBackendClient.invoices.schemaChange(4, body);
    expect(mockPost).toHaveBeenCalledWith("/invoices/4/schema-change", body);
  });
});

describe("AlquiaBackendClient.contracts.scheduleSchemaChange", () => {
  it("pega a POST /contracts/{id}/schema-change, sin reintento", async () => {
    const body = {
      effectiveFrom: "2026-10-01",
      rentBaseline: 700000,
      dueDay: 5,
      incrementMethod: "FIXED_PERCENTAGE" as const,
      incrementFrequencyMonths: 6,
      incrementValue: 10,
    };
    await AlquiaBackendClient.contracts.scheduleSchemaChange(4, body);
    expect(mockPost).toHaveBeenCalledWith("/contracts/4/schema-change", body, { retry: false });
  });
});

describe("AlquiaBackendClient.tenantAuth", () => {
  it("session pega a POST /tenant-auth/session sin reintento", async () => {
    await AlquiaBackendClient.tenantAuth.session({ token: "abc" });
    expect(mockPost).toHaveBeenCalledWith(
      "/tenant-auth/session",
      { token: "abc" },
      { retry: false }
    );
  });
});

describe("AlquiaBackendClient.tenantPortal", () => {
  it("invoices pega a GET /tenant/invoices sin reintento", async () => {
    await AlquiaBackendClient.tenantPortal.invoices();
    expect(mockGet).toHaveBeenCalledWith("/tenant/invoices", { retry: false });
  });

  it("createPayment pega a POST /tenant/payments?invoiceId con el archivo", async () => {
    const file = new File(["x"], "recibo.jpg", { type: "image/jpeg" });
    await AlquiaBackendClient.tenantPortal.createPayment(7, file);
    const [path, formData, options] = mockPostForm.mock.calls[0];
    expect(path).toBe("/tenant/payments?invoiceId=7");
    expect((formData as FormData).get("file")).toBe(file);
    expect(options).toEqual({ retry: false });
  });

  it("getReceipt pega a GET /tenant/payments/{id}/receipt sin reintento", async () => {
    await AlquiaBackendClient.tenantPortal.getReceipt(7);
    expect(mockGetBlob).toHaveBeenCalledWith("/tenant/payments/7/receipt", { retry: false });
  });
});

// --- Lo que llegó con la rama codex/frontend-integration-lots ---

describe("filtros de listado", () => {
  it("repite el parámetro por cada estado, que es como Spring lee una List", async () => {
    await AlquiaBackendClient.invoices.list({ status: ["DUE", "PAID"] });
    expect(mockGet).toHaveBeenCalledWith("/invoices?status=DUE&status=PAID");
  });

  it("omite un array vacío en vez de mandarlo: el backend lo rechaza con 400", async () => {
    await AlquiaBackendClient.invoices.list({ status: [] });
    expect(mockGet).toHaveBeenCalledWith("/invoices");
  });

  it("acota por período y por contrato a la vez", async () => {
    await AlquiaBackendClient.invoices.list({ contractId: 7, period: "2026-08-01" });
    expect(mockGet).toHaveBeenCalledWith("/invoices?contractId=7&period=2026-08-01");
  });

  it("manda el rango de períodos", async () => {
    await AlquiaBackendClient.invoices.list({ periodFrom: "2026-01-01", periodTo: "2026-08-01" });
    expect(mockGet).toHaveBeenCalledWith("/invoices?periodFrom=2026-01-01&periodTo=2026-08-01");
  });

  it("sin filtros no arma query string", async () => {
    await AlquiaBackendClient.invoices.list();
    expect(mockGet).toHaveBeenCalledWith("/invoices");
  });
});

describe("AlquiaBackendClient.preInvoices", () => {
  it("lista las proyecciones acotadas por contrato y período", async () => {
    await AlquiaBackendClient.preInvoices.list({ contractId: 3, periodFrom: "2026-09-01" });
    expect(mockGet).toHaveBeenCalledWith("/pre-invoices?contractId=3&periodFrom=2026-09-01");
  });
});

describe("archivado", () => {
  it("archiva una propiedad sin body", async () => {
    await AlquiaBackendClient.properties.archive(5);
    expect(mockPost).toHaveBeenCalledWith("/properties/5/archive");
  });

  it("restaura una propiedad", async () => {
    await AlquiaBackendClient.properties.restore(5);
    expect(mockPost).toHaveBeenCalledWith("/properties/5/restore");
  });

  it("lista las propiedades archivadas aparte de las vigentes", async () => {
    await AlquiaBackendClient.properties.listArchived();
    expect(mockGet).toHaveBeenCalledWith("/properties/archived");
  });

  it("archiva y restaura inquilinos igual que propiedades", async () => {
    await AlquiaBackendClient.tenants.archive(9);
    await AlquiaBackendClient.tenants.restore(9);
    expect(mockPost).toHaveBeenNthCalledWith(1, "/tenants/9/archive");
    expect(mockPost).toHaveBeenNthCalledWith(2, "/tenants/9/restore");
  });
});

describe("contrato · enlace del inquilino e historial", () => {
  it("pide el enlace sin reenviar el mail", async () => {
    await AlquiaBackendClient.contracts.getTenantAccess(12);
    expect(mockGet).toHaveBeenCalledWith("/contracts/12/tenant-access");
  });

  it("reenviar el mail sigue siendo otra cosa", async () => {
    await AlquiaBackendClient.contracts.resendTenantAccess(12);
    expect(mockPost).toHaveBeenCalledWith("/contracts/12/tenant-access/resend");
  });

  it("trae el historial de aumentos", async () => {
    await AlquiaBackendClient.contracts.rentIncrements(12);
    expect(mockGet).toHaveBeenCalledWith("/contracts/12/rent-increments");
  });
});

describe("rechazo de pago con motivo", () => {
  it("manda el motivo cuando el propietario lo escribió", async () => {
    await AlquiaBackendClient.payments.reject(4, { reason: "El comprobante es de otro mes" });
    expect(mockPost).toHaveBeenCalledWith("/payments/4/reject", {
      reason: "El comprobante es de otro mes",
    });
  });

  it("el motivo es opcional: sin él va sin body", async () => {
    await AlquiaBackendClient.payments.reject(4);
    expect(mockPost).toHaveBeenCalledWith("/payments/4/reject", undefined);
  });
});

describe("recordatorios", () => {
  it("lee la configuración", async () => {
    await AlquiaBackendClient.users.getReminderSettings();
    expect(mockGet).toHaveBeenCalledWith("/users/me/reminder-settings");
  });

  it("la escribe entera", async () => {
    const ajustes = {
      daysBeforeDue: 7,
      dueDateReminderEnabled: true,
      daysAfterDue: 3,
      enabled: true,
    };
    await AlquiaBackendClient.users.updateReminderSettings(ajustes);
    expect(mockPut).toHaveBeenCalledWith("/users/me/reminder-settings", ajustes);
  });
});
