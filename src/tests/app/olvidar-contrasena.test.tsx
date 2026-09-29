import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OlvidarContrasenaPage from "@/app/olvidar-contrasena/page";

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: { auth: { forgotPassword: vi.fn() } },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockForgotPassword = vi.mocked(AlquiaBackendClient.auth.forgotPassword);

beforeEach(() => {
  vi.resetAllMocks();
});

async function fillAndSubmit(email = "maria@ejemplo.com") {
  await userEvent.type(screen.getByLabelText("Correo electrónico"), email);
  await userEvent.click(screen.getByRole("button", { name: "Enviar enlace" }));
}

// --- Renderizado ---

describe("renderizado", () => {
  it("muestra el campo de correo y el botón de envío", () => {
    render(<OlvidarContrasenaPage />);
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar enlace" })).toBeInTheDocument();
  });

  it("no muestra el estado de éxito al cargar", () => {
    render(<OlvidarContrasenaPage />);
    expect(screen.queryByText("Revise su correo")).not.toBeInTheDocument();
  });
});

// --- Envío exitoso ---

describe("envío exitoso", () => {
  it("llama a forgotPassword con el correo ingresado", async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined);
    render(<OlvidarContrasenaPage />);
    await fillAndSubmit("maria@ejemplo.com");

    await waitFor(() =>
      expect(mockForgotPassword).toHaveBeenCalledWith({ email: "maria@ejemplo.com" })
    );
  });

  it("muestra el estado de éxito después de la respuesta", async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined);
    render(<OlvidarContrasenaPage />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByText("Revise su correo")).toBeInTheDocument()
    );
  });

  it("muestra «Enviando…» y deshabilita el campo mientras está pendiente", async () => {
    mockForgotPassword.mockReturnValueOnce(new Promise(() => {}));
    render(<OlvidarContrasenaPage />);
    await fillAndSubmit();

    expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled();
    expect(screen.getByLabelText("Correo electrónico")).toBeDisabled();
  });
});

// --- Estado de error ---

describe("estado de error", () => {
  it("muestra un alerta genérico si la llamada falla", async () => {
    mockForgotPassword.mockRejectedValueOnce(new Error("Network error"));
    render(<OlvidarContrasenaPage />);
    await fillAndSubmit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Ocurrió un error inesperado");
  });

  it("vuelve a habilitar el formulario después de un error", async () => {
    mockForgotPassword.mockRejectedValueOnce(new Error("Network error"));
    render(<OlvidarContrasenaPage />);
    await fillAndSubmit();

    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Enviar enlace" })).not.toBeDisabled();
  });
});
