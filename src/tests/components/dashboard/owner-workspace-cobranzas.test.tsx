import { act } from "@testing-library/react";
import { render, screen, waitFor, within } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";
import { ApiError } from "@/lib/api";
import { ERROR } from "@/lib/error-codes";
import type { ContractResponse, InvoiceResponse, LateFeeResponse, PaymentResponse } from "@/lib/backend-types";
import { FakeEventSource, instalarEventSourceFalso } from "@/tests/fake-event-source";

// OwnerWorkspace nombra la cuenta desde la sesión; estas vistas no la usan.
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenants: { list: vi.fn() },
    contracts: { list: vi.fn() },
    properties: { list: vi.fn(), archive: vi.fn() },
    invoices: { list: vi.fn(), confirm: vi.fn(), addAdjustment: vi.fn(), editAdjustment: vi.fn(), removeAdjustment: vi.fn(), setLateFee: vi.fn(), clearLateFee: vi.fn() },
    payments: { create: vi.fn(), confirm: vi.fn(), reject: vi.fn(), getReceipt: vi.fn() },
    contractImports: { quota: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockInvoices = vi.mocked(AlquiaBackendClient.invoices.list);
const mockContracts = vi.mocked(AlquiaBackendClient.contracts.list);
const mockConfirmarCuota = vi.mocked(AlquiaBackendClient.invoices.confirm);
const mockFijarRecargo = vi.mocked(AlquiaBackendClient.invoices.setLateFee);
const mockQuitarRecargo = vi.mocked(AlquiaBackendClient.invoices.clearLateFee);
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
  baseAmount: 478691, total: 478691, amountDue: 478691, lateFee: null, status: "DUE", confirmed: true,
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
  vi.mocked(AlquiaBackendClient.contractImports.quota).mockResolvedValue({ used: 0, limit: 5, available: true });
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

  it.each([
    [ERROR.PAYMENT_RECEIPT_NOT_IMAGE, "El comprobante tiene que ser una imagen PNG, JPG o WebP."],
    [ERROR.PAYMENT_RECEIPT_EMPTY, "El comprobante está vacío. Suba una imagen PNG, JPG o WebP."],
  ] as const)("al registrar el pago, %s se muestra en español", async (type, mensaje) => {
    conCuotas([cuota()]);
    mockCrearPago.mockRejectedValueOnce(new ApiError(400, "English detail from backend", type));
    await userEvent.click(await screen.findByRole("button", { name: "Registrar pago" }));
    await userEvent.upload(
      screen.getByLabelText("Comprobante del pago"),
      new File(["x"], "t.pdf", { type: "application/pdf" })
    );
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Registrar pago" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(mensaje);
    expect(screen.queryByText(/English/)).not.toBeInTheDocument();
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
      total: 428691, amountDue: 428691, lateFee: null,
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

// --- pagos en vivo ---

describe("pagos en vivo", () => {
  let Falso: typeof FakeEventSource;

  beforeEach(() => {
    Falso = instalarEventSourceFalso();
  });

  const streamDelPropietario = () => Falso.instancias.find((stream) => stream.url.endsWith("/payments/events"));

  it("un comprobante que llega del inquilino recarga la lista y avisa", async () => {
    mockInvoices.mockResolvedValueOnce([cuota({ payments: [] })]);
    mockInvoices.mockResolvedValue([cuota({ payments: [pago({ id: 500, status: "AWAITING_CONFIRMATION", submittedByTenant: true })] })]);
    mockContracts.mockResolvedValue([CONTRATO]);
    render(<OwnerWorkspace initialView="cobranzas" />);
    await waitFor(() => expect(screen.queryByText("Cargando sus cobranzas…")).not.toBeInTheDocument());
    await waitFor(() => expect(streamDelPropietario()).toBeDefined());

    streamDelPropietario()?.emitir("payment-updated", { paymentId: 500, invoiceId: 1000, contractId: 100, status: "AWAITING_CONFIRMATION" });

    expect(await screen.findByText(/Llegó un comprobante para revisar\./)).toBeInTheDocument();
    expect(mockInvoices).toHaveBeenCalledTimes(2);
  });

  it("no avisa de nuevo un comprobante que ya estaba en pantalla", async () => {
    mockInvoices.mockResolvedValue([cuota({ payments: [pago({ id: 500, status: "AWAITING_CONFIRMATION", submittedByTenant: true })] })]);
    mockContracts.mockResolvedValue([CONTRATO]);
    render(<OwnerWorkspace initialView="cobranzas" />);
    await waitFor(() => expect(screen.queryByText("Cargando sus cobranzas…")).not.toBeInTheDocument());
    await waitFor(() => expect(streamDelPropietario()).toBeDefined());

    streamDelPropietario()?.emitir("payment-updated", { paymentId: 500, invoiceId: 1000, contractId: 100, status: "AWAITING_CONFIRMATION" });

    await waitFor(() => expect(mockInvoices).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/Llegó un comprobante/)).not.toBeInTheDocument();
  });

  it("al conectarse vuelve a cargar las cuotas", async () => {
    mockInvoices.mockResolvedValue([cuota()]);
    mockContracts.mockResolvedValue([CONTRATO]);
    render(<OwnerWorkspace initialView="cobranzas" />);
    await waitFor(() => expect(screen.queryByText("Cargando sus cobranzas…")).not.toBeInTheDocument());
    await waitFor(() => expect(streamDelPropietario()).toBeDefined());

    streamDelPropietario()?.emitir("connected");

    await waitFor(() => expect(mockInvoices).toHaveBeenCalledTimes(2));
  });
});


// --- recargo por atraso y cuotas sin confirmar ---

describe("recargo por atraso", () => {
  const recargo = (over: Partial<LateFeeResponse> = {}): LateFeeResponse => ({
    method: "PERCENT_PER_DAY", value: 1.5, accruesFrom: "2026-08-11", asOf: "2026-08-14", daysLate: 3,
    amount: 6750, nextDayAmount: 9000, state: "ACCRUING", overridden: false, ...over,
  });

  it("la fila muestra lo que se adeuda hoy, el recargo y lo que se adeuda mañana", async () => {
    conCuotas([cuota({ total: 450000, amountDue: 456750, lateFee: recargo() })]);
    const filaCuota = within(await screen.findByRole("row", { name: /Av\. Rivadavia/ }));

    expect(filaCuota.getByText("$ 456.750", { selector: "td" , exact: false })).toBeInTheDocument();
    expect(filaCuota.getByText(/Recargo por atraso/)).toHaveTextContent("$ 6.750");
    expect(filaCuota.getByText(/Desde mañana/)).toHaveTextContent("$ 459.000");
  });

  it("antes de que empiece, dice desde cuándo y no suma nada al importe", async () => {
    conCuotas([cuota({ amountDue: 478691, lateFee: recargo({ state: "NOT_STARTED", amount: 0, nextDayAmount: 2250, accruesFrom: "2026-08-16" }) })]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByText("Desde el 16/08 se suma un recargo de $ 2.250 por día")).toBeInTheDocument();
    expect(screen.queryByText(/Recargo por atraso/)).not.toBeInTheDocument();
  });

  it("un recargo perdonado se le dice al propietario", async () => {
    conCuotas([cuota({ lateFee: recargo({ overridden: true, amount: 0, nextDayAmount: 0 }) })]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByText("Recargo perdonado")).toBeInTheDocument();
  });

  it("con la pantalla abierta pasada la medianoche argentina, vuelve a leer las cuotas", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date("2026-08-15T02:50:00Z")); // 23:50 del 14/08 en Buenos Aires
    try {
      mockInvoices
        .mockResolvedValueOnce([cuota({ amountDue: 485441, lateFee: recargo({ amount: 6750, nextDayAmount: 8000 }) })])
        .mockResolvedValueOnce([cuota({ amountDue: 486691, lateFee: recargo({ amount: 8000, nextDayAmount: 9250 }) })]);
      mockContracts.mockResolvedValue([CONTRATO]);
      render(<OwnerWorkspace initialView="cobranzas" />);
      expect(await screen.findByText(/Recargo por atraso/)).toHaveTextContent("$ 6.750");

      await act(async () => { vi.advanceTimersByTime(15 * 60_000); });

      await waitFor(() => expect(mockInvoices).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.getByText(/Recargo por atraso/)).toHaveTextContent("$ 8.000"));
    } finally {
      vi.useRealTimers();
    }
  });

  it("una cuota sin recargo no muestra nada de esto", async () => {
    conCuotas([cuota()]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.queryByText(/recargo/i)).not.toBeInTheDocument();
  });
});

describe("cuotas sin confirmar", () => {
  it("vencida y con punitorios: aviso urgente con el recargo de hoy y el enlace a confirmar", async () => {
    conCuotas([cuota({
      confirmed: false, amountDue: 485441,
      lateFee: { method: "FIXED_PER_DAY", value: 1250, accruesFrom: "2026-08-11", asOf: "2026-08-14", daysLate: 3,
        amount: 6750, nextDayAmount: 8000, state: "ACCRUING", overridden: false },
    })]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByText(/no puede pagarla en el portal/)).toHaveTextContent(
      "El recargo por atraso corre igual, según el contrato: hoy suma $ 6.750."
    );
    expect(screen.getByText("Sin confirmar").closest("small")).toHaveClass("owner-substatus--urgente");

    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(within(screen.getByRole("dialog")).getByText(/ya no se puede ajustar/)).toBeInTheDocument();
  });

  it("sin punitorios el aviso no habla de recargo", async () => {
    conCuotas([cuota({ confirmed: false })]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByText(/no puede pagarla en el portal/)).not.toHaveTextContent(/recargo/);
  });

  it("todavía no vencida: el aviso no es urgente", async () => {
    conCuotas([cuota({ confirmed: false, status: "PENDING", dueDate: "2099-01-10" })]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByText("Sin confirmar").closest("small")).not.toHaveClass("owner-substatus--urgente");
  });
});


// --- cambiar el recargo ---

describe("perdonar, cambiar y volver a calcular el recargo", () => {
  const recargo = (over: Partial<LateFeeResponse> = {}): LateFeeResponse => ({
    method: "PERCENT_PER_DAY", value: 1.5, accruesFrom: "2026-08-11", asOf: "2026-08-14", daysLate: 3,
    amount: 6750, nextDayAmount: 9000, state: "ACCRUING", overridden: false, ...over,
  });
  const conRecargo = (lateFee: LateFeeResponse | null = recargo(), amountDue = 485441) =>
    cuota({ amountDue, lateFee });

  async function abrirRecargo(fila: InvoiceResponse = conRecargo(), despues: InvoiceResponse = conRecargo(null, 478691)) {
    mockInvoices.mockResolvedValueOnce([fila]).mockResolvedValue([despues]);
    mockContracts.mockResolvedValue([CONTRATO]);
    render(<OwnerWorkspace initialView="cobranzas" />);
    await userEvent.click(await screen.findByRole("button", { name: "Recargo" }));
    return screen.getByRole("dialog");
  }

  it("la fila ofrece el recargo sólo si hay uno que cambiar", async () => {
    conCuotas([cuota()]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");
    expect(screen.queryByRole("button", { name: "Recargo" })).not.toBeInTheDocument();
  });

  it("perdonar manda amount 0, relee las cuotas y avisa", async () => {
    mockFijarRecargo.mockResolvedValue(cuota());
    const dialogo = await abrirRecargo();
    expect(within(dialogo).getByText("$ 6.750")).toBeInTheDocument();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Perdonar recargo" }));

    await waitFor(() => expect(mockFijarRecargo).toHaveBeenCalledWith(1000, { amount: 0 }));
    await waitFor(() => expect(mockInvoices).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Recargo perdonado.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cambiar manda el importe escrito y respeta el máximo de hoy", async () => {
    mockFijarRecargo.mockResolvedValue(cuota());
    const dialogo = await abrirRecargo();
    await userEvent.click(within(dialogo).getByRole("button", { name: "Cambiar el recargo" }));
    expect(within(dialogo).getByText(/Entre \$ 0 y \$ 6\.750/)).toBeInTheDocument();

    await userEvent.type(within(dialogo).getByLabelText("Nuevo recargo"), "10.000");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));
    expect(within(dialogo).getByRole("alert")).toHaveTextContent("El máximo es $ 6.750");
    expect(mockFijarRecargo).not.toHaveBeenCalled();

    await userEvent.clear(within(dialogo).getByLabelText("Nuevo recargo"));
    await userEvent.type(within(dialogo).getByLabelText("Nuevo recargo"), "3.000");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockFijarRecargo).toHaveBeenCalledWith(1000, { amount: 3000 }));
    expect(await screen.findByText("Recargo actualizado.")).toBeInTheDocument();
  });

  it("un recargo modificado se puede volver a calcular, y entonces el tope lo pone el backend", async () => {
    mockQuitarRecargo.mockResolvedValue(cuota());
    const dialogo = await abrirRecargo(conRecargo(recargo({ overridden: true, amount: 3000, nextDayAmount: 3000 }), 481691));
    expect(within(dialogo).getByText("Recargo modificado")).toBeInTheDocument();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Cambiar el recargo" }));
    expect(within(dialogo).queryByText(/Entre/)).not.toBeInTheDocument();
    await userEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));

    await userEvent.click(within(dialogo).getByRole("button", { name: "Volver a calcular" }));
    await waitFor(() => expect(mockQuitarRecargo).toHaveBeenCalledWith(1000));
    expect(await screen.findByText("Recargo recalculado según el contrato.")).toBeInTheDocument();
  });

  it("un recargo ya perdonado no se vuelve a perdonar", async () => {
    const dialogo = await abrirRecargo(conRecargo(recargo({ overridden: true, amount: 0, nextDayAmount: 0 }), 478691));
    expect(within(dialogo).getByRole("button", { name: "Perdonar recargo" })).toBeDisabled();
    expect(within(dialogo).getByRole("button", { name: "Volver a calcular" })).toBeEnabled();
  });

  it("un 409 por cuota ya paga se muestra en el diálogo, que sigue abierto", async () => {
    mockFijarRecargo.mockRejectedValue(new ApiError(409, "Paid invoice cannot be changed", ERROR.LATE_FEE_ALREADY_SETTLED));
    const dialogo = await abrirRecargo();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Perdonar recargo" }));

    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("La cuota ya está paga");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mockInvoices).toHaveBeenCalledTimes(1);
  });

  it("un tope que el backend rechaza (400 sobre amount) se explica sin mostrar su texto", async () => {
    mockFijarRecargo.mockRejectedValue(new ApiError(400, "Validation failed", undefined, { amount: "must be at most" }));
    const dialogo = await abrirRecargo(conRecargo(recargo({ overridden: true, amount: 3000, nextDayAmount: 3000 }), 481691));
    await userEvent.click(within(dialogo).getByRole("button", { name: "Cambiar el recargo" }));
    await userEvent.type(within(dialogo).getByLabelText("Nuevo recargo"), "99999");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("supera el recargo que corresponde hoy");
  });
});

describe("registrar pago con recargo", () => {
  const lateFee: LateFeeResponse = {
    method: "PERCENT_PER_DAY", value: 1.5, accruesFrom: "2026-08-11", asOf: "2026-08-14", daysLate: 3,
    amount: 6750, nextDayAmount: 9000, state: "ACCRUING", overridden: false,
  };

  it("muestra el recargo que el pago va a saldar y deja cambiarlo antes de registrar", async () => {
    mockInvoices
      .mockResolvedValueOnce([cuota({ amountDue: 485441, lateFee })])
      .mockResolvedValue([cuota({ amountDue: 478691, lateFee: { ...lateFee, amount: 0, nextDayAmount: 0, overridden: true } })]);
    mockContracts.mockResolvedValue([CONTRATO]);
    mockFijarRecargo.mockResolvedValue(cuota());
    render(<OwnerWorkspace initialView="cobranzas" />);

    await userEvent.click(await screen.findByRole("button", { name: "Registrar pago" }));
    const registro = screen.getByRole("dialog");
    expect(within(registro).getByText(/Incluye el recargo por atraso de/)).toHaveTextContent("$ 6.750");
    expect(within(registro).getByText("$ 485.441")).toBeInTheDocument();

    await userEvent.click(within(registro).getByRole("button", { name: "Cambiar" }));
    expect(screen.getByRole("dialog", { name: "Recargo por atraso" })).toBeInTheDocument();
    expect(screen.queryByText("Registrar pago", { selector: "h2, h1" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Perdonar recargo" }));

    // Vuelve el registro del pago, ya con el importe sin recargo.
    const de_nuevo = await screen.findByRole("dialog", { name: "Registrar pago" });
    expect(within(de_nuevo).getByText("$ 478.691")).toBeInTheDocument();
    expect(within(de_nuevo).queryByText(/Incluye el recargo/)).not.toBeInTheDocument();
  });

  it("sin recargo, el registro del pago no habla de él", async () => {
    conCuotas([cuota()]);
    await userEvent.click(await screen.findByRole("button", { name: "Registrar pago" }));
    expect(within(screen.getByRole("dialog")).queryByText(/recargo/i)).not.toBeInTheDocument();
  });
});


// --- pagos registrados al dar de alta un contrato en curso ---

describe("pagos del alta", () => {
  const delAlta = pago({ origin: "ONBOARDING", hasReceipt: false, submittedByTenant: false });

  it("una cuota cobrada al dar de alta lo dice y no ofrece comprobante ni acciones", async () => {
    conCuotas([cuota({ status: "PAID", payments: [delAlta] })]);
    const filaCuota = within(await screen.findByRole("row", { name: /Av\. Rivadavia/ }));

    expect(filaCuota.getByText("Registrado al dar de alta · sin comprobante")).toBeInTheDocument();
    expect(filaCuota.queryByRole("button")).not.toBeInTheDocument();
  });

  it("una cuota cobrada con comprobante sigue ofreciéndolo", async () => {
    conCuotas([cuota({ status: "PAID", payments: [pago({ origin: "LANDLORD", hasReceipt: true })] })]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByRole("button", { name: /Comprobante/ })).toBeEnabled();
    expect(screen.queryByText(/Registrado al dar de alta/)).not.toBeInTheDocument();
  });
});
