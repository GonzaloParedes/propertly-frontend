import { render, screen, waitFor, within } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";
import type { ContractResponse, InvoiceResponse, PaymentResponse } from "@/lib/backend-types";

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: 1, email: "marta@ejemplo.com", firstName: "Marta", lastName: "Gómez", taxId: "27123456780" },
    isLoading: false,
    actualizarUsuario: vi.fn(),
  }),
}));

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenants: { list: vi.fn() },
    contracts: { list: vi.fn(), get: vi.fn() },
    properties: { list: vi.fn(), archive: vi.fn() },
    invoices: { list: vi.fn(), get: vi.fn() },
    payments: { getReceipt: vi.fn() },
    contractImports: { quota: vi.fn() },
  },
}));

// El renderer del PDF pesa y no corre en jsdom: se reemplaza el módulo que se importa on demand.
const mockDescargar = vi.fn();
vi.mock("@/components/dashboard/liquidacion/LiquidacionPdf", () => ({
  descargarLiquidacion: (...args: unknown[]) => mockDescargar(...args),
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockInvoices = vi.mocked(AlquiaBackendClient.invoices.list);
const mockInvoice = vi.mocked(AlquiaBackendClient.invoices.get);
const mockContracts = vi.mocked(AlquiaBackendClient.contracts.list);
const mockContract = vi.mocked(AlquiaBackendClient.contracts.get);

const CONTRATO = {
  id: 100,
  property: { id: 10, street: "Av. Rivadavia", number: "2340", floorUnit: "5.º A", city: "CABA", province: "CABA" },
  tenant: { id: 1, firstName: "Jorge", lastName: "Paletta", taxId: "20224567899" },
  initialRentAmount: 400000, startDate: "2025-03-01", termMonths: 36, dueDay: 1,
  endDate: "2028-03-01", status: "ACTIVE", incrementMethod: "FIXED_PERCENTAGE",
} as ContractResponse;

const pago = (over: Partial<PaymentResponse> = {}): PaymentResponse => ({
  id: 500, invoiceId: 1000, status: "CONFIRMED", submittedByTenant: true, origin: "TENANT",
  hasReceipt: true, submittedAt: "2026-08-08T15:30:00Z", ...over,
});

const cuota = (over: Partial<InvoiceResponse> = {}): InvoiceResponse => ({
  id: 1000, contractId: 100, period: "2026-08-01", dueDate: "2026-08-10",
  baseAmount: 478691, total: 478691, amountDue: 478691, lateFee: null, status: "PAID", confirmed: true,
  adjustments: [], payments: [pago()], ...over,
});

function conCuotas(invoices: InvoiceResponse[]) {
  mockInvoices.mockResolvedValue(invoices);
  mockContracts.mockResolvedValue([CONTRATO]);
  render(<OwnerWorkspace initialView="cobranzas" />);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(AlquiaBackendClient.contractImports.quota).mockResolvedValue({ used: 0, limit: 5, available: true });
});

/** La liquidación vive en el menú «⋯» de la cuota, no como botón suelto. */
async function abrirMenu() {
  await userEvent.click(await screen.findByRole("button", { name: /Más acciones de Av\. Rivadavia/ }));
  return screen.getByRole("menu");
}

describe("liquidación de un pago", () => {
  it("se ofrece en el menú, y el comprobante queda como acción principal, en una cuota cobrada por el inquilino", async () => {
    conCuotas([cuota()]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByRole("button", { name: /Comprobante/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Liquidación/ })).not.toBeInTheDocument();
    expect(within(await abrirMenu()).getByRole("menuitem", { name: /Liquidación/ })).toBeEnabled();
  });

  it("se ofrece en una cuota cobrada por el propietario", async () => {
    conCuotas([cuota({ payments: [pago({ origin: "LANDLORD", submittedByTenant: false })] })]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(within(await abrirMenu()).getByRole("menuitem", { name: /Liquidación/ })).toBeInTheDocument();
  });

  it("no se ofrece en un pago del alta, que conserva su etiqueta", async () => {
    conCuotas([cuota({ payments: [pago({ origin: "ONBOARDING", hasReceipt: false })] })]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.queryByRole("menuitem", { name: /Liquidación/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Más acciones/ })).not.toBeInTheDocument();
    expect(screen.getByText("Registrado al dar de alta · sin comprobante")).toBeInTheDocument();
  });

  it("no se ofrece en una cuota vencida", async () => {
    conCuotas([cuota({ status: "DUE", payments: [] })]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.queryByRole("menuitem", { name: /Liquidación/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Más acciones/ })).not.toBeInTheDocument();
  });

  it("baja el PDF armado con la cuota y el contrato recién pedidos", async () => {
    conCuotas([cuota()]);
    mockInvoice.mockResolvedValue(cuota());
    mockContract.mockResolvedValue(CONTRATO);
    mockDescargar.mockResolvedValue(undefined);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    await userEvent.click(within(await abrirMenu()).getByRole("menuitem", { name: /Liquidación/ }));

    await waitFor(() => expect(mockDescargar).toHaveBeenCalledTimes(1));
    expect(mockInvoice).toHaveBeenCalledWith(1000);
    expect(mockContract).toHaveBeenCalledWith(100);
    expect(mockDescargar.mock.calls[0][0]).toMatchObject({
      numero: "N° 00000500",
      emisor: { nombre: "Marta Gómez", taxId: "27-12345678-0" },
      montoPagado: "$ 478.691",
      nombreArchivo: "liquidacion-2026-08-500.pdf",
    });
  });

  it("muestra el error y permite reintentar si falla la generación", async () => {
    conCuotas([cuota()]);
    mockInvoice.mockResolvedValue(cuota());
    mockContract.mockResolvedValue(CONTRATO);
    mockDescargar.mockRejectedValueOnce(new Error("boom"));
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    await userEvent.click(within(await abrirMenu()).getByRole("menuitem", { name: /Liquidación/ }));

    expect(await screen.findByText("No se pudo generar la liquidación. Vuelva a intentarlo.")).toBeInTheDocument();
    // Mientras genera, el botón «⋯» queda ocupado; al fallar vuelve a estar disponible para reintentar.
    const boton = screen.getByRole("button", { name: /Más acciones de Av\. Rivadavia/ });
    await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy"));
    expect(within(await abrirMenu()).getByRole("menuitem", { name: /Liquidación/ })).toBeEnabled();
  });

  it("muestra el error si no se puede pedir la cuota", async () => {
    conCuotas([cuota()]);
    mockInvoice.mockRejectedValue(new Error("red"));
    mockContract.mockResolvedValue(CONTRATO);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    await userEvent.click(within(await abrirMenu()).getByRole("menuitem", { name: /Liquidación/ }));

    expect(await screen.findByText("No se pudo generar la liquidación. Vuelva a intentarlo.")).toBeInTheDocument();
    expect(mockDescargar).not.toHaveBeenCalled();
  });
});
