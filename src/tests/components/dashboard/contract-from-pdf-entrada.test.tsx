import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreationWizard from "@/components/dashboard/CreationWizard";

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenants: { create: vi.fn(), list: vi.fn() },
    properties: { list: vi.fn(), create: vi.fn() },
    contracts: { list: vi.fn(), create: vi.fn(), onboard: vi.fn() },
    contractImports: { quota: vi.fn(), upload: vi.fn(), get: vi.fn(), retry: vi.fn(), complete: vi.fn(), discard: vi.fn(), document: vi.fn() },
    addressLookup: { autocomplete: vi.fn(), resolve: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockCuota = vi.mocked(AlquiaBackendClient.contractImports.quota);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(AlquiaBackendClient.properties.list).mockResolvedValue([]);
  vi.mocked(AlquiaBackendClient.tenants.list).mockResolvedValue([]);
  vi.mocked(AlquiaBackendClient.contracts.list).mockResolvedValue([]);
});

function abrir() {
  render(<CreationWizard kind="contract" onClose={vi.fn()} onComplete={vi.fn()} />);
}

const subir = () => screen.getByRole("radio", { name: /Subir el contrato firmado/ });
const aMano = () => screen.getByRole("radio", { name: /Cargarlo a mano/ });

describe("elegir cómo cargar el contrato", () => {
  it("«Nuevo contrato» pregunta primero: subir el contrato firmado o cargarlo a mano", async () => {
    mockCuota.mockResolvedValue({ used: 0, limit: 5, available: true });
    abrir();
    expect(screen.getByRole("heading", { name: "¿Cómo quiere cargar el contrato?" })).toBeInTheDocument();
    expect(subir()).toBeInTheDocument();
    expect(aMano()).toBeInTheDocument();
    await screen.findByText(/Le quedan 5 lecturas/);
  });

  it("con lecturas disponibles, dice cuántas le quedan", async () => {
    mockCuota.mockResolvedValue({ used: 2, limit: 5, available: true });
    abrir();
    expect(await screen.findByText(/Le quedan 3 lecturas\./)).toBeInTheDocument();
    expect(subir()).toBeEnabled();
  });

  it("con una sola lectura, lo dice en singular", async () => {
    mockCuota.mockResolvedValue({ used: 4, limit: 5, available: true });
    abrir();
    expect(await screen.findByText(/Le queda 1 lectura\./)).toBeInTheDocument();
  });

  it("sin lecturas, la opción de subir queda deshabilitada, lo explica y deja elegida la carga a mano", async () => {
    mockCuota.mockResolvedValue({ used: 5, limit: 5, available: false });
    abrir();
    expect(await screen.findByText(/Ya usó todas las lecturas que tiene disponibles/)).toBeInTheDocument();
    expect(subir()).toBeDisabled();
    await waitFor(() => expect(aMano()).toHaveAttribute("aria-checked", "true"));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    expect(screen.getByText("Paso 1 de 7")).toBeInTheDocument();
  });

  it("con la lectura apagada por el backend, dice que no está disponible y lleva a mano", async () => {
    mockCuota.mockResolvedValue({ used: 1, limit: 5, available: false });
    abrir();
    expect(await screen.findByText(/no está disponible en este momento/)).toBeInTheDocument();
    expect(subir()).toBeDisabled();
    expect(screen.queryByText(/Le quedan/)).not.toBeInTheDocument();
  });

  it("si no se pudo preguntar la cuota, ofrece subir igual y el backend decide al subir el archivo", async () => {
    mockCuota.mockRejectedValue(new Error("sin red"));
    abrir();
    await waitFor(() => expect(mockCuota).toHaveBeenCalled());
    expect(subir()).toBeEnabled();
    expect(screen.queryByText(/Le quedan/)).not.toBeInTheDocument();
  });

  it("«Cargarlo a mano» abre el asistente de siempre, en el paso 1 de 7", async () => {
    mockCuota.mockResolvedValue({ used: 0, limit: 5, available: true });
    abrir();
    await userEvent.click(aMano());
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    expect(screen.getByText("Paso 1 de 7")).toBeInTheDocument();
  });

  it("«Subir el contrato firmado» lleva a la pantalla de subida", async () => {
    mockCuota.mockResolvedValue({ used: 0, limit: 5, available: true });
    abrir();
    await userEvent.click(subir());
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    expect(screen.getByRole("heading", { name: "Suba el contrato firmado" })).toBeInTheDocument();
  });

  it("desde el primer paso a mano, «Atrás» vuelve a la elección", async () => {
    mockCuota.mockResolvedValue({ used: 0, limit: 5, available: true });
    abrir();
    await userEvent.click(aMano());
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByRole("heading", { name: "¿Cómo quiere cargar el contrato?" })).toBeInTheDocument();
  });

  it("si el contrato se abre desde una propiedad, va directo a mano: la lectura no la tendría en cuenta", async () => {
    render(<CreationWizard kind="contract" initialPropertyId={10} onClose={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.queryByRole("heading", { name: "¿Cómo quiere cargar el contrato?" })).not.toBeInTheDocument();
    expect(mockCuota).not.toHaveBeenCalled();
    await screen.findByText("Paso 2 de 7");
  });

  it("la propiedad y el inquilino sueltos no preguntan cómo cargarlos", async () => {
    render(<CreationWizard kind="tenant" onClose={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.queryByRole("heading", { name: "¿Cómo quiere cargar el contrato?" })).not.toBeInTheDocument();
    expect(mockCuota).not.toHaveBeenCalled();
  });
});
