import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";
import { ApiError } from "@/lib/api";
import type { ContractResponse, InvoiceResponse, PaymentResponse } from "@/lib/backend-types";

// OwnerWorkspace nombra la cuenta desde la sesión; estas vistas no la usan.
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenants: { list: vi.fn() },
    contracts: { list: vi.fn() },
    properties: { list: vi.fn(), archive: vi.fn() },
    invoices: { list: vi.fn(), confirm: vi.fn(), addAdjustment: vi.fn(), editAdjustment: vi.fn(), removeAdjustment: vi.fn() },
    payments: { create: vi.fn(), confirm: vi.fn(), reject: vi.fn(), getReceipt: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockInvoices = vi.mocked(AlquiaBackendClient.invoices.list);
const mockContracts = vi.mocked(AlquiaBackendClient.contracts.list);
const mockConfirmarCuota = vi.mocked(AlquiaBackendClient.invoices.confirm);
const mockCrearPago = vi.mocked(AlquiaBackendClient.payments.create);
const mockConfirmarPago = vi.mocked(AlquiaBackendClient.payments.confirm);
const mockRechazarPago = vi.mocked(AlquiaBackendClient.payments.reject);

const CONTRATO = {
  id: 100,
  property: { id: 10, street: "Av. Rivadavia", number: "2340", floorUnit: "5.º A",
    city: "CABA", province: "CABA", category: "APARTMENT" },
  tenant: { id: 1, firstName: "Jorge", lastName: "Paletta", taxId: "20224567899",
    email: "jorge@ejemplo.com", phoneNumber: "+5491144552210" },
  initialRentAmount: 400000, startDate: "2025-03-01", termMonths: 36, dueDay: 1,
  endDate: "2028-03-01", status: "ACTIVE", incrementMethod: "FIXED_PERCENTAGE",
  incrementFrequencyMonths: 3, currentRent: 478691,
} as ContractResponse;

const pago = (over: Partial<PaymentResponse> = {}): PaymentResponse => ({
  id: 500, invoiceId: 1000, status: "CONFIRMED", submittedByTenant: false, ...over,
});

const cuota = (over: Partial<InvoiceResponse> = {}): InvoiceResponse => ({
  id: 1000, contractId: 100, period: "2026-08-01", dueDate: "2026-08-10",
  baseAmount: 478691, total: 478691, status: "DUE", confirmed: true,
  adjustments: [], payments: [], ...over,
});

function conCuotas(invoices: InvoiceResponse[]) {
  mockInvoices.mockResolvedValue(invoices);
  mockContracts.mockResolvedValue([CONTRATO]);
  render(<OwnerWorkspace initialView="cobranzas" />);
}

const fila = (texto: string | RegExp) => screen.getByRole("row", { name: texto });

beforeEach(() => {
  vi.resetAllMocks();
});

// --- carga ---

describe("carga", () => {
  it("avisa que está cargando antes de tener las cuotas", () => {
    mockInvoices.mockReturnValue(new Promise(() => {}));
    mockContracts.mockReturnValue(new Promise(() => {}));
    render(<OwnerWorkspace initialView="cobranzas" />);

    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("avisa si no pudo cargarlas, en vez de mostrar una tabla vacía", async () => {
    mockInvoices.mockRejectedValue(new ApiError(500, "Boom"));
    mockContracts.mockResolvedValue([CONTRATO]);
    render(<OwnerWorkspace initialView="cobranzas" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar sus cobranzas");
  });

  it("cuando no hay cuotas explica de dónde salen", async () => {
    conCuotas([]);
    expect(await screen.findByText("Todavía no hay cuotas")).toBeInTheDocument();
  });

  it("nombra cada fila por su propiedad, inquilino y período", async () => {
    conCuotas([cuota()]);
    const propiedad = await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(propiedad).toBeInTheDocument();
    expect(screen.getByText("Jorge Paletta · agosto 2026")).toBeInTheDocument();
    expect(screen.getByText("$ 478.691")).toBeInTheDocument();
    expect(screen.getByText("10/08/2026")).toBeInTheDocument();
  });
});

// --- filtros ---

describe("filtros", () => {
  const cuatro = [
    cuota({ id: 1, status: "DUE" }),
    cuota({ id: 2, status: "PENDING" }),
    cuota({ id: 3, status: "PAID", payments: [pago()] }),
    cuota({ id: 4, status: "DUE", payments: [pago({ status: "AWAITING_CONFIRMATION" })] }),
  ];

  it("cuenta cada estado", async () => {
    conCuotas(cuatro);
    const grupo = await screen.findByRole("region", { name: "Estado de la cuota" });

    expect(within(grupo).getByRole("button", { name: /Todas/ })).toHaveTextContent("4");
    expect(within(grupo).getByRole("button", { name: /Vencidas/ })).toHaveTextContent("1");
    expect(within(grupo).getByRole("button", { name: /A vencer/ })).toHaveTextContent("2");
    expect(within(grupo).getByRole("button", { name: /Pagadas/ })).toHaveTextContent("1");
  });

  it("al filtrar deja sólo las que corresponden", async () => {
    conCuotas(cuatro);
    await userEvent.click(await screen.findByRole("button", { name: /Pagadas/ }));

    // 1 encabezado + 1 fila
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });
});

// --- acciones ---

describe("acciones", () => {
  it("una cuota sin confirmar ofrece confirmarla, no registrar el pago", async () => {
    conCuotas([cuota({ confirmed: false })]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByRole("button", { name: "Confirmar cuota" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar pago" })).not.toBeInTheDocument();
    expect(screen.getByText("Sin confirmar")).toBeInTheDocument();
  });

  it("confirmar la cuota la manda al backend y vuelve a pedir la lista", async () => {
    conCuotas([cuota({ confirmed: false })]);
    mockConfirmarCuota.mockResolvedValueOnce(cuota({ confirmed: true }));
    await userEvent.click(await screen.findByRole("button", { name: "Confirmar cuota" }));

    await waitFor(() => expect(mockConfirmarCuota).toHaveBeenCalledWith(1000));
    await waitFor(() => expect(mockInvoices).toHaveBeenCalledTimes(2));
  });

  it("una cuota pagada sólo ofrece el comprobante", async () => {
    conCuotas([cuota({ status: "PAID", payments: [pago()] })]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByRole("button", { name: /Comprobante/ })).toBeInTheDocument();
  });

  it("registrar un pago no se habilita hasta que hay comprobante", async () => {
    conCuotas([cuota()]);
    await userEvent.click(await screen.findByRole("button", { name: "Registrar pago" }));

    const guardar = within(screen.getByRole("dialog")).getByRole("button", { name: "Registrar pago" });
    expect(guardar).toBeDisabled();

    const archivo = new File(["x"], "transferencia.pdf", { type: "application/pdf" });
    await userEvent.upload(screen.getByLabelText("Comprobante del pago"), archivo);
    expect(guardar).toBeEnabled();

    mockCrearPago.mockResolvedValueOnce(pago());
    await userEvent.click(guardar);
    await waitFor(() => expect(mockCrearPago).toHaveBeenCalledWith(1000, archivo));
  });

  it("traduce el 400 de la cuota sin confirmar en vez de mostrar el texto del backend", async () => {
    conCuotas([cuota()]);
    mockCrearPago.mockRejectedValueOnce(
      new ApiError(400, "Cannot submit a payment for an unconfirmed invoice")
    );
    await userEvent.click(await screen.findByRole("button", { name: "Registrar pago" }));
    await userEvent.upload(
      screen.getByLabelText("Comprobante del pago"),
      new File(["x"], "t.pdf", { type: "application/pdf" })
    );
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Registrar pago" })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Primero hay que confirmar la cuota");
  });
});

// --- revisar el pago del inquilino ---

describe("revisar el pago que cargó el inquilino", () => {
  const conPagoPendiente = () =>
    conCuotas([
      cuota({
        payments: [
          pago({ id: 90, status: "AWAITING_CONFIRMATION", submittedByTenant: true,
            receiptFileName: "comprobante.jpg", receiptContentType: "image/jpeg",
            receiptSizeBytes: 1_887_436 }),
        ],
      }),
    ]);

  it("el comprobante esperando le gana al estado vencido", async () => {
    conPagoPendiente();
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByText("Pago a confirmar")).toBeInTheDocument();
    expect(screen.queryByText("Vencida")).not.toBeInTheDocument();
  });

  it("muestra el archivo con lo que el backend sí devuelve", async () => {
    conPagoPendiente();
    await userEvent.click(await screen.findByRole("button", { name: "Revisar pago" }));

    expect(screen.getByText("comprobante.jpg")).toBeInTheDocument();
    expect(screen.getByText("Imagen · 1,8 MB")).toBeInTheDocument();
  });

  it("confirmar resuelve el pago, no la cuota", async () => {
    conPagoPendiente();
    mockConfirmarPago.mockResolvedValueOnce(pago({ id: 90 }));
    await userEvent.click(await screen.findByRole("button", { name: "Revisar pago" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));

    await waitFor(() => expect(mockConfirmarPago).toHaveBeenCalledWith(90));
  });

  it("rechazar también resuelve el pago", async () => {
    conPagoPendiente();
    mockRechazarPago.mockResolvedValueOnce(pago({ id: 90, status: "REJECTED" }));
    await userEvent.click(await screen.findByRole("button", { name: "Revisar pago" }));
    await userEvent.click(screen.getByRole("button", { name: "Rechazar" }));

    await waitFor(() => expect(mockRechazarPago).toHaveBeenCalledWith(90));
  });
});

// --- el prototipo no puede dejar de andar ---

describe("modo demo", () => {
  it("no llama al backend y muestra las cuatro cuotas de ejemplo", async () => {
    render(<OwnerWorkspace initialView="cobranzas" demo />);

    expect(mockInvoices).not.toHaveBeenCalled();
    expect(fila(/Av. Rivadavia 2340/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revisar pago" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar cuota" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Comprobante/ })).toBeInTheDocument();
  });
});

// --- Ajustar el importe de una cuota ---

describe("ajustar importe", () => {
  const mockSumar = vi.mocked(AlquiaBackendClient.invoices.addAdjustment);
  const mockQuitar = vi.mocked(AlquiaBackendClient.invoices.removeAdjustment);

  const sinConfirmar = (over: Partial<InvoiceResponse> = {}) =>
    cuota({ status: "PENDING", confirmed: false, ...over });

  async function abrirAjuste(invoice = sinConfirmar()) {
    conCuotas([invoice]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");
    await userEvent.click(screen.getByRole("button", { name: "Ajustar importe" }));
    return screen.getByRole("dialog");
  }

  it("se ofrece junto a confirmar, no en vez de", async () => {
    conCuotas([sinConfirmar()]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByRole("button", { name: "Confirmar cuota" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajustar importe" })).toBeInTheDocument();
  });

  // Confirmar cierra el importe: el backend rechaza ajustes después.
  it("no se ofrece sobre una cuota ya confirmada", async () => {
    conCuotas([cuota({ confirmed: true })]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.queryByRole("button", { name: "Ajustar importe" })).not.toBeInTheDocument();
  });

  it("muestra el importe base y el total de partida", async () => {
    const dialogo = await abrirAjuste();

    expect(within(dialogo).getByText("Importe base")).toBeInTheDocument();
    expect(within(dialogo).getByText("Total actual")).toBeInTheDocument();
  });

  it("anuncia el descuento antes de guardarlo", async () => {
    const dialogo = await abrirAjuste();

    const importe = within(dialogo).getByLabelText("Importe final de la cuota");
    await userEvent.clear(importe);
    await userEvent.type(importe, "428691");

    expect(within(dialogo).getByRole("status")).toHaveTextContent("descuento de $ 50.000");
  });

  it("anuncia el recargo", async () => {
    const dialogo = await abrirAjuste();

    const importe = within(dialogo).getByLabelText("Importe final de la cuota");
    await userEvent.clear(importe);
    await userEvent.type(importe, "508691");

    expect(within(dialogo).getByRole("status")).toHaveTextContent("recargo de $ 30.000");
  });

  it("guarda la diferencia, no el importe escrito", async () => {
    mockSumar.mockResolvedValueOnce(sinConfirmar());
    const dialogo = await abrirAjuste();

    const importe = within(dialogo).getByLabelText("Importe final de la cuota");
    await userEvent.clear(importe);
    await userEvent.type(importe, "428691");
    await userEvent.type(within(dialogo).getByPlaceholderText(/Motivo/), "Reparación acordada");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar ajuste" }));

    await waitFor(() =>
      expect(mockSumar).toHaveBeenCalledWith(1000, {
        name: "Reparación acordada",
        kind: "DISCOUNT",
        valueType: "FIXED_AMOUNT",
        value: 50000,
      })
    );
  });

  it("sin motivo no deja guardar", async () => {
    const dialogo = await abrirAjuste();

    const importe = within(dialogo).getByLabelText("Importe final de la cuota");
    await userEvent.clear(importe);
    await userEvent.type(importe, "428691");

    expect(within(dialogo).getByRole("button", { name: "Guardar ajuste" })).toBeDisabled();
  });

  it("con el mismo importe no deja guardar y lo explica", async () => {
    const dialogo = await abrirAjuste();

    await userEvent.type(within(dialogo).getByPlaceholderText(/Motivo/), "Sin cambio");

    expect(within(dialogo).getByRole("status")).toHaveTextContent("no cambia");
    expect(within(dialogo).getByRole("button", { name: "Guardar ajuste" })).toBeDisabled();
  });

  it("lista los ajustes ya cargados con su efecto", async () => {
    const dialogo = await abrirAjuste(
      sinConfirmar({
        total: 428691,
        adjustments: [
          { id: 7, name: "Reparación", kind: "DISCOUNT", valueType: "FIXED_AMOUNT", value: 50000 },
        ],
      })
    );

    expect(within(dialogo).getByText("Reparación")).toBeInTheDocument();
    expect(within(dialogo).getByText("− $ 50.000")).toBeInTheDocument();
  });

  it("quitar un ajuste pide confirmación antes", async () => {
    const dialogo = await abrirAjuste(
      sinConfirmar({
        total: 428691,
        adjustments: [
          { id: 7, name: "Reparación", kind: "DISCOUNT", valueType: "FIXED_AMOUNT", value: 50000 },
        ],
      })
    );

    await userEvent.click(within(dialogo).getByRole("button", { name: "Quitar" }));

    expect(screen.getByText(/vuelve a calcularse sin él/)).toBeInTheDocument();
    expect(mockQuitar).not.toHaveBeenCalled();
  });

  it("explica el rechazo cuando la cuota quedó confirmada mientras editaba", async () => {
    mockSumar.mockRejectedValueOnce(
      new ApiError(400, "Cannot modify adjustments on a confirmed invoice")
    );
    const dialogo = await abrirAjuste();

    const importe = within(dialogo).getByLabelText("Importe final de la cuota");
    await userEvent.clear(importe);
    await userEvent.type(importe, "428691");
    await userEvent.type(within(dialogo).getByPlaceholderText(/Motivo/), "Algo");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar ajuste" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La cuota quedó confirmada mientras editaba"
    );
  });
});
