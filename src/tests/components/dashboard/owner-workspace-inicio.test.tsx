import { render, screen, waitFor, within } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import { SIN_DESVIO, resumenDeBorrador } from "@/tests/borradores";
import { serializar } from "@/lib/borradores";
import { SIN_OTRAS_CONDICIONES } from "@/lib/otras-condiciones";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";
import type {
  ContractResponse,
  InvoiceResponse,
  PreInvoiceResponse,
  PropertyResponse,
} from "@/lib/backend-types";

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: 1, email: "r@ejemplo.com", firstName: "Ricardo", lastName: "Rosas" },
    isLoading: false,
  }),
}));

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenants: { list: vi.fn() },
    contracts: { list: vi.fn() },
    properties: { list: vi.fn() },
    invoices: { list: vi.fn() },
    preInvoices: { list: vi.fn() },
    contractImports: { quota: vi.fn() },
    contractDrafts: { list: vi.fn(), get: vi.fn(), remove: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockInvoices = vi.mocked(AlquiaBackendClient.invoices.list);
const mockProperties = vi.mocked(AlquiaBackendClient.properties.list);
const mockContracts = vi.mocked(AlquiaBackendClient.contracts.list);
const mockPreInvoices = vi.mocked(AlquiaBackendClient.preInvoices.list);
const mockBorradores = vi.mocked(AlquiaBackendClient.contractDrafts);

const PROPIEDAD: PropertyResponse = {
  id: 10,
  street: "Av. Rivadavia",
  number: "2340",
  floorUnit: "5.º A",
  city: "CABA",
  province: "CABA",
  category: "APARTMENT",
  activeContract: { id: 100, currentRent: 478691, status: "ACTIVE" },
};

const CONTRATO: ContractResponse = {
  id: 100,
  property: PROPIEDAD,
  tenant: {
    id: 1,
    firstName: "Jorge",
    lastName: "Paletta",
    taxId: "20224567899",
    email: "jorge@ejemplo.com",
    phoneNumber: "+5491144552210",
  },
  initialRentAmount: 400000,
  startDate: "2025-03-01",
  termMonths: 36,
  dueDay: 10,
  endDate: "2028-02-29",
  status: "ACTIVE",
  incrementMethod: "FIXED_PERCENTAGE",
  incrementFrequencyMonths: 3,
  currentRent: 478691,
};

function cuota(extra: Partial<InvoiceResponse> = {}): InvoiceResponse {
  return {
    id: 1,
    contractId: 100,
    period: "2026-09-01",
    dueDate: "2026-09-10",
    baseAmount: 100000,
    total: 100000, amountDue: 100000, lateFee: null,
    status: "PENDING",
    confirmed: true,
    adjustments: [],
    payments: [],
    ...extra,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(AlquiaBackendClient.contractImports.quota).mockResolvedValue({ used: 0, limit: 5, available: true });
  mockBorradores.list.mockResolvedValue([]);
});

function conDatos({
  invoices = [] as InvoiceResponse[],
  properties = [PROPIEDAD],
  contracts = [CONTRATO],
  preInvoices = [] as PreInvoiceResponse[],
} = {}) {
  mockInvoices.mockResolvedValue(invoices);
  mockProperties.mockResolvedValue(properties);
  mockContracts.mockResolvedValue(contracts);
  mockPreInvoices.mockResolvedValue(preInvoices);
}

// --- Carga ---

describe("carga", () => {
  it("avisa que está cargando", () => {
    mockInvoices.mockReturnValue(new Promise(() => {}));
    mockProperties.mockReturnValue(new Promise(() => {}));
    mockContracts.mockReturnValue(new Promise(() => {}));
    mockPreInvoices.mockReturnValue(new Promise(() => {}));
    render(<OwnerWorkspace initialView="inicio" />);

    expect(screen.getByText("Cargando su panel…")).toBeInTheDocument();
  });

  it("acota las cuotas al mes corriente, como fecha completa", async () => {
    conDatos();
    render(<OwnerWorkspace initialView="inicio" />);
    await screen.findByText("PROPIEDADES");

    expect(mockInvoices).toHaveBeenCalledWith({
      period: expect.stringMatching(/^\d{4}-\d{2}-01$/),
    });
  });

  it("pide los contratos una sola vez para los dos bloques", async () => {
    conDatos();
    render(<OwnerWorkspace initialView="inicio" />);
    await screen.findByText("PROPIEDADES");

    expect(mockContracts).toHaveBeenCalledOnce();
  });

  it("avisa cuando falla, sin mostrar un panel en cero", async () => {
    conDatos();
    mockInvoices.mockRejectedValue(new Error("Network error"));
    render(<OwnerWorkspace initialView="inicio" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar su panel");
    expect(screen.queryByText("PROPIEDADES")).not.toBeInTheDocument();
  });

  it("no pide nada en el prototipo", () => {
    conDatos();
    render(<OwnerWorkspace initialView="inicio" demo />);

    expect(mockInvoices).not.toHaveBeenCalled();
    expect(screen.queryByText("Cargando su panel…")).not.toBeInTheDocument();
  });
});

// --- Cobranza del mes ---

describe("cobranza del mes", () => {
  it("reparte los tres montos y dice el total emitido", async () => {
    conDatos({
      invoices: [
        cuota({ id: 1, status: "PAID", total: 430000, amountDue: 430000, lateFee: null, payments: [{ id: 1, invoiceId: 1, status: "CONFIRMED", submittedByTenant: false }] }),
        cuota({ id: 2, status: "PENDING", total: 505000, amountDue: 505000 }),
        cuota({ id: 3, status: "DUE", total: 478691, amountDue: 478691 }),
      ],
    });
    render(<OwnerWorkspace initialView="inicio" />);

    const panel = (await screen.findByLabelText("Resumen de cobranzas")) as HTMLElement;
    expect(within(panel).getByText(/de \$ 1\.413\.691 emitidos/)).toBeInTheDocument();
    expect(within(panel).getByText("$ 505.000")).toBeInTheDocument();
    expect(within(panel).getByText("$ 478.691")).toBeInTheDocument();
    expect(within(panel).getByText(/1 de 3 cuotas cobradas/)).toBeInTheDocument();
  });

  it("la barra describe los mismos porcentajes que muestra", async () => {
    conDatos({
      invoices: [
        cuota({ id: 1, status: "PAID", total: 500, amountDue: 500, lateFee: null, payments: [{ id: 1, invoiceId: 1, status: "CONFIRMED", submittedByTenant: false }] }),
        cuota({ id: 2, status: "DUE", total: 500, amountDue: 500 }),
      ],
    });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(
      await screen.findByLabelText("50% cobrado, 0% por vencer y 50% vencido")
    ).toBeInTheDocument();
  });

  it("un monto en cero no ocupa lugar en la barra", async () => {
    conDatos({
      invoices: [
        cuota({ id: 1, status: "PAID", total: 500, amountDue: 500, lateFee: null, payments: [{ id: 1, invoiceId: 1, status: "CONFIRMED", submittedByTenant: false }] }),
        cuota({ id: 2, status: "DUE", total: 500, amountDue: 500 }),
      ],
    });
    render(<OwnerWorkspace initialView="inicio" />);

    const barra = await screen.findByLabelText("50% cobrado, 0% por vencer y 50% vencido");
    expect(barra.children).toHaveLength(2);
  });

  it("con cuotas pero todo en cero, la barra queda neutra", async () => {
    conDatos({ invoices: [cuota({ id: 1, status: "PENDING", total: 0, amountDue: 0 })] });
    render(<OwnerWorkspace initialView="inicio" />);

    const barra = await screen.findByLabelText("Sin montos emitidos");
    expect(barra.children).toHaveLength(0);
  });

  it("un mes sin cuotas lo dice en vez de mostrar ceros", async () => {
    conDatos({ invoices: [] });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(
      await screen.findByText("Todavía no hay cuotas emitidas este mes")
    ).toBeInTheDocument();
  });
});

// --- Cartera ---

describe("cartera", () => {
  it("separa las alquiladas de las libres", async () => {
    conDatos({ properties: [PROPIEDAD, { ...PROPIEDAD, id: 11, activeContract: null }] });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(await screen.findByText("1 con contrato activo · 1 sin alquilar")).toBeInTheDocument();
  });

  it("sin propiedades lo dice", async () => {
    conDatos({ properties: [] });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(await screen.findByText("Todavía no cargó ninguna")).toBeInTheDocument();
  });
});

// --- Proyección ---

describe("proyección", () => {
  it("suma las proyecciones cuando están todas", async () => {
    conDatos({ preInvoices: [{ contractId: 100, period: "2026-10-01", amount: 1451986 }] });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(await screen.findByText("$ 1.451.986")).toBeInTheDocument();
    expect(screen.getByText("Todos los contratos ya están definidos")).toBeInTheDocument();
  });

  it("cuenta aparte el contrato que depende de un índice", async () => {
    conDatos({
      contracts: [CONTRATO, { ...CONTRATO, id: 200 }],
      preInvoices: [{ contractId: 100, period: "2026-10-01", amount: 478691 }],
    });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(
      await screen.findByText("más 1 contrato a definir según el índice")
    ).toBeInTheDocument();
  });

  // Un «$ 0» diría que no va a cobrar nada, que es lo contrario de «no se sabe».
  it("sin ninguna proyección no muestra un total", async () => {
    conDatos({ preInvoices: [] });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(await screen.findByText(/Todavía no se puede proyectar/)).toBeInTheDocument();
    expect(screen.queryByText("$ 0")).not.toBeInTheDocument();
  });

  it("si la proyección falla, el resto del panel se muestra igual", async () => {
    conDatos();
    mockPreInvoices.mockRejectedValue(new Error("404"));
    render(<OwnerWorkspace initialView="inicio" />);

    expect(await screen.findByText("PROPIEDADES")).toBeInTheDocument();
    expect(screen.queryByText(/PROYECTADO/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// --- Avisos ---

describe("requieren su acción", () => {
  it("nombra al inquilino que espera confirmación", async () => {
    conDatos({
      invoices: [
        cuota({
          total: 520000, amountDue: 520000, lateFee: null,
          payments: [
            {
              id: 9,
              invoiceId: 1,
              status: "AWAITING_CONFIRMATION",
              submittedByTenant: true,
              submittedAt: "2026-09-19T10:00:00Z",
            },
          ],
        }),
      ],
    });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(
      await screen.findByText("Jorge Paletta cargó un pago y espera su confirmación")
    ).toBeInTheDocument();
  });

  it("agrupa las vencidas con su total", async () => {
    conDatos({
      invoices: [
        cuota({ id: 1, status: "DUE", total: 478691, amountDue: 478691 }),
        cuota({ id: 2, status: "DUE", total: 520000, amountDue: 520000 }),
      ],
    });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(await screen.findByText("2 cuotas vencidas sin pago")).toBeInTheDocument();
    expect(screen.getByText(/\$ 998\.691 en total/)).toBeInTheDocument();
  });

  it("cuando no hay nada pendiente lo dice, en vez de desaparecer", async () => {
    conDatos({ invoices: [cuota({ status: "PAID" })] });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(await screen.findByText(/Nada pendiente por ahora/)).toBeInTheDocument();
  });
});

// --- Contratos vigentes ---

describe("contratos vigentes", () => {
  it("lista cada contrato con su inquilino y alquiler", async () => {
    conDatos();
    render(<OwnerWorkspace initialView="inicio" />);

    expect(await screen.findByText("Av. Rivadavia 2340, 5.º A")).toBeInTheDocument();
    expect(screen.getByText(/Jorge Paletta · termina el 29\/02\/2028/)).toBeInTheDocument();
  });

  it("no lista los que ya terminaron", async () => {
    conDatos({ contracts: [{ ...CONTRATO, status: "TERMINATED" }] });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(await screen.findByText("Todavía no tiene contratos vigentes")).toBeInTheDocument();
  });

  it("sin ningún contrato, la acción principal es «Cargar mi primer contrato» y abre el asistente", async () => {
    conDatos({ properties: [], contracts: [], invoices: [] });
    render(<OwnerWorkspace initialView="inicio" />);

    const seccion = (await screen.findByText("Todavía no tiene contratos")).closest("section")!;
    expect(within(seccion).getByText(/Los carga juntos, en un solo recorrido/)).toBeInTheDocument();
    const accion = within(seccion).getByRole("button", { name: "Cargar mi primer contrato" });
    expect(accion).toHaveClass("owner-button--primary");
    expect(within(seccion).queryByRole("button", { name: "Agregar propiedad" })).not.toBeInTheDocument();

    await userEvent.click(accion);
    expect(await screen.findByRole("region", { name: "Asistente de nuevo contrato" })).toBeInTheDocument();
  });

  it("con propiedades pero sin contratos, también es el primer contrato", async () => {
    conDatos({ contracts: [], invoices: [] });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(await screen.findByRole("button", { name: "Cargar mi primer contrato" })).toBeInTheDocument();
  });

  it("con contratos que ya terminaron no es el primero: ofrece «Nuevo contrato»", async () => {
    conDatos({ contracts: [{ ...CONTRATO, status: "TERMINATED" }] });
    render(<OwnerWorkspace initialView="inicio" />);

    const seccion = (await screen.findByText("Todavía no tiene contratos vigentes")).closest("section")!;
    expect(within(seccion).getByRole("button", { name: "Nuevo contrato" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cargar mi primer contrato" })).not.toBeInTheDocument();
  });

  it("sin contratos no afirma que las cuotas están al día", async () => {
    conDatos({ contracts: [], invoices: [] });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(await screen.findByText(/Cuando tenga contratos, acá le avisamos/)).toBeInTheDocument();
    expect(screen.queryByText("Sus cuotas están al día.")).not.toBeInTheDocument();
  });
});

// --- Contratos a medio cargar ---

describe("borradores en «Requieren su acción»", () => {
  const seccionDeAcciones = async () => (await screen.findByRole("heading", { name: "Requieren su acción" })).closest("section")!;

  it("cada borrador es un aviso con su nombre, hace cuánto se editó y las acciones Continuar y Descartar", async () => {
    conDatos({ invoices: [cuota({ status: "PAID" })] });
    mockBorradores.list.mockResolvedValue([resumenDeBorrador({ label: "Lavalle 950 · Pérez", editadoHaceDias: 3 })]);
    render(<OwnerWorkspace initialView="inicio" />);

    const seccion = await seccionDeAcciones();
    expect(await within(seccion).findByText("Contrato en borrador: Lavalle 950 · Pérez")).toBeInTheDocument();
    expect(within(seccion).getByText(/Editado hace 3 días/)).toBeInTheDocument();
    expect(within(seccion).getByRole("button", { name: "Continuar" })).toHaveClass("owner-button--secondary");
    expect(within(seccion).getByRole("button", { name: "Descartar" })).toHaveClass("owner-button--secondary");
  });

  it("con sólo un borrador pendiente no dice que no hay nada pendiente ni ofrece ir a cobranzas", async () => {
    conDatos({ invoices: [cuota({ status: "PAID" })] });
    mockBorradores.list.mockResolvedValue([resumenDeBorrador()]);
    render(<OwnerWorkspace initialView="inicio" />);

    const seccion = await seccionDeAcciones();
    await within(seccion).findByText(/Contrato en borrador/);
    expect(screen.queryByText(/Nada pendiente por ahora/)).not.toBeInTheDocument();
    expect(within(seccion).queryByRole("button", { name: "Ir a cobranzas" })).not.toBeInTheDocument();
  });

  it("los borradores van después de las cuotas que esperan al propietario", async () => {
    conDatos({ invoices: [cuota({ status: "DUE" })] });
    mockBorradores.list.mockResolvedValue([resumenDeBorrador()]);
    render(<OwnerWorkspace initialView="inicio" />);

    const seccion = await seccionDeAcciones();
    await within(seccion).findByText(/Contrato en borrador/);
    const avisos = within(seccion).getAllByRole("article");
    expect(avisos.at(-1)).toHaveTextContent("Contrato en borrador");
    expect(avisos.length).toBeGreaterThan(1);
    expect(within(seccion).getByRole("button", { name: "Ir a cobranzas" })).toBeInTheDocument();
  });

  it("lejos del vencimiento no habla de vencimiento; desde los 15 días dice el día en que se descarta", async () => {
    conDatos();
    mockBorradores.list.mockResolvedValue([
      resumenDeBorrador({ id: 1, label: "Lejos", venceEnDias: 60 }),
      resumenDeBorrador({ id: 2, label: "Cerca", venceEnDias: 10 }),
    ]);
    render(<OwnerWorkspace initialView="inicio" />);

    const seccion = await seccionDeAcciones();
    const lejos = (await within(seccion).findByText("Contrato en borrador: Lejos")).closest("article")!;
    const cerca = within(seccion).getByText("Contrato en borrador: Cerca").closest("article")!;
    expect(lejos).not.toHaveTextContent(/se descarta/i);
    expect(cerca).toHaveTextContent(/Se descarta el \d{2}\/\d{2}\/\d{4} si no lo retoma/);
  });

  it("sin borradores y sin cuotas pendientes lo dice igual que antes", async () => {
    conDatos({ invoices: [cuota({ status: "PAID" })] });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(await screen.findByText(/Nada pendiente por ahora/)).toBeInTheDocument();
  });

  it("mientras no sabe si hay borradores no afirma que no hay nada pendiente", async () => {
    conDatos({ invoices: [cuota({ status: "PAID" })] });
    mockBorradores.list.mockImplementation(() => new Promise(() => {}));
    render(<OwnerWorkspace initialView="inicio" />);

    await screen.findByText("Contratos activos");
    expect(screen.queryByText(/Nada pendiente por ahora/)).not.toBeInTheDocument();
  });

  it("si no se pudieron traer lo dice y deja reintentar, sin romper el resto de Inicio", async () => {
    conDatos({ invoices: [cuota({ status: "PAID" })] });
    mockBorradores.list.mockRejectedValueOnce(new Error("boom"));
    render(<OwnerWorkspace initialView="inicio" />);

    expect(await screen.findByText("No pudimos revisar sus borradores")).toBeInTheDocument();
    expect(screen.queryByText(/Nada pendiente por ahora/)).not.toBeInTheDocument();
    expect(screen.getByText("Contratos activos")).toBeInTheDocument();

    mockBorradores.list.mockResolvedValue([resumenDeBorrador({ label: "Recuperado" })]);
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Contrato en borrador: Recuperado")).toBeInTheDocument();
  });

  it("«Continuar» abre el asistente con ese borrador", async () => {
    conDatos();
    mockBorradores.list.mockResolvedValue([resumenDeBorrador({ id: 7 })]);
    mockBorradores.get.mockResolvedValue({
      ...resumenDeBorrador({ id: 7 }),
      payload: serializar({
        paso: 3, ...SIN_DESVIO, propiedad: { id: 10, nuevo: false, borrador: null }, inquilino: { id: 1, nuevo: false, borrador: null },
        alquiler: "450000", diaVencimiento: 10, plazo: 24, inicio: "2026-09-01", metodo: "FIXED_PERCENTAGE",
        porcentaje: "8", frecuencia: 6, otras: SIN_OTRAS_CONDICIONES, pagadoHasta: "",
      }),
    });
    render(<OwnerWorkspace initialView="inicio" />);

    await userEvent.click(await screen.findByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("region", { name: "Asistente de nuevo contrato" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Alquiler mensual")).toHaveValue("450.000");
    expect(mockBorradores.get).toHaveBeenCalledWith(7);
  });

  it("«Descartar» pide confirmar, no borra si se vuelve, y al confirmar borra, avisa y lo saca de la lista", async () => {
    conDatos({ invoices: [cuota({ status: "PAID" })] });
    mockBorradores.list.mockResolvedValueOnce([resumenDeBorrador({ id: 7, label: "Lavalle 950 · Pérez", conPdf: true })]);
    mockBorradores.remove.mockResolvedValue(undefined);
    render(<OwnerWorkspace initialView="inicio" />);
    await userEvent.click(await screen.findByRole("button", { name: "Descartar" }));

    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText("¿Descartar este borrador?")).toBeInTheDocument();
    expect(within(dialogo).getByText("Lavalle 950 · Pérez")).toBeInTheDocument();
    expect(within(dialogo).getByText(/y el PDF que adjuntó/)).toBeInTheDocument();
    await userEvent.click(within(dialogo).getByRole("button", { name: "Volver" }));
    expect(mockBorradores.remove).not.toHaveBeenCalled();
    expect(screen.getByText("Contrato en borrador: Lavalle 950 · Pérez")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Descartar" }));

    await waitFor(() => expect(mockBorradores.remove).toHaveBeenCalledWith(7));
    expect(await screen.findByText("Borrador descartado.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Contrato en borrador: Lavalle 950 · Pérez")).not.toBeInTheDocument());
    expect(await screen.findByText(/Nada pendiente por ahora/)).toBeInTheDocument();
  });

  it("si no se pudo descartar, el diálogo lo dice y el borrador sigue", async () => {
    conDatos();
    mockBorradores.list.mockResolvedValue([resumenDeBorrador({ id: 7 })]);
    mockBorradores.remove.mockRejectedValue(new Error("boom"));
    render(<OwnerWorkspace initialView="inicio" />);
    await userEvent.click(await screen.findByRole("button", { name: "Descartar" }));

    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Descartar" }));

    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent(/No pudimos descartar el borrador/);
    expect(screen.getByText(/Contrato en borrador/)).toBeInTheDocument();
  });

  it("el prototipo (demo) no pide borradores", async () => {
    render(<OwnerWorkspace initialView="inicio" demo />);

    await screen.findByText("Requieren su acción");
    expect(mockBorradores.list).not.toHaveBeenCalled();
  });
});
