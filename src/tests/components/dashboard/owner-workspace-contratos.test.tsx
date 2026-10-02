import { render, screen, within } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";
import { ApiError } from "@/lib/api";
import type { ContractResponse } from "@/lib/backend-types";

// OwnerWorkspace nombra la cuenta desde la sesión; estas vistas no la usan.
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenants: { list: vi.fn(), create: vi.fn() },
    contracts: { list: vi.fn() },
    properties: { list: vi.fn(), create: vi.fn(), archive: vi.fn() },
    invoices: { list: vi.fn(), confirm: vi.fn() },
    payments: { create: vi.fn(), confirm: vi.fn(), reject: vi.fn(), getReceipt: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockContracts = vi.mocked(AlquiaBackendClient.contracts.list);

// El componente calcula «hoy» con el reloj real, así que las fechas de los
// fixtures se apoyan en un reloj congelado para que los estados no cambien
// según el día en que corran los tests.
const HOY = new Date("2026-09-07T12:00:00Z");

function contract(over: Partial<ContractResponse> = {}): ContractResponse {
  return {
    id: 100,
    property: { id: 10, street: "Av. Rivadavia", number: "2340", floorUnit: "5.º A",
      city: "CABA", province: "CABA", category: "APARTMENT" },
    tenant: { id: 1, firstName: "Jorge", lastName: "Paletta", taxId: "20224567899",
      email: "jorge@ejemplo.com", phoneNumber: "+5491144552210" },
    initialRentAmount: 400000, startDate: "2025-03-01", termMonths: 36, dueDay: 1,
    endDate: "2028-03-01", status: "ACTIVE", incrementMethod: "FIXED_PERCENTAGE",
    incrementFrequencyMonths: 3, incrementValue: 8, currentRent: 478691, ...over,
  };
}

function conContratos(contratos: ContractResponse[]) {
  mockContracts.mockResolvedValue(contratos);
  render(<OwnerWorkspace initialView="contratos" />);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(HOY);
});

afterEach(() => {
  vi.useRealTimers();
});

// --- carga ---

describe("carga", () => {
  it("avisa que está cargando antes de tener los contratos", () => {
    mockContracts.mockReturnValue(new Promise(() => {}));
    render(<OwnerWorkspace initialView="contratos" />);

    expect(screen.getByText("Cargando sus contratos…")).toBeInTheDocument();
    // Todavía no se sabe si va arriba o en el centro: mostrarlo para moverlo
    // después es el parpadeo que se veía al entrar a la pantalla.
    expect(screen.queryByRole("button", { name: "Nuevo contrato" })).not.toBeInTheDocument();
  });

  it("avisa si no pudo cargarlos, en vez de mostrar una lista vacía", async () => {
    mockContracts.mockRejectedValue(new ApiError(500, "Boom"));
    render(<OwnerWorkspace initialView="contratos" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar sus contratos");
  });

  it("sin contratos ofrece el paso que falta en vez de una lista vacía", async () => {
    conContratos([]);
    expect(await screen.findByText("Todavía no tiene contratos")).toBeInTheDocument();
  });

  it("vacía, ofrece un solo «Nuevo contrato» y abre el asistente", async () => {
    conContratos([]);
    await screen.findByText("Todavía no tiene contratos");

    await userEvent.click(screen.getByRole("button", { name: "Nuevo contrato" }));
    expect(await screen.findByRole("region", { name: "Asistente de nuevo contrato" })).toBeInTheDocument();
  });

  it("una sola llamada, no una por contrato", async () => {
    conContratos([contract({ id: 1 }), contract({ id: 2 })]);
    await screen.findAllByText("Av. Rivadavia 2340, 5.º A");

    expect(mockContracts).toHaveBeenCalledOnce();
  });
});

// --- la fila ---

describe("la fila", () => {
  it("dice propiedad, inquilino, cómo sube, cuándo termina y el alquiler vigente", async () => {
    conContratos([contract()]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByText("Jorge Paletta · Sube 8 % cada 3 meses · termina 01/03/2028")).toBeInTheDocument();
    // El alquiler es el vigente, no el inicial: nunca se recalcula en el front.
    expect(screen.getByText("$ 478.691")).toBeInTheDocument();
  });

  it("describe también los métodos que el asistente ya no ofrece", async () => {
    conContratos([
      contract({ id: 1, incrementMethod: "INDEX", incrementIndexName: "ICL",
        incrementValue: undefined, incrementFrequencyMonths: 6 }),
      contract({ id: 2, incrementMethod: "FIXED_AMOUNT", incrementValue: 35000,
        incrementFrequencyMonths: 6 }),
    ]);
    await screen.findAllByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByText(/Ajusta por ICL cada 6 meses/)).toBeInTheDocument();
    expect(screen.getByText(/Sube \$ 35\.000 cada 6 meses/)).toBeInTheDocument();
  });

  // Hasta que el detalle se conectó, la fila se rendía sin link para no llevar a
  // un contrato de ejemplo. Esa razón desapareció.
  it("la fila lleva al detalle del contrato", async () => {
    conContratos([contract()]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(screen.getByRole("button", { name: /Av. Rivadavia/ })).toBeInTheDocument();
  });
});

// --- estados y filtros ---

describe("estados y filtros", () => {
  const cuatro = [
    contract({ id: 1, endDate: "2028-03-01" }),
    contract({ id: 2, endDate: "2026-10-15" }),
    contract({ id: 3, status: "TERMINATED" }),
    contract({ id: 4, status: "SUPERSEDED", successorContractId: 5 }),
  ];

  it("un contrato cerca del fin se marca por terminar, y sigue contando como vigente", async () => {
    conContratos(cuatro);
    await userEvent.click(await screen.findByRole("button", { name: "Filtros" }));
    const grupo = screen.getByRole("region", { name: "Estado" });

    expect(within(grupo).getByRole("button", { name: /Vigentes/ })).toHaveTextContent("2");
    expect(within(grupo).getByRole("button", { name: /Por terminar/ })).toHaveTextContent("1");
    expect(within(grupo).getByRole("button", { name: /Finalizados/ })).toHaveTextContent("2");
  });

  it("arranca mostrando los vigentes, no todo el historial", async () => {
    conContratos(cuatro);
    await screen.findByRole("button", { name: "Filtros" });

    // El panel está cerrado, así que «Vigente» y «Por terminar» sólo pueden
    // venir de un chip de fila.
    expect(screen.getAllByText("Vigente")).toHaveLength(1);
    expect(screen.getAllByText("Por terminar")).toHaveLength(1);
    expect(screen.queryByText("Finalizado")).not.toBeInTheDocument();
  });

  // Un contrato reemplazado por un cambio de condiciones no es lo mismo que uno
  // que terminó, aunque los dos dejen de regir.
  it("el reemplazado se nombra distinto del finalizado", async () => {
    conContratos(cuatro);
    await userEvent.click(await screen.findByRole("button", { name: "Filtros" }));
    await userEvent.click(screen.getByRole("button", { name: /Finalizados/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(screen.getByText("Finalizado")).toBeInTheDocument();
    expect(screen.getByText("Reemplazado")).toBeInTheDocument();
  });

  it("avisa cuántos están por terminar en la bajada", async () => {
    conContratos(cuatro);
    expect(await screen.findByText("2 vigentes · 1 por terminar")).toBeInTheDocument();
  });

  it("si el filtro deja la lista vacía lo dice", async () => {
    conContratos([contract()]);
    await userEvent.click(await screen.findByRole("button", { name: "Filtros" }));
    await userEvent.click(screen.getByRole("button", { name: /Finalizados/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(screen.getByText("No hay contratos finalizados")).toBeInTheDocument();
  });
});

describe("búsqueda", () => {
  it("filtra por dirección y dice cuando nada coincide", async () => {
    conContratos([contract()]);
    const buscador = await screen.findByLabelText("Buscar contratos");

    await userEvent.type(buscador, "zzzz");

    expect(screen.getByText("No encontramos contratos para «zzzz»")).toBeInTheDocument();
  });
});

// --- el prototipo no puede dejar de andar ---

describe("modo demo", () => {
  it("no llama al backend", () => {
    render(<OwnerWorkspace initialView="contratos" demo />);
    expect(mockContracts).not.toHaveBeenCalled();
    expect(screen.getByText("Av. Rivadavia 2340, 5.º A")).toBeInTheDocument();
  });

  // La fila identifica por número y el detalle de la demo por texto: sin la
  // traducción, cualquier fila abría el primer contrato.
  it("cada fila abre el detalle de SU contrato, no el del primero", async () => {
    render(<OwnerWorkspace initialView="contratos" demo />);
    await userEvent.click(screen.getByRole("button", { name: /Belgrano 445/ }));

    expect(screen.getByRole("heading", { level: 1, name: "Belgrano 445, PB" })).toBeInTheDocument();
  });
});

// --- inquilino nuevo desde el asistente de contrato ---

describe("propiedad del asistente de contrato", () => {
  it("sin ninguna propiedad cargada, no dice que todas tienen contrato", async () => {
    vi.mocked(AlquiaBackendClient.properties.list).mockResolvedValue([]);
    vi.mocked(AlquiaBackendClient.tenants.list).mockResolvedValue([]);
    conContratos([]);
    await screen.findByText("Todavía no tiene contratos");

    await userEvent.click(screen.getByRole("button", { name: "Nuevo contrato" }));

    expect(await screen.findByText(/Todavía no cargó ninguna propiedad/)).toBeInTheDocument();
    expect(screen.queryByText(/ya tienen un contrato vigente/)).not.toBeInTheDocument();
  });

  it("con todas alquiladas, lo dice", async () => {
    vi.mocked(AlquiaBackendClient.properties.list).mockResolvedValue([contract().property]);
    vi.mocked(AlquiaBackendClient.tenants.list).mockResolvedValue([]);
    conContratos([contract()]);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    await userEvent.click(screen.getAllByRole("button", { name: "Nuevo contrato" })[0]);

    expect(await screen.findByText(/ya tienen un contrato vigente/)).toBeInTheDocument();
  });
});

describe("propiedad nueva desde el asistente de contrato", () => {
  async function hastaAgregarPropiedad() {
    vi.mocked(AlquiaBackendClient.properties.list).mockResolvedValue([]);
    vi.mocked(AlquiaBackendClient.tenants.list).mockResolvedValue([]);
    conContratos([]);
    await screen.findByText("Todavía no tiene contratos");
    await userEvent.click(screen.getByRole("button", { name: "Nuevo contrato" }));
    await userEvent.click(await screen.findByRole("button", { name: "Agregar una propiedad nueva" }));
    return screen.findByRole("region", { name: "Asistente de nueva propiedad" });
  }

  it("abre el asistente de propiedad desde el paso 1 y «Atrás» vuelve al contrato", async () => {
    const asistente = await hastaAgregarPropiedad();
    expect(within(asistente).getByText("Paso 1 de 4")).toBeInTheDocument();

    await userEvent.click(within(asistente).getByRole("button", { name: "Atrás" }));

    const contrato = await screen.findByRole("region", { name: "Asistente de nuevo contrato" });
    expect(within(contrato).getByText("Paso 1 de 6")).toBeInTheDocument();
  });
});

describe("inquilino nuevo desde el asistente de contrato", () => {
  async function hastaAgregarInquilino() {
    vi.mocked(AlquiaBackendClient.properties.list).mockResolvedValue([contract().property]);
    vi.mocked(AlquiaBackendClient.tenants.list).mockResolvedValue([]);
    conContratos([]);
    await screen.findByText("Todavía no tiene contratos");

    await userEvent.click(screen.getByRole("button", { name: "Nuevo contrato" }));
    await userEvent.click(await screen.findByText("Av. Rivadavia 2340, 5.º A"));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Agregar un inquilino nuevo" }));
    return screen.findByRole("region", { name: "Asistente de nuevo inquilino" });
  }

  it("abre el formulario de inquilino en un solo paso, con «Guardar inquilino» y no «Seguir»", async () => {
    const asistente = await hastaAgregarInquilino();

    // Antes quedaba en el paso 2 de un asistente de 1 paso: «Seguir» sumaba pasos y nunca guardaba.
    expect(within(asistente).getByRole("button", { name: "Guardar inquilino" })).toBeInTheDocument();
    expect(within(asistente).queryByRole("button", { name: /Seguir/ })).not.toBeInTheDocument();
  });

  it("al guardarlo vuelve al contrato en el paso del inquilino, con el nuevo elegido", async () => {
    const asistente = await hastaAgregarInquilino();
    const nuevo = { id: 7, firstName: "Ana", lastName: "Gómez", taxId: "20224567899",
      email: "ana@ejemplo.com", phoneNumber: "1144552210" };
    vi.mocked(AlquiaBackendClient.tenants.create).mockResolvedValue(nuevo);
    vi.mocked(AlquiaBackendClient.tenants.list).mockResolvedValue([nuevo]);

    await userEvent.type(within(asistente).getByLabelText("Nombre"), "Ana");
    await userEvent.type(within(asistente).getByLabelText("Apellido"), "Gómez");
    await userEvent.type(within(asistente).getByLabelText("CUIT o CUIL"), "20224567899");
    await userEvent.type(within(asistente).getByLabelText("Correo electrónico"), "ana@ejemplo.com");
    await userEvent.type(within(asistente).getByLabelText("Teléfono"), "1144552210");
    await userEvent.click(within(asistente).getByRole("button", { name: "Guardar inquilino" }));

    const contrato = await screen.findByRole("region", { name: "Asistente de nuevo contrato" });
    expect(await within(contrato).findByText("Paso 2 de 6")).toBeInTheDocument();
    expect(within(contrato).getByRole("button", { name: /Seguir/ })).toBeEnabled();
  });

  it("«Atrás» descarta el formulario y vuelve al contrato sin perder la propiedad", async () => {
    const asistente = await hastaAgregarInquilino();

    await userEvent.click(within(asistente).getByRole("button", { name: "Atrás" }));

    const contrato = await screen.findByRole("region", { name: "Asistente de nuevo contrato" });
    expect(within(contrato).getByText("Paso 2 de 6")).toBeInTheDocument();
  });
});
