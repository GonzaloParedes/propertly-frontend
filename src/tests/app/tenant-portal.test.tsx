import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TenantPortalPage from "@/app/tenant-portal/page";
import { ApiError } from "@/lib/api";
import type { InvoiceResponse } from "@/lib/backend-types";

// El mock global de setup.tsx devuelve siempre un URLSearchParams vacío; acá
// hace falta controlar el token de la URL, así que se pisa por archivo.
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/tenant-portal",
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenantAuth: { session: vi.fn() },
    tenantPortal: { invoices: vi.fn(), createPayment: vi.fn(), getReceipt: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockSession = vi.mocked(AlquiaBackendClient.tenantAuth.session);
const mockInvoices = vi.mocked(AlquiaBackendClient.tenantPortal.invoices);
const mockCrearPago = vi.mocked(AlquiaBackendClient.tenantPortal.createPayment);
const mockRecibo = vi.mocked(AlquiaBackendClient.tenantPortal.getReceipt);

function cuota(over: Partial<InvoiceResponse> = {}): InvoiceResponse {
  return {
    id: 1000,
    contractId: 100,
    period: "2026-09-01",
    dueDate: "2026-09-10",
    baseAmount: 478691,
    total: 478691,
    status: "PENDING",
    confirmed: true,
    adjustments: [],
    payments: [],
    ...over,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  searchParams = new URLSearchParams();
  mockInvoices.mockResolvedValue([]);
  // jsdom no implementa createObjectURL; se stubea igual que cualquier API del
  // navegador que la suite necesita y jsdom no trae.
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:mock"),
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal("open", vi.fn());
});

// --- Canje del token y sesión ---

describe("canje del token", () => {
  it("con token en la URL, lo canjea antes de pedir las cuotas", async () => {
    searchParams = new URLSearchParams("token=abc123");
    mockSession.mockResolvedValueOnce(undefined);
    render(<TenantPortalPage />);

    await waitFor(() => expect(mockSession).toHaveBeenCalledWith({ token: "abc123" }));
    expect(mockInvoices).toHaveBeenCalled();
  });

  it("sin token en la URL, va directo a pedir las cuotas", async () => {
    render(<TenantPortalPage />);

    await waitFor(() => expect(mockInvoices).toHaveBeenCalled());
    expect(mockSession).not.toHaveBeenCalled();
  });

  it("token inválido: no llega a pedir las cuotas y avisa que el enlace no funciona", async () => {
    searchParams = new URLSearchParams("token=roto");
    mockSession.mockRejectedValueOnce(new ApiError(401, "Invalid or expired access link"));
    render(<TenantPortalPage />);

    expect(await screen.findByText("Este enlace no funciona")).toBeInTheDocument();
    expect(mockInvoices).not.toHaveBeenCalled();
  });

  it("sin sesión y sin token, el mismo mensaje genérico", async () => {
    mockInvoices.mockRejectedValueOnce(new ApiError(401, "Invalid or expired access link"));
    render(<TenantPortalPage />);

    expect(await screen.findByText("Este enlace no funciona")).toBeInTheDocument();
  });

  it("mientras se resuelve, muestra que está cargando", () => {
    mockInvoices.mockReturnValue(new Promise(() => {}));
    render(<TenantPortalPage />);

    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });
});

// --- Listado ---

describe("listado de cuotas", () => {
  it("muestra período, vencimiento, monto y estado", async () => {
    mockInvoices.mockResolvedValueOnce([cuota({ status: "DUE" })]);
    render(<TenantPortalPage />);

    expect(await screen.findByText("septiembre 2026")).toBeInTheDocument();
    expect(screen.getByText("Vence el 10/09/2026")).toBeInTheDocument();
    expect(screen.getByText("$ 478.691")).toBeInTheDocument();
    expect(screen.getByText("Vencida")).toBeInTheDocument();
  });

  it("sin cuotas todavía, lo dice en vez de una lista vacía", async () => {
    render(<TenantPortalPage />);
    expect(await screen.findByText("Todavía no tiene cuotas generadas.")).toBeInTheDocument();
  });

  it("si la carga falla, avisa y no da a entender que no hay cuotas", async () => {
    mockInvoices.mockRejectedValueOnce(new ApiError(500, "Boom"));
    render(<TenantPortalPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar sus cuotas");
    expect(screen.queryByText("Todavía no tiene cuotas generadas.")).not.toBeInTheDocument();
  });

  it("pone las vencidas antes que las pagadas", async () => {
    mockInvoices.mockResolvedValueOnce([
      cuota({ id: 1, period: "2026-08-01", status: "PAID", payments: [{ id: 1, invoiceId: 1, status: "CONFIRMED", submittedByTenant: false }] }),
      cuota({ id: 2, period: "2026-09-01", status: "DUE" }),
    ]);
    render(<TenantPortalPage />);

    const items = await screen.findAllByRole("listitem");
    expect(within(items[0]).getByText("Vencida")).toBeInTheDocument();
    expect(within(items[1]).getByText("Pagada")).toBeInTheDocument();
  });
});

// --- Cuota sin confirmar ---

describe("cuota sin confirmar", () => {
  it("muestra el importe con la aclaración de que puede cambiar", async () => {
    mockInvoices.mockResolvedValueOnce([cuota({ confirmed: false })]);
    render(<TenantPortalPage />);

    expect(await screen.findByText("$ 478.691")).toBeInTheDocument();
    expect(
      screen.getByText("El propietario todavía no cerró este importe: puede cambiar.")
    ).toBeInTheDocument();
  });

  it("no ofrece subir comprobante", async () => {
    mockInvoices.mockResolvedValueOnce([cuota({ confirmed: false })]);
    render(<TenantPortalPage />);

    await screen.findByText("$ 478.691");
    expect(screen.queryByRole("button", { name: /Subir comprobante/ })).not.toBeInTheDocument();
  });
});

// --- Subir comprobante ---

describe("subir comprobante", () => {
  it("sube el archivo y refleja el estado sin recargar", async () => {
    mockInvoices
      .mockResolvedValueOnce([cuota()])
      .mockResolvedValueOnce([
        cuota({
          payments: [{ id: 5, invoiceId: 1000, status: "AWAITING_CONFIRMATION", submittedByTenant: true }],
        }),
      ]);
    mockCrearPago.mockResolvedValueOnce({
      id: 5,
      invoiceId: 1000,
      status: "AWAITING_CONFIRMATION",
      submittedByTenant: true,
    });
    render(<TenantPortalPage />);

    const archivo = new File(["comprobante"], "recibo.jpg", { type: "image/jpeg" });
    const input = await screen.findByLabelText(/Subir comprobante de/);
    await userEvent.upload(input, archivo);

    await waitFor(() => expect(mockCrearPago).toHaveBeenCalledWith(1000, archivo));
    expect(
      await screen.findByText("Comprobante esperando confirmación del propietario")
    ).toBeInTheDocument();
  });

  it("no ofrece subir si ya hay un pago esperando confirmación", async () => {
    mockInvoices.mockResolvedValueOnce([
      cuota({ payments: [{ id: 5, invoiceId: 1000, status: "AWAITING_CONFIRMATION", submittedByTenant: true }] }),
    ]);
    render(<TenantPortalPage />);

    await screen.findByText("Comprobante esperando confirmación del propietario");
    expect(screen.queryByRole("button", { name: /Subir comprobante/ })).not.toBeInTheDocument();
  });

  it("tras un rechazo, muestra el motivo y vuelve a ofrecer subir", async () => {
    mockInvoices.mockResolvedValueOnce([
      cuota({
        payments: [
          {
            id: 5,
            invoiceId: 1000,
            status: "REJECTED",
            submittedByTenant: true,
            rejectionReason: "El comprobante no corresponde a este período",
          },
        ],
      }),
    ]);
    render(<TenantPortalPage />);

    expect(
      await screen.findByText(/El propietario rechazó este comprobante/)
    ).toHaveTextContent("El comprobante no corresponde a este período");
    expect(screen.getByRole("button", { name: /Subir comprobante/ })).toBeInTheDocument();
  });

  it("un rechazo sin motivo no inventa uno", async () => {
    mockInvoices.mockResolvedValueOnce([
      cuota({ payments: [{ id: 5, invoiceId: 1000, status: "REJECTED", submittedByTenant: true }] }),
    ]);
    render(<TenantPortalPage />);

    const mensaje = await screen.findByText("El propietario rechazó este comprobante");
    expect(mensaje.textContent).toBe("El propietario rechazó este comprobante");
  });

  it("un ajuste muestra el motivo que cargó el propietario junto al monto", async () => {
    mockInvoices.mockResolvedValueOnce([
      cuota({
        baseAmount: 478691,
        total: 480022,
        adjustments: [
          { id: 7, name: "Reparación del calefón", kind: "SURCHARGE", valueType: "FIXED_AMOUNT", value: 1331 },
        ],
      }),
    ]);
    render(<TenantPortalPage />);

    const desglose = await screen.findByLabelText(/Detalle del importe/);
    const linea = within(desglose).getByText("Reparación del calefón").closest("div")!;
    expect(linea).toHaveTextContent(/\+\s*\$\s*1\.331/);
    expect(within(desglose).getByText("Importe del contrato")).toBeInTheDocument();
  });

  it("sin ajustes no muestra desglose", async () => {
    mockInvoices.mockResolvedValueOnce([cuota()]);
    render(<TenantPortalPage />);

    await screen.findByText("Sus cuotas");
    expect(screen.queryByLabelText(/Detalle del importe/)).not.toBeInTheDocument();
  });

  it("si la subida falla, avisa y conserva el estado anterior", async () => {
    mockInvoices.mockResolvedValueOnce([cuota()]);
    mockCrearPago.mockRejectedValueOnce(new ApiError(400, "Boom"));
    render(<TenantPortalPage />);

    const archivo = new File(["comprobante"], "recibo.jpg", { type: "image/jpeg" });
    const input = await screen.findByLabelText(/Subir comprobante de/);
    await userEvent.upload(input, archivo);

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos registrar el comprobante");
    expect(screen.getByRole("button", { name: /Subir comprobante/ })).toBeInTheDocument();
  });
});

// --- Ver el propio comprobante ---

describe("ver el comprobante", () => {
  it("lo pide y lo abre en una pestaña nueva", async () => {
    mockInvoices.mockResolvedValueOnce([
      cuota({ status: "PAID", payments: [{ id: 5, invoiceId: 1000, status: "CONFIRMED", submittedByTenant: true }] }),
    ]);
    const blob = new Blob(["contenido"]);
    mockRecibo.mockResolvedValueOnce(blob);
    render(<TenantPortalPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Ver comprobante" }));

    await waitFor(() => expect(mockRecibo).toHaveBeenCalledWith(5));
    expect(window.open).toHaveBeenCalledWith("blob:mock", "_blank", "noopener");
  });

  it("si falla, lo avisa", async () => {
    mockInvoices.mockResolvedValueOnce([
      cuota({ status: "PAID", payments: [{ id: 5, invoiceId: 1000, status: "CONFIRMED", submittedByTenant: true }] }),
    ]);
    mockRecibo.mockRejectedValueOnce(new ApiError(500, "Boom"));
    render(<TenantPortalPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Ver comprobante" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos abrir el comprobante");
  });
});
