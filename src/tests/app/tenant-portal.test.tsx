import { render, screen, waitFor, within } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import TenantPortalPage from "@/app/tenant-portal/page";
import { ApiError } from "@/lib/api";
import type { TenantCalendarPreInvoiceResponse, TenantCalendarResponse, TenantCalendarInvoiceResponse } from "@/lib/backend-types";

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/tenant-portal",
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenantAuth: { session: vi.fn() },
    tenantPortal: { calendar: vi.fn(), invoices: vi.fn(), createPayment: vi.fn(), getReceipt: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockSession = vi.mocked(AlquiaBackendClient.tenantAuth.session);
const mockCalendario = vi.mocked(AlquiaBackendClient.tenantPortal.calendar);
const mockCrearPago = vi.mocked(AlquiaBackendClient.tenantPortal.createPayment);
const mockRecibo = vi.mocked(AlquiaBackendClient.tenantPortal.getReceipt);

function cuota(over: Partial<TenantCalendarInvoiceResponse> = {}): TenantCalendarInvoiceResponse {
  return {
    id: 1000, contractId: 100, period: "2026-09-01", dueDate: "2026-09-10",
    baseAmount: 478691, total: 478691, status: "PENDING", confirmed: true,
    adjustments: [], payments: [], canSubmitPayment: true, ...over,
  };
}

function calendario(
  invoices: TenantCalendarInvoiceResponse[] = [],
  coverage: TenantCalendarResponse["coverage"] = [{ startDate: "2026-01-01", effectiveEndDate: "2026-12-31" }],
  preInvoices: TenantCalendarPreInvoiceResponse[] = []
): TenantCalendarResponse {
  return { tenant: { firstName: "Lucía", lastName: "Fernández" }, coverage, invoices, preInvoices };
}

async function abrirMes(nombre: string, anio: number, estado: string) {
  await userEvent.click(await screen.findByRole("button", { name: `${nombre} ${anio}: ${estado}. Ver detalle` }));
}

beforeEach(() => {
  vi.resetAllMocks();
  searchParams = new URLSearchParams();
  mockCalendario.mockResolvedValue(calendario());
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });
  vi.stubGlobal("open", vi.fn());
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 0; });
});

describe("canje del token y carga del calendario", () => {
  it("canjea el token antes de cargar el calendario", async () => {
    searchParams = new URLSearchParams("token=abc123");
    mockSession.mockResolvedValueOnce(undefined);
    render(<TenantPortalPage />);

    await waitFor(() => expect(mockSession).toHaveBeenCalledWith({ token: "abc123" }));
    expect(mockCalendario).toHaveBeenCalled();
  });

  it("sin token va directo al calendario", async () => {
    render(<TenantPortalPage />);
    await waitFor(() => expect(mockCalendario).toHaveBeenCalled());
    expect(mockSession).not.toHaveBeenCalled();
  });

  it("muestra el mensaje genérico si el enlace no tiene sesión válida", async () => {
    mockCalendario.mockRejectedValueOnce(new ApiError(401, "Invalid or expired access link"));
    render(<TenantPortalPage />);
    expect(await screen.findByRole("heading", { name: "Este enlace ya no está disponible" })).toBeInTheDocument();
    expect(screen.getByText("Pídale a su propietario que le envíe un enlace nuevo para ingresar.")).toBeInTheDocument();
  });

  it("indica la carga mientras espera el calendario", () => {
    mockCalendario.mockReturnValue(new Promise(() => {}));
    render(<TenantPortalPage />);
    expect(screen.getByText("Cargando sus cuotas…")).toBeInTheDocument();
  });

  it("permite reintentar si no puede cargar el calendario", async () => {
    mockCalendario.mockRejectedValueOnce(new ApiError(500, "Boom")).mockResolvedValueOnce(calendario());
    render(<TenantPortalPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Cuotas de 2026" })).toBeInTheDocument();
    expect(screen.getByText("Hola, Lucía Fernández")).toBeInTheDocument();
    expect(mockCalendario).toHaveBeenCalledTimes(2);
  });
});

describe("calendario anual", () => {
  it("muestra los 12 meses, el estado escrito y abre el detalle de la cuota", async () => {
    mockCalendario.mockResolvedValueOnce(calendario([cuota({ status: "DUE" })]));
    render(<TenantPortalPage />);

    expect(await screen.findByRole("heading", { name: "Cuotas de 2026" })).toBeInTheDocument();
    expect(screen.getAllByText("Sin cuota")).toHaveLength(11);
    await abrirMes("Septiembre", 2026, "Vencida");
    const detalle = screen.getByRole("region", { name: "Detalle de septiembre 2026" });
    expect(within(detalle).getByText("Vence el 10/09/2026")).toBeInTheDocument();
    expect(within(detalle).getByText("$ 478.691")).toBeInTheDocument();
    expect(within(detalle).getByRole("button", { name: "Subir comprobante" })).toBeInTheDocument();
  });

  it("distingue los meses anteriores al contrato de los meses sin cuota", async () => {
    mockCalendario.mockResolvedValueOnce(calendario([], [{ startDate: "2025-06-15", effectiveEndDate: "2025-12-31" }]));
    render(<TenantPortalPage />);

    expect(await screen.findByRole("heading", { name: "Cuotas de 2025" })).toBeInTheDocument();
    expect(screen.getAllByText("Antes del contrato")).toHaveLength(5);
    expect(screen.getAllByText("Sin cuota")).toHaveLength(7);
  });

  it("permite elegir otro año directamente desde la tira de años", async () => {
    mockCalendario.mockResolvedValueOnce(calendario([], [
      { startDate: "2025-06-15", effectiveEndDate: "2025-12-31" },
      { startDate: "2026-01-01", effectiveEndDate: "2027-05-31" },
    ]));
    render(<TenantPortalPage />);

    expect(await screen.findByRole("heading", { name: "Cuotas de 2026" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "2027" }));
    expect(screen.getByRole("heading", { name: "Cuotas de 2027" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "2025" }));
    expect(screen.getByRole("heading", { name: "Cuotas de 2025" })).toBeInTheDocument();
  });

  it("muestra una pre-cuota como importe a confirmar, sin deuda ni acciones de pago", async () => {
    mockCalendario.mockResolvedValueOnce(calendario([], undefined, [{ contractId: 100, period: "2026-09-01", amount: 478691 }]));
    render(<TenantPortalPage />);

    expect(await screen.findByText("$ 478.691")).toBeInTheDocument();
    expect(screen.getByText("Importe a confirmar")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Septiembre 2026/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Subir comprobante" })).not.toBeInTheDocument();
  });

  it("tolera la respuesta anterior mientras el backend aún no devuelve pre-cuotas", async () => {
    mockCalendario.mockResolvedValueOnce({
      coverage: [{ startDate: "2026-01-01", effectiveEndDate: "2026-12-31" }],
      invoices: [],
    } as unknown as TenantCalendarResponse);
    render(<TenantPortalPage />);

    expect(await screen.findByRole("heading", { name: "Cuotas de 2026" })).toBeInTheDocument();
  });

  it("marca el primer mes del sucesor una vez que sus condiciones están vigentes", async () => {
    mockCalendario.mockResolvedValueOnce(calendario([cuota({ period: "2025-10-01", dueDate: "2025-10-10" })], [
      { startDate: "2025-06-15", effectiveEndDate: "2025-09-30" },
      { startDate: "2025-10-01", effectiveEndDate: "2027-05-31" },
    ]));
    render(<TenantPortalPage />);

    await screen.findByRole("heading", { name: "Cuotas de 2026" });
    await userEvent.click(screen.getByRole("button", { name: "2025" }));
    expect(await screen.findByText("Cambiaron las condiciones")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Octubre 2025: A vencer. Ver detalle" })).toBeInTheDocument();
  });

  it("conserva las cuotas anteriores vencidas y usa el permiso que dio el backend", async () => {
    mockCalendario.mockResolvedValueOnce(calendario([cuota({ period: "2025-09-01", dueDate: "2025-09-10", status: "DUE", canSubmitPayment: true })], [
      { startDate: "2025-06-15", effectiveEndDate: "2025-09-30" },
      { startDate: "2025-10-01", effectiveEndDate: "2027-05-31" },
    ]));
    render(<TenantPortalPage />);

    await screen.findByRole("heading", { name: "Cuotas de 2026" });
    await userEvent.click(screen.getByRole("button", { name: "2025" }));
    await abrirMes("Septiembre", 2025, "Vencida");
    expect(screen.getByText("Esta cuota sigue pendiente aunque las condiciones hayan cambiado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Subir comprobante" })).toBeInTheDocument();
  });

  it("no presenta una cuota vencida actual como perteneciente a condiciones anteriores", async () => {
    mockCalendario.mockResolvedValueOnce(calendario([cuota({ status: "DUE" })]));
    render(<TenantPortalPage />);
    await abrirMes("Septiembre", 2026, "Vencida");
    expect(screen.queryByText("Esta cuota sigue pendiente aunque las condiciones hayan cambiado.")).not.toBeInTheDocument();
  });

  it("no ofrece subir cuando canSubmitPayment es falso", async () => {
    mockCalendario.mockResolvedValueOnce(calendario([cuota({ status: "DUE", canSubmitPayment: false })]));
    render(<TenantPortalPage />);
    await abrirMes("Septiembre", 2026, "Vencida");
    expect(screen.queryByRole("button", { name: "Subir comprobante" })).not.toBeInTheDocument();
  });

  it("muestra todas las cuotas si el backend devuelve más de una para el mes", async () => {
    mockCalendario.mockResolvedValueOnce(calendario([cuota({ id: 1, status: "PAID" }), cuota({ id: 2, status: "DUE", total: 500000 })]));
    render(<TenantPortalPage />);
    await abrirMes("Septiembre", 2026, "2 cuotas");
    const detalle = screen.getByRole("region", { name: "Detalle de septiembre 2026" });
    expect(within(detalle).getAllByText("septiembre 2026")).toHaveLength(2);
    expect(within(detalle).getByText("$ 500.000")).toBeInTheDocument();
  });

  it("devuelve el foco al mes al cerrar el detalle", async () => {
    mockCalendario.mockResolvedValueOnce(calendario([cuota()]));
    render(<TenantPortalPage />);
    const mes = await screen.findByRole("button", { name: "Septiembre 2026: A vencer. Ver detalle" });
    await userEvent.click(mes);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(mes).toHaveFocus();
  });
});

describe("acciones del detalle", () => {
  it("refresca el calendario tras subir un comprobante", async () => {
    mockCalendario
      .mockResolvedValueOnce(calendario([cuota()]))
      .mockResolvedValueOnce(calendario([cuota({ canSubmitPayment: false, payments: [{ id: 5, invoiceId: 1000, status: "AWAITING_CONFIRMATION", submittedByTenant: true }] })]));
    mockCrearPago.mockResolvedValueOnce({ id: 5, invoiceId: 1000, status: "AWAITING_CONFIRMATION", submittedByTenant: true });
    render(<TenantPortalPage />);

    await abrirMes("Septiembre", 2026, "A vencer");
    const archivo = new File(["comprobante"], "recibo.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByLabelText("Subir comprobante de septiembre 2026"), archivo);
    await waitFor(() => expect(mockCrearPago).toHaveBeenCalledWith(1000, archivo));
    expect(await screen.findByText("Comprobante esperando confirmación del propietario")).toBeInTheDocument();
    expect(await screen.findByText(/Recibimos su comprobante/)).toBeInTheDocument();
  });

  it("permite ver el comprobante propio desde el detalle", async () => {
    mockCalendario.mockResolvedValueOnce(calendario([cuota({ status: "PAID", canSubmitPayment: false, payments: [{ id: 5, invoiceId: 1000, status: "CONFIRMED", submittedByTenant: true }] })]));
    mockRecibo.mockResolvedValueOnce(new Blob(["contenido"]));
    render(<TenantPortalPage />);
    await abrirMes("Septiembre", 2026, "Pagada");
    await userEvent.click(screen.getByRole("button", { name: "Ver comprobante" }));
    await waitFor(() => expect(mockRecibo).toHaveBeenCalledWith(5));
    expect(window.open).toHaveBeenCalledWith("blob:mock", "_blank", "noopener");
  });
});
