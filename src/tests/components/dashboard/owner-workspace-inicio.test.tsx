import { render, screen, within } from "@testing-library/react";
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
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockInvoices = vi.mocked(AlquiaBackendClient.invoices.list);
const mockProperties = vi.mocked(AlquiaBackendClient.properties.list);
const mockContracts = vi.mocked(AlquiaBackendClient.contracts.list);
const mockPreInvoices = vi.mocked(AlquiaBackendClient.preInvoices.list);

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
    total: 100000,
    status: "PENDING",
    confirmed: true,
    adjustments: [],
    payments: [],
    ...extra,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
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

    expect(screen.getByText("Cargando…")).toBeInTheDocument();
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
    expect(screen.queryByText("Cargando…")).not.toBeInTheDocument();
  });
});

// --- Cobranza del mes ---

describe("cobranza del mes", () => {
  it("reparte los tres montos y dice el total emitido", async () => {
    conDatos({
      invoices: [
        cuota({ id: 1, status: "PAID", total: 430000, payments: [{ id: 1, invoiceId: 1, status: "CONFIRMED", submittedByTenant: false }] }),
        cuota({ id: 2, status: "PENDING", total: 505000 }),
        cuota({ id: 3, status: "DUE", total: 478691 }),
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
        cuota({ id: 1, status: "PAID", total: 500, payments: [{ id: 1, invoiceId: 1, status: "CONFIRMED", submittedByTenant: false }] }),
        cuota({ id: 2, status: "DUE", total: 500 }),
      ],
    });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(
      await screen.findByLabelText("50% cobrado, 0% por vencer y 50% vencido")
    ).toBeInTheDocument();
  });

  it("un mes sin cuotas lo dice en vez de mostrar ceros", async () => {
    conDatos({ invoices: [] });
    render(<OwnerWorkspace initialView="inicio" />);

    expect(
      await screen.findByText("Todavía no hay cuotas emitidas este mes.")
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
          total: 520000,
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
        cuota({ id: 1, status: "DUE", total: 478691 }),
        cuota({ id: 2, status: "DUE", total: 520000 }),
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
});
