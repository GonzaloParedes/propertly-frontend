import { render, screen, waitFor, within } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";
import { ApiError } from "@/lib/api";
import { ERROR } from "@/lib/error-codes";
import type { ContractResponse, InvoiceResponse, TenantResponse } from "@/lib/backend-types";

// OwnerWorkspace nombra la cuenta desde la sesión; estas vistas no la usan.
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenants: { list: vi.fn(), create: vi.fn(), update: vi.fn(), archive: vi.fn() },
    contracts: { list: vi.fn(), getTenantAccess: vi.fn() },
    properties: { list: vi.fn(), archive: vi.fn() },
    users: { getReminderSettings: vi.fn() },
    invoices: { list: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockTenants = vi.mocked(AlquiaBackendClient.tenants.list);
const mockCreateTenant = vi.mocked(AlquiaBackendClient.tenants.create);
const mockContracts = vi.mocked(AlquiaBackendClient.contracts.list);
const mockInvoices = vi.mocked(AlquiaBackendClient.invoices.list);

const JORGE = { id: 1, firstName: "Jorge", lastName: "Paletta", taxId: "20224567899", email: "jorge@ejemplo.com", phoneNumber: "+5491144552210" };
const MARTA = { id: 2, firstName: "Marta", lastName: "Suárez", taxId: "27248910556", email: "marta@ejemplo.com", phoneNumber: "+5491155667788" };

const CONTRATO_JORGE = {
  id: 100,
  property: { id: 10, street: "Av. Rivadavia", number: "2340", floorUnit: "5.º A", city: "CABA", province: "CABA", category: "APARTMENT" as const },
  tenant: JORGE,
  initialRentAmount: 400000, startDate: "2025-03-01", termMonths: 36, endDate: "2028-02-29",
  status: "ACTIVE" as const, incrementMethod: "FIXED_PERCENTAGE" as const,
  incrementFrequencyMonths: 3, currentRent: 478691, dueDay: 1,
};

beforeEach(() => {
  vi.resetAllMocks();
});

function conDatos({
  tenants = [JORGE],
  contracts = [CONTRATO_JORGE],
  invoices = [],
}: {
  tenants?: TenantResponse[];
  contracts?: ContractResponse[];
  invoices?: InvoiceResponse[];
} = {}) {
  mockTenants.mockResolvedValue(tenants);
  mockContracts.mockResolvedValue(contracts);
  mockInvoices.mockResolvedValue(invoices);
}

// --- Carga ---

describe("carga", () => {
  it("avisa que está cargando antes de tener los datos", () => {
    mockTenants.mockReturnValue(new Promise(() => {}));
    mockContracts.mockReturnValue(new Promise(() => {}));
    mockInvoices.mockReturnValue(new Promise(() => {}));
    render(<OwnerWorkspace initialView="inquilinos" />);

    expect(screen.getByText("Cargando sus inquilinos…")).toBeInTheDocument();
    // Todavía no se sabe si va arriba o en el centro: mostrarlo para moverlo
    // después es el parpadeo que se veía al entrar a la pantalla.
    expect(screen.queryByRole("button", { name: "Agregar inquilino" })).not.toBeInTheDocument();
  });

  it("pide las tres listas en paralelo, no una por inquilino", async () => {
    conDatos({ tenants: [JORGE, MARTA] });
    render(<OwnerWorkspace initialView="inquilinos" />);
    await screen.findByText("Jorge Paletta");

    expect(mockTenants).toHaveBeenCalledOnce();
    expect(mockContracts).toHaveBeenCalledOnce();
    expect(mockInvoices).toHaveBeenCalledOnce();
  });

  it("no pide nada si la pantalla no es la de inquilinos", () => {
    conDatos();
    render(<OwnerWorkspace initialView="propiedades" />);

    expect(mockTenants).not.toHaveBeenCalled();
  });
});

// --- Modo demo (/prototipo) ---

describe("modo demo", () => {
  it("no llama al backend: la ruta del prototipo no tiene sesión", () => {
    conDatos();
    render(<OwnerWorkspace initialView="inquilinos" demo />);

    expect(mockTenants).not.toHaveBeenCalled();
    expect(mockContracts).not.toHaveBeenCalled();
    expect(mockInvoices).not.toHaveBeenCalled();
  });

  it("muestra los inquilinos de ejemplo en vez de quedarse cargando", () => {
    conDatos();
    render(<OwnerWorkspace initialView="inquilinos" demo />);

    expect(screen.getByText("Jorge Paletta")).toBeInTheDocument();
    expect(screen.queryByText("Cargando sus inquilinos…")).not.toBeInTheDocument();
  });

  it("incluye un inquilino sin contrato, que también es parte del diseño", () => {
    conDatos();
    render(<OwnerWorkspace initialView="inquilinos" demo />);

    expect(screen.getByText("Sin contrato")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear contrato" })).toBeInTheDocument();
  });
});

describe("modo demo · avisos", () => {
  it("al terminar el asistente de inquilino vuelve al listado y lo confirma", async () => {
    conDatos();
    render(<OwnerWorkspace initialView="inquilinos" demo />);

    await userEvent.click(screen.getByRole("button", { name: "Agregar inquilino" }));
    await userEvent.type(screen.getByLabelText("Nombre"), "Lucía");
    await userEvent.type(screen.getByLabelText("Apellido"), "Gómez");
    await userEvent.type(screen.getByLabelText("CUIT o CUIL"), "27248910556");
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "lucia@ejemplo.com");
    await userEvent.type(screen.getByLabelText("Teléfono"), "1144552210");
    await userEvent.click(screen.getByRole("button", { name: "Guardar inquilino" }));

    expect(await screen.findByText(/Inquilino agregado/)).toBeInTheDocument();
    expect(screen.getByText("Jorge Paletta")).toBeInTheDocument();
  });
});

describe("alta de inquilino", () => {
  it("vuelve a pedir el listado y muestra al inquilino recién creado", async () => {
    mockTenants.mockResolvedValueOnce([]).mockResolvedValueOnce([JORGE]);
    mockContracts.mockResolvedValue([]);
    mockInvoices.mockResolvedValue([]);
    mockCreateTenant.mockResolvedValue(JORGE);
    render(<OwnerWorkspace initialView="inquilinos" />);

    await screen.findByText("Todavía no cargó ningún inquilino");
    await userEvent.click(screen.getByRole("button", { name: "Agregar inquilino" }));
    await userEvent.type(screen.getByLabelText("Nombre"), "Jorge");
    await userEvent.type(screen.getByLabelText("Apellido"), "Paletta");
    await userEvent.type(screen.getByLabelText("CUIT o CUIL"), "20224567899");
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "jorge@ejemplo.com");
    await userEvent.type(screen.getByLabelText("Teléfono"), "1144552210");
    await userEvent.click(screen.getByRole("button", { name: "Guardar inquilino" }));

    expect(await screen.findByText("Jorge Paletta")).toBeInTheDocument();
    expect(mockTenants).toHaveBeenCalledTimes(2);
  });
});

// --- Filas ---

describe("filas", () => {
  it("muestra nombre, documento, correo, dirección y alquiler", async () => {
    conDatos({ invoices: [{ id: 1000, contractId: 100, period: "2026-08-01", dueDate: "2026-08-01", baseAmount: 478691, total: 478691, status: "DUE" as const, confirmed: true, adjustments: [], payments: [] }] });
    render(<OwnerWorkspace initialView="inquilinos" />);

    const fila = (await screen.findByText("Jorge Paletta")).closest(".owner-row") as HTMLElement;
    expect(within(fila).getByText(/20-22456789-9/)).toBeInTheDocument();
    expect(within(fila).getByText(/jorge@ejemplo\.com/)).toBeInTheDocument();
    expect(within(fila).getByText(/Av\. Rivadavia 2340, 5\.º A/)).toBeInTheDocument();
    expect(within(fila).getByText("$ 478.691")).toBeInTheDocument();
    expect(within(fila).getByText("Vencida")).toBeInTheDocument();
  });

  it("el inquilino sin contrato ofrece crearlo y no muestra monto", async () => {
    conDatos({ tenants: [MARTA], contracts: [] });
    render(<OwnerWorkspace initialView="inquilinos" />);

    const fila = (await screen.findByText("Marta Suárez")).closest(".owner-row") as HTMLElement;
    expect(within(fila).getByText("Sin contrato")).toBeInTheDocument();
    expect(within(fila).getByRole("button", { name: "Crear contrato" })).toBeInTheDocument();
    expect(within(fila).queryByText("por mes")).not.toBeInTheDocument();
  });

  it("el nombre del inquilino sin contrato sigue abriendo su detalle", async () => {
    conDatos({ tenants: [MARTA], contracts: [] });
    render(<OwnerWorkspace initialView="inquilinos" />);

    await userEvent.click(await screen.findByRole("button", { name: "Marta Suárez" }));

    expect(await screen.findByText("Todavía no tiene un contrato")).toBeInTheDocument();
  });
});

// --- Bajada de la cabecera ---

describe("bajada de la cabecera", () => {
  it("cuenta los inquilinos y avisa cuántos no tienen contrato", async () => {
    conDatos({ tenants: [JORGE, MARTA] });
    render(<OwnerWorkspace initialView="inquilinos" />);

    expect(await screen.findByText("2 inquilinos · 1 sin contrato")).toBeInTheDocument();
  });

  it("no afirma nada sobre contratos si todos tienen", async () => {
    conDatos({ tenants: [JORGE] });
    render(<OwnerWorkspace initialView="inquilinos" />);

    expect(await screen.findByText("1 inquilino")).toBeInTheDocument();
  });
});

// --- Lista vacía y error ---

describe("lista vacía y error", () => {
  it("invita a cargar el primero cuando no hay ninguno", async () => {
    conDatos({ tenants: [], contracts: [] });
    render(<OwnerWorkspace initialView="inquilinos" />);

    expect(await screen.findByText("Todavía no cargó ningún inquilino")).toBeInTheDocument();
  });

  it("vacía, ofrece un solo «Agregar inquilino» y abre el asistente", async () => {
    conDatos({ tenants: [], contracts: [] });
    render(<OwnerWorkspace initialView="inquilinos" />);

    await screen.findByText("Todavía no cargó ningún inquilino");
    await userEvent.click(screen.getByRole("button", { name: "Agregar inquilino" }));
    expect(await screen.findByRole("region", { name: "Asistente de nuevo inquilino" })).toBeInTheDocument();
  });

  it("avisa si alguna de las llamadas falla", async () => {
    mockTenants.mockResolvedValue([JORGE]);
    mockContracts.mockRejectedValue(new Error("Network error"));
    mockInvoices.mockResolvedValue([]);
    render(<OwnerWorkspace initialView="inquilinos" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar sus inquilinos");
  });
});

// --- Detalle ---

describe("detalle", () => {
  it("muestra el contrato vigente del inquilino", async () => {
    conDatos();
    render(<OwnerWorkspace initialView="inquilinos" />);

    await userEvent.click(await screen.findByText("Jorge Paletta"));

    expect(await screen.findByText("Av. Rivadavia 2340, 5.º A")).toBeInTheDocument();
    expect(screen.getByText(/\$ 478\.691 por mes/)).toBeInTheDocument();
  });

  it("no ofrece el enlace de comprobantes a quien no tiene contrato", async () => {
    conDatos({ tenants: [MARTA], contracts: [] });
    render(<OwnerWorkspace initialView="inquilinos" />);

    await userEvent.click(await screen.findByRole("button", { name: "Marta Suárez" }));

    await screen.findByText("Todavía no tiene un contrato");
    expect(screen.queryByText("Acceso de pago")).not.toBeInTheDocument();
  });
});

// --- Lo que le faltaba al detalle: editar, archivar y el enlace ---

describe("detalle · editar datos", () => {
  const mockUpdate = vi.mocked(AlquiaBackendClient.tenants.update);

  async function abrirEdicion() {
    conDatos();
    render(<OwnerWorkspace initialView="inquilinos" />);
    await userEvent.click(await screen.findByText("Jorge Paletta"));
    await userEvent.click(await screen.findByRole("button", { name: /Editar datos/ }));
    return screen.getByRole("dialog");
  }

  it("muestra también el teléfono en la bajada", async () => {
    conDatos();
    render(<OwnerWorkspace initialView="inquilinos" />);
    await userEvent.click(await screen.findByText("Jorge Paletta"));

    expect(await screen.findByText(/\+5491144552210/)).toBeInTheDocument();
  });

  it("abre con los datos cargados y guarda el objeto completo", async () => {
    mockUpdate.mockResolvedValueOnce(JORGE);
    const dialogo = await abrirEdicion();

    const correo = within(dialogo).getByLabelText("Correo electrónico");
    await userEvent.clear(correo);
    await userEvent.type(correo, "jorge.nuevo@ejemplo.com");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(1, {
        firstName: "Jorge",
        lastName: "Paletta",
        taxId: "20224567899",
        email: "jorge.nuevo@ejemplo.com",
        // En dígitos, como el alta: el patrón del backend admite un solo
        // separador, y su normalizador reconstruye el +549 igual.
        phoneNumber: "5491144552210",
      })
    );
  });

  it("no deja guardar con un documento inválido", async () => {
    const dialogo = await abrirEdicion();

    const cuit = within(dialogo).getByLabelText("CUIT o CUIL");
    await userEvent.clear(cuit);
    await userEvent.type(cuit, "20224567890");

    expect(within(dialogo).getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("no deja guardar con un correo inválido", async () => {
    const dialogo = await abrirEdicion();

    const correo = within(dialogo).getByLabelText("Correo electrónico");
    await userEvent.clear(correo);
    await userEvent.type(correo, "no-es-un-correo");

    expect(within(dialogo).getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("explica el documento duplicado, que es lo que el propietario puede resolver", async () => {
    mockUpdate.mockRejectedValueOnce(
      new ApiError(409, "Tax ID already registered", ERROR.DUPLICATE_TAX_ID)
    );
    const dialogo = await abrirEdicion();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ese documento ya figura en otro inquilino suyo"
    );
  });
});

describe("detalle · acceso y contrato", () => {
  const mockAccess = vi.mocked(AlquiaBackendClient.contracts.getTenantAccess);

  async function abrirDetalle() {
    conDatos();
    render(<OwnerWorkspace initialView="inquilinos" />);
    await userEvent.click(await screen.findByText("Jorge Paletta"));
    await screen.findByText("Contrato vigente");
  }

  it("copia el enlace real del contrato", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    mockAccess.mockResolvedValueOnce({ url: "http://localhost:3000/tenant-portal?token=abc" });
    await abrirDetalle();

    await userEvent.click(screen.getByRole("button", { name: /Copiar enlace/ }));

    await waitFor(() => expect(mockAccess).toHaveBeenCalledWith(100));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "http://localhost:3000/tenant-portal?token=abc"
    );
  });

  // Sin endpoint detrás, y el spec del portal la dejó fuera de alcance.
  it("no promete revocar ni regenerar el enlace", async () => {
    await abrirDetalle();
    expect(screen.queryByText(/revocar y regenerar/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Administrar" })).not.toBeInTheDocument();
  });

  it("el resumen del contrato lleva a su detalle", async () => {
    await abrirDetalle();
    const callout = screen.getByText("Av. Rivadavia 2340, 5.º A").closest("button");
    expect(callout).toBeInTheDocument();
  });

  it("un inquilino sin contrato no muestra la sección de acceso", async () => {
    conDatos({ tenants: [MARTA], contracts: [] });
    render(<OwnerWorkspace initialView="inquilinos" />);
    await userEvent.click(await screen.findByRole("button", { name: "Marta Suárez" }));

    expect(await screen.findByText("Todavía no tiene un contrato")).toBeInTheDocument();
    expect(screen.queryByText("Acceso de pago")).not.toBeInTheDocument();
  });
});

describe("detalle · archivar", () => {
  const mockArchive = vi.mocked(AlquiaBackendClient.tenants.archive);

  async function abrirDialogo() {
    conDatos({ tenants: [MARTA], contracts: [] });
    render(<OwnerWorkspace initialView="inquilinos" />);
    await userEvent.click(await screen.findByRole("button", { name: "Marta Suárez" }));
    await userEvent.click(await screen.findByRole("button", { name: /Archivar/ }));
    return screen.getByRole("dialog");
  }

  it("aclara que su historia se conserva", async () => {
    const dialogo = await abrirDialogo();

    expect(within(dialogo).getByText(/se conserva/)).toBeInTheDocument();
    expect(mockArchive).not.toHaveBeenCalled();
  });

  it("archiva y vuelve a pedir la lista", async () => {
    mockArchive.mockResolvedValueOnce(MARTA);
    const dialogo = await abrirDialogo();
    mockTenants.mockResolvedValue([]);

    await userEvent.click(within(dialogo).getByRole("button", { name: "Archivar" }));

    await waitFor(() => expect(mockArchive).toHaveBeenCalledWith(2));
    expect(await screen.findByText("Todavía no cargó ningún inquilino")).toBeInTheDocument();
    expect(await screen.findByText(/Inquilino archivado/)).toBeInTheDocument();
  });

  it("explica el 409 y el inquilino sigue en la lista", async () => {
    mockArchive.mockRejectedValueOnce(new ApiError(409, "Request violates a data constraint"));
    const dialogo = await abrirDialogo();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Archivar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se puede archivar: el inquilino tiene datos asociados"
    );
  });
});
