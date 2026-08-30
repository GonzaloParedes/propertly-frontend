import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreationWizard from "@/components/dashboard/CreationWizard";
import { ApiError, AuthExpiredError } from "@/lib/api";

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: { tenants: { create: vi.fn() } },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockCreate = vi.mocked(AlquiaBackendClient.tenants.create);

// 27-24891055-6 tiene dígito verificador válido; el asistente no deja avanzar
// con uno inventado, así que los tests necesitan uno real.
const CUIT_VALIDO = "27248910556";

let onComplete: ReturnType<typeof vi.fn>;
let onClose: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  onComplete = vi.fn();
  onClose = vi.fn();
});

function renderWizard() {
  render(<CreationWizard kind="tenant" onClose={onClose} onComplete={onComplete} />);
}

async function fillAndSave({
  nombre = "Jorge",
  apellido = "Paletta",
  cuit = CUIT_VALIDO,
  correo = "jorge@ejemplo.com",
} = {}) {
  if (nombre) await userEvent.type(screen.getByLabelText("Nombre"), nombre);
  if (apellido) await userEvent.type(screen.getByLabelText("Apellido"), apellido);
  if (cuit) await userEvent.type(screen.getByLabelText("CUIT o CUIL"), cuit);
  if (correo) await userEvent.type(screen.getByLabelText("Correo electrónico"), correo);
  await userEvent.click(screen.getByRole("button", { name: "Guardar inquilino" }));
}

// --- Guardado exitoso ---

describe("guardado exitoso", () => {
  it("llama a tenants.create con los datos cargados", async () => {
    mockCreate.mockResolvedValueOnce({
      id: 1, firstName: "Jorge", lastName: "Paletta", taxId: CUIT_VALIDO, email: "jorge@ejemplo.com",
    });
    renderWizard();
    await fillAndSave();

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        firstName: "Jorge",
        lastName: "Paletta",
        taxId: CUIT_VALIDO,
        email: "jorge@ejemplo.com",
      })
    );
  });

  it("manda el CUIT sin guiones aunque en pantalla se vea formateado", async () => {
    mockCreate.mockResolvedValueOnce({
      id: 1, firstName: "Jorge", lastName: "Paletta", taxId: CUIT_VALIDO, email: "jorge@ejemplo.com",
    });
    renderWizard();
    await userEvent.type(screen.getByLabelText("CUIT o CUIL"), CUIT_VALIDO);
    expect(screen.getByLabelText("CUIT o CUIL")).toHaveValue("27-24891055-6");
    await fillAndSave({ cuit: "" });

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ taxId: "27248910556" })
      )
    );
  });

  it("avisa que terminó recién cuando el backend respondió", async () => {
    mockCreate.mockResolvedValueOnce({
      id: 1, firstName: "Jorge", lastName: "Paletta", taxId: CUIT_VALIDO, email: "jorge@ejemplo.com",
    });
    renderWizard();
    await fillAndSave();

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });
});

// --- Mientras guarda ---

describe("mientras guarda", () => {
  it("muestra «Guardando…» y no deja volver a enviar", async () => {
    mockCreate.mockReturnValueOnce(new Promise(() => {}));
    renderWizard();
    await fillAndSave();

    expect(await screen.findByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("no deja salir del asistente ni volver atrás", async () => {
    mockCreate.mockReturnValueOnce(new Promise(() => {}));
    renderWizard();
    await fillAndSave();

    await screen.findByRole("button", { name: "Guardando…" });
    expect(screen.getByRole("button", { name: "Salir del asistente" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Atrás" })).toBeDisabled();
  });
});

// --- Errores ---

describe("errores al guardar", () => {
  it("avisa cuando el CUIT ya está cargado", async () => {
    mockCreate.mockRejectedValueOnce(new ApiError(400, "Tax ID already registered"));
    renderWizard();
    await fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ese CUIT ya figura en otro inquilino suyo."
    );
  });

  it("muestra un mensaje de validación para otros 400", async () => {
    mockCreate.mockRejectedValueOnce(new ApiError(400, "Validation failed"));
    renderWizard();
    await fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent("Verifique los datos ingresados");
  });

  it("muestra un mensaje genérico ante un error de red", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Network error"));
    renderWizard();
    await fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar el inquilino");
  });

  it("avisa si la sesión expiró", async () => {
    mockCreate.mockRejectedValueOnce(new AuthExpiredError());
    renderWizard();
    await fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent("Su sesión expiró");
  });

  it("no da por terminado el alta si falló", async () => {
    mockCreate.mockRejectedValueOnce(new ApiError(500, "Boom"));
    renderWizard();
    await fillAndSave();

    await screen.findByRole("alert");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("deja reintentar después del error", async () => {
    mockCreate.mockRejectedValueOnce(new ApiError(500, "Boom"));
    renderWizard();
    await fillAndSave();

    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Guardar inquilino" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Salir del asistente" })).not.toBeDisabled();
  });
});

// --- Validación previa ---

describe("validación previa", () => {
  it("no habilita guardar hasta que los cuatro campos son válidos", async () => {
    renderWizard();
    const guardar = screen.getByRole("button", { name: "Guardar inquilino" });
    expect(guardar).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Nombre"), "Jorge");
    await userEvent.type(screen.getByLabelText("Apellido"), "Paletta");
    await userEvent.type(screen.getByLabelText("CUIT o CUIL"), CUIT_VALIDO);
    expect(guardar).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Correo electrónico"), "jorge@ejemplo.com");
    expect(guardar).not.toBeDisabled();
  });

  it("no llega al backend con un CUIT de dígito verificador inválido", async () => {
    renderWizard();
    await fillAndSave({ cuit: "27248910557" });

    expect(mockCreate).not.toHaveBeenCalled();
  });
});
