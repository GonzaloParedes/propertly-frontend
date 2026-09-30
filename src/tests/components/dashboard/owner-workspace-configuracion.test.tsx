import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";
import { ApiError } from "@/lib/api";
import type { ReminderSettingsResponse, UserResponse } from "@/lib/backend-types";

const USUARIO: UserResponse = {
  id: 1,
  email: "ricardo@ejemplo.com",
  firstName: "Ricardo",
  lastName: "Rosas",
  taxId: "20224567899",
  phoneNumber: "+5491144552210",
};

const mockActualizar = vi.fn();
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: USUARIO, isLoading: false, actualizarUsuario: mockActualizar }),
}));

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenants: { list: vi.fn() },
    contracts: { list: vi.fn() },
    properties: { list: vi.fn() },
    invoices: { list: vi.fn() },
    preInvoices: { list: vi.fn() },
    users: { getReminderSettings: vi.fn(), updateReminderSettings: vi.fn(), updateMe: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockGet = vi.mocked(AlquiaBackendClient.users.getReminderSettings);
const mockUpdate = vi.mocked(AlquiaBackendClient.users.updateReminderSettings);
const mockUpdateMe = vi.mocked(AlquiaBackendClient.users.updateMe);

const AJUSTES: ReminderSettingsResponse = {
  daysBeforeDue: 7,
  dueDateReminderEnabled: true,
  daysAfterDue: 3,
  enabled: true,
};

beforeEach(() => {
  vi.resetAllMocks();
});

function abrir(ajustes: ReminderSettingsResponse = AJUSTES) {
  mockGet.mockResolvedValue(ajustes);
  render(<OwnerWorkspace initialView="configuracion" />);
}

// --- Recordatorios ---

describe("recordatorios", () => {
  it("muestra los tres valores vigentes", async () => {
    abrir();
    expect(await screen.findByText("7 días")).toBeInTheDocument();
    expect(screen.getByText("Se avisa")).toBeInTheDocument();
    expect(screen.getByText("3 días")).toBeInTheDocument();
  });

  it("apagados lo dice en vez de listar días que no se envían", async () => {
    abrir({ ...AJUSTES, enabled: false });
    expect(await screen.findByText(/están desactivados/)).toBeInTheDocument();
  });

  // No depende del interruptor: sale igual. Por eso se nombra aparte.
  it("nombra el aviso de cuota confirmada", async () => {
    abrir();
    expect(await screen.findByText(/cuando usted confirma una cuota/)).toBeInTheDocument();
  });

  it("avisa si no se pudieron cargar, sin inventar valores", async () => {
    mockGet.mockRejectedValue(new ApiError(500, "Boom"));
    render(<OwnerWorkspace initialView="configuracion" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos cargar los recordatorios"
    );
    expect(screen.queryByText("7 días")).not.toBeInTheDocument();
  });

  it("aunque fallen, la tarjeta de cuenta se muestra igual", async () => {
    mockGet.mockRejectedValue(new ApiError(500, "Boom"));
    render(<OwnerWorkspace initialView="configuracion" />);

    expect(await screen.findByText("Ricardo Rosas")).toBeInTheDocument();
  });
});

describe("editar recordatorios", () => {
  async function abrirDialogo() {
    abrir();
    await userEvent.click(await screen.findByRole("button", { name: "Editar recordatorios" }));
    return screen.getByRole("dialog");
  }

  it("guarda el cambio y lo confirma", async () => {
    mockUpdate.mockResolvedValue({ ...AJUSTES, daysBeforeDue: 8 });
    const dialogo = await abrirDialogo();

    await userEvent.click(within(dialogo).getByRole("button", { name: /Sumar días antes/ }));
    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ ...AJUSTES, daysBeforeDue: 8 }));
    expect(await screen.findByText("Recordatorios guardados.")).toBeInTheDocument();
  });

  it("apagar los avisos esconde los días, que dejan de aplicar", async () => {
    const dialogo = await abrirDialogo();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Recordatorios activos" }));

    expect(within(dialogo).queryByRole("button", { name: /Sumar días antes/ })).not.toBeInTheDocument();
  });

  it("no deja pasar del máximo que acepta el backend", async () => {
    const dialogo = await abrirDialogo();
    const sumar = within(dialogo).getByRole("button", { name: /Sumar días antes/ });

    for (let i = 0; i < 40; i += 1) await userEvent.click(sumar);

    expect(within(dialogo).getAllByText("30").length).toBeGreaterThan(0);
    expect(sumar).toBeDisabled();
  });

  it("cancelar descarta los cambios", async () => {
    const dialogo = await abrirDialogo();

    await userEvent.click(within(dialogo).getByRole("button", { name: /Sumar días antes/ }));
    await userEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(screen.getByText("7 días")).toBeInTheDocument();
  });

  it("si falla, lo avisa y conserva lo escrito", async () => {
    mockUpdate.mockRejectedValue(new ApiError(500, "Boom"));
    const dialogo = await abrirDialogo();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar los recordatorios"
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

// --- Cuenta ---

describe("cuenta", () => {
  it("muestra nombre, correo, CUIT y teléfono", async () => {
    abrir();
    expect(await screen.findByText("Ricardo Rosas")).toBeInTheDocument();
    expect(screen.getByText("ricardo@ejemplo.com")).toBeInTheDocument();
    expect(screen.getByText("20-22456789-9")).toBeInTheDocument();
    expect(screen.getByText("+5491144552210")).toBeInTheDocument();
  });

  // No existe como preferencia del usuario: la moneda es del contrato.
  it("no afirma una moneda operativa de la cuenta", async () => {
    abrir();
    await screen.findByText("Ricardo Rosas");
    expect(screen.queryByText(/Moneda operativa/)).not.toBeInTheDocument();
  });
});

describe("editar datos", () => {
  async function abrirDialogo() {
    abrir();
    await userEvent.click(await screen.findByRole("button", { name: "Editar datos" }));
    return screen.getByRole("dialog");
  }

  it("manda el objeto completo aunque se cambie un solo campo", async () => {
    mockUpdateMe.mockResolvedValue({ ...USUARIO, phoneNumber: "+5491155667788" });
    const dialogo = await abrirDialogo();

    const telefono = within(dialogo).getByLabelText("Teléfono");
    await userEvent.clear(telefono);
    await userEvent.type(telefono, "1155667788");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(mockUpdateMe).toHaveBeenCalledWith({
        firstName: "Ricardo",
        lastName: "Rosas",
        taxId: "20224567899",
        phoneNumber: "1155667788",
      })
    );
  });

  it("refresca la sesión, para que el saludo y la barra se actualicen", async () => {
    const actualizado = { ...USUARIO, firstName: "Ricardo José" };
    mockUpdateMe.mockResolvedValue(actualizado);
    const dialogo = await abrirDialogo();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockActualizar).toHaveBeenCalledWith(actualizado));
  });

  it("no deja guardar con un CUIT inválido", async () => {
    const dialogo = await abrirDialogo();

    const cuit = within(dialogo).getByLabelText("CUIT o CUIL");
    await userEvent.clear(cuit);
    await userEvent.type(cuit, "20224567890");

    expect(within(dialogo).getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  // El backend ya normaliza bien un teléfono con el 0 de la característica
  // (verificado en vivo el 28/09/2026), así que dejó de ser un caso a rechazar.
  it("acepta el teléfono con el cero de la característica", async () => {
    mockUpdateMe.mockResolvedValueOnce({ ...USUARIO, phoneNumber: "+5491144552210" });
    const dialogo = await abrirDialogo();

    const telefono = within(dialogo).getByLabelText("Teléfono");
    await userEvent.clear(telefono);
    await userEvent.type(telefono, "01144552210");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(mockUpdateMe).toHaveBeenCalledWith(
        expect.objectContaining({ phoneNumber: "01144552210" })
      )
    );
  });

  it("no deja guardar con el nombre vacío", async () => {
    const dialogo = await abrirDialogo();

    await userEvent.clear(within(dialogo).getByLabelText("Nombre"));

    expect(within(dialogo).getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("el correo se muestra pero no se edita", async () => {
    const dialogo = await abrirDialogo();

    expect(within(dialogo).getByText(/no se puede cambiar desde acá/)).toBeInTheDocument();
    expect(within(dialogo).queryByLabelText(/Correo/)).not.toBeInTheDocument();
  });

  it("si falla, lo avisa y conserva lo escrito", async () => {
    mockUpdateMe.mockRejectedValue(new ApiError(400, "Validation failed"));
    const dialogo = await abrirDialogo();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Verifique los datos ingresados");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
