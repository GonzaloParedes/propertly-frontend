import { render, screen, waitFor, within } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";
import { ApiError } from "@/lib/api";
import { ERROR } from "@/lib/error-codes";
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

    expect(screen.getByText("Cargando sus cobranzas…")).toBeInTheDocument();
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

  it("sin cuotas ofrece crear el contrato que las genera", async () => {
    conCuotas([]);
    await screen.findByText("Todavía no hay cuotas");

    await userEvent.click(screen.getByRole("button", { name: "Nuevo contrato" }));
    expect(await screen.findByRole("region", { name: "Asistente de nuevo contrato" })).toBeInTheDocument();
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
    await userEvent.click(await screen.findByRole("button", { name: "Filtros" }));
    const grupo = screen.getByRole("region", { name: "Estado" });

    expect(within(grupo).getByRole("button", { name: /Todas/ })).toHaveTextContent("4");
    expect(within(grupo).getByRole("button", { name: /Vencidas/ })).toHaveTextContent("1");
    expect(within(grupo).getByRole("button", { name: /A vencer/ })).toHaveTextContent("2");
    expect(within(grupo).getByRole("button", { name: /Pagadas/ })).toHaveTextContent("1");
  });

  it("al filtrar deja sólo las que corresponden", async () => {
    conCuotas(cuatro);
    await userEvent.click(await screen.findByRole("button", { name: "Filtros" }));
    await userEvent.click(screen.getByRole("button", { name: /Pagadas/ }));

    // 1 encabezado + 1 fila
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });
});

describe("búsqueda", () => {
  it("filtra por dirección y dice cuando nada coincide", async () => {
    conCuotas([cuota()]);
    const buscador = await screen.findByLabelText("Buscar cuotas");

    await userEvent.type(buscador, "rivadavia");
    expect(screen.getAllByRole("row")).toHaveLength(2);

    await userEvent.clear(buscador);
    await userEvent.type(buscador, "zzzz");
    expect(screen.getByText("No encontramos cuotas para «zzzz»")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Quitar búsqueda" }));
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("si el estado esconde lo que se buscó, ofrece ver todas", async () => {
    conCuotas([cuota({ status: "DUE" })]);
    await userEvent.type(await screen.findByLabelText("Buscar cuotas"), "rivadavia");
    await userEvent.click(screen.getByRole("button", { name: "Filtros" }));
    await userEvent.click(screen.getByRole("button", { name: /Pagadas/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(screen.getByText("No hay cuotas pagadas")).toBeInTheDocument();
    expect(screen.getByText("Para «rivadavia» hay 1 en otros estados.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ver todas" }));
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });
});

// --- acciones ---

describe("acciones", () => {
  it("una cuota sin confirmar ofrece confirmarla, no registrar el pago", async () => {
    conCuotas([cuota({ confirmed: false })]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByRole("button", { name: "Confirmar importe" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar pago" })).not.toBeInTheDocument();
    expect(screen.getByText("Sin confirmar")).toBeInTheDocument();
  });

  it("confirmar el importe pide una confirmación antes de tocar el backend", async () => {
    conCuotas([cuota({ confirmed: false })]);
    await userEvent.click(await screen.findByRole("button", { name: "Confirmar importe" }));

    const dialogo = screen.getByRole("dialog");
    expect(within(dialogo).getByText(/ya no se puede ajustar/)).toBeInTheDocument();
    expect(mockConfirmarCuota).not.toHaveBeenCalled();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockConfirmarCuota).not.toHaveBeenCalled();
  });

  it("al aceptar, manda la confirmación al backend y vuelve a pedir la lista", async () => {
    conCuotas([cuota({ confirmed: false })]);
    mockConfirmarCuota.mockResolvedValueOnce(cuota({ confirmed: true }));
    await userEvent.click(await screen.findByRole("button", { name: "Confirmar importe" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar importe" }));

    await waitFor(() => expect(mockConfirmarCuota).toHaveBeenCalledWith(1000));
    await waitFor(() => expect(mockInvoices).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Importe confirmado/)).toBeInTheDocument();
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
      new ApiError(
        409,
        "Cannot submit a payment for an unconfirmed invoice",
        ERROR.PAYMENT_ON_UNCONFIRMED_INVOICE
      )
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
    expect(await screen.findByText(/Pago confirmado\. La cuota de .* quedó pagada/)).toBeInTheDocument();
  });

  it("rechazar también resuelve el pago", async () => {
    conPagoPendiente();
    mockRechazarPago.mockResolvedValueOnce(pago({ id: 90, status: "REJECTED" }));
    await userEvent.click(await screen.findByRole("button", { name: "Revisar pago" }));
    await userEvent.click(screen.getByRole("button", { name: "Rechazar" }));

    await waitFor(() => expect(mockRechazarPago).toHaveBeenCalledWith(90));
    expect(await screen.findByText(/Pago rechazado/)).toBeInTheDocument();
  });
});

// --- el prototipo no puede dejar de andar ---

describe("modo demo", () => {
  it("confirmar un pago no llama al backend y lo confirma con un aviso", async () => {
    render(<OwnerWorkspace initialView="cobranzas" demo />);

    await userEvent.click(screen.getByRole("button", { name: "Revisar pago" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));

    expect(mockConfirmarPago).not.toHaveBeenCalled();
    expect(await screen.findByText(/Pago confirmado\. La cuota de .* quedó pagada/)).toBeInTheDocument();
  });

  it("no llama al backend y muestra las cuatro cuotas de ejemplo", async () => {
    render(<OwnerWorkspace initialView="cobranzas" demo />);

    expect(mockInvoices).not.toHaveBeenCalled();
    expect(fila(/Av. Rivadavia 2340/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revisar pago" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar importe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Comprobante/ })).toBeInTheDocument();
  });
});

// --- Ajustar el importe de una cuota ---

describe("ajustar importe", () => {
  const mockSumar = vi.mocked(AlquiaBackendClient.invoices.addAdjustment);
  const mockEditar = vi.mocked(AlquiaBackendClient.invoices.editAdjustment);
  const mockQuitar = vi.mocked(AlquiaBackendClient.invoices.removeAdjustment);

  const sinConfirmar = (over: Partial<InvoiceResponse> = {}) =>
    cuota({ status: "PENDING", confirmed: false, ...over });

  const conAjuste = (over: Partial<InvoiceResponse> = {}) =>
    sinConfirmar({
      total: 428691,
      adjustments: [
        { id: 7, name: "Reparación", kind: "DISCOUNT", valueType: "FIXED_AMOUNT", value: 50000 },
      ],
      ...over,
    });

  async function abrirAjuste(invoice = sinConfirmar()) {
    conCuotas([invoice]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");
    await userEvent.click(screen.getByRole("button", { name: "Ajustar importe" }));
    return screen.getByRole("dialog");
  }

  async function cargarItem(dialogo: HTMLElement, nombre: string, monto: string) {
    await userEvent.type(within(dialogo).getByPlaceholderText(/Ítem/), nombre);
    const monto$ = within(dialogo).getByLabelText("Monto del ítem");
    await userEvent.clear(monto$);
    await userEvent.type(monto$, monto);
  }

  it("se ofrece junto a confirmar, no en vez de", async () => {
    conCuotas([sinConfirmar()]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByRole("button", { name: "Confirmar importe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajustar importe" })).toBeInTheDocument();
  });

  // Confirmar cierra el importe: el backend rechaza ajustes después.
  it("no se ofrece sobre una cuota ya confirmada", async () => {
    conCuotas([cuota({ confirmed: true })]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.queryByRole("button", { name: "Ajustar importe" })).not.toBeInTheDocument();
  });

  it("muestra el importe base y el total", async () => {
    const dialogo = await abrirAjuste();

    expect(within(dialogo).getByText("Importe base")).toBeInTheDocument();
    expect(within(dialogo).getByText("Total")).toBeInTheDocument();
  });

  it("agrega un ítem con nombre, monto y signo", async () => {
    mockSumar.mockResolvedValueOnce(sinConfirmar());
    const dialogo = await abrirAjuste();

    await cargarItem(dialogo, "Baño roto", "250000");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Agregar ítem" }));

    await waitFor(() =>
      expect(mockSumar).toHaveBeenCalledWith(1000, {
        name: "Baño roto",
        kind: "SURCHARGE",
        valueType: "FIXED_AMOUNT",
        value: 250000,
      })
    );
  });

  it("agrega un ítem como descuento porcentual sobre el base", async () => {
    mockSumar.mockResolvedValueOnce(sinConfirmar());
    const dialogo = await abrirAjuste();

    await userEvent.type(within(dialogo).getByPlaceholderText(/Ítem/), "Descuento del mes");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Resta (descuento)" }));
    await userEvent.click(within(dialogo).getByRole("button", { name: "Porcentaje" }));
    await userEvent.type(within(dialogo).getByLabelText("Porcentaje del ítem"), "10");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Agregar ítem" }));

    await waitFor(() =>
      expect(mockSumar).toHaveBeenCalledWith(1000, {
        name: "Descuento del mes",
        kind: "DISCOUNT",
        valueType: "PERCENTAGE",
        value: 10,
      })
    );
  });

  it("previsualiza el efecto del ítem antes de guardarlo", async () => {
    const dialogo = await abrirAjuste();

    await cargarItem(dialogo, "Baño roto", "250000");

    expect(within(dialogo).getByRole("status")).toHaveTextContent("+ $ 250.000");
  });

  it("edita un ítem ya cargado", async () => {
    mockEditar.mockResolvedValueOnce(conAjuste());
    const dialogo = await abrirAjuste(conAjuste());

    await userEvent.click(within(dialogo).getByRole("button", { name: "Editar" }));
    const monto$ = within(dialogo).getByLabelText("Monto del ítem");
    await userEvent.clear(monto$);
    await userEvent.type(monto$, "60000");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar ítem" }));

    await waitFor(() =>
      expect(mockEditar).toHaveBeenCalledWith(1000, 7, {
        name: "Reparación",
        kind: "DISCOUNT",
        valueType: "FIXED_AMOUNT",
        value: 60000,
      })
    );
  });

  it("sin nombre no deja agregar", async () => {
    const dialogo = await abrirAjuste();

    const monto$ = within(dialogo).getByLabelText("Monto del ítem");
    await userEvent.clear(monto$);
    await userEvent.type(monto$, "250000");

    expect(within(dialogo).getByRole("button", { name: "Agregar ítem" })).toBeDisabled();
  });

  it("sin monto no deja agregar", async () => {
    const dialogo = await abrirAjuste();

    await userEvent.type(within(dialogo).getByPlaceholderText(/Ítem/), "Baño roto");

    expect(within(dialogo).getByRole("button", { name: "Agregar ítem" })).toBeDisabled();
  });

  it("un descuento que deja el total negativo no se puede guardar", async () => {
    const dialogo = await abrirAjuste();

    await userEvent.type(within(dialogo).getByPlaceholderText(/Ítem/), "Descuento enorme");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Resta (descuento)" }));
    const monto$ = within(dialogo).getByLabelText("Monto del ítem");
    await userEvent.clear(monto$);
    await userEvent.type(monto$, "999999999");

    expect(within(dialogo).getByRole("button", { name: "Agregar ítem" })).toBeDisabled();
  });

  it("lista los ajustes ya cargados con su efecto", async () => {
    const dialogo = await abrirAjuste(conAjuste());

    expect(within(dialogo).getByText("Reparación")).toBeInTheDocument();
    expect(within(dialogo).getByText("− $ 50.000")).toBeInTheDocument();
  });

  it("quitar un ajuste pide confirmación antes", async () => {
    const dialogo = await abrirAjuste(conAjuste());

    await userEvent.click(within(dialogo).getByRole("button", { name: "Quitar" }));

    expect(screen.getByText(/vuelve a calcularse sin él/)).toBeInTheDocument();
    expect(mockQuitar).not.toHaveBeenCalled();
  });

  it("explica el rechazo cuando la cuota quedó confirmada mientras editaba", async () => {
    mockSumar.mockRejectedValueOnce(
      new ApiError(
        409,
        "Cannot modify adjustments on a confirmed invoice",
        ERROR.ADJUSTMENT_ON_CONFIRMED_INVOICE
      )
    );
    const dialogo = await abrirAjuste();

    await cargarItem(dialogo, "Algo", "100000");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Agregar ítem" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La cuota quedó confirmada mientras editaba"
    );
  });
});
