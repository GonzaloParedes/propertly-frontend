import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RestablecerContrasenaPage from "@/app/restablecer-contrasena/page";
import { ApiError } from "@/lib/api";

// El mock global de setup.tsx devuelve siempre un URLSearchParams vacío; acá hace
// falta controlar el token de la URL, así que se pisa next/navigation por archivo.
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/restablecer-contrasena",
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: { auth: { resetPassword: vi.fn() } },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockResetPassword = vi.mocked(AlquiaBackendClient.auth.resetPassword);

beforeEach(() => {
  vi.resetAllMocks();
  searchParams = new URLSearchParams();
});

async function fillAndSubmit({ password = "secreta123", confirm = "secreta123" } = {}) {
  await userEvent.type(screen.getByLabelText("Nueva contraseña"), password);
  await userEvent.type(screen.getByLabelText("Confirmar contraseña"), confirm);
  await userEvent.click(screen.getByRole("button", { name: "Guardar nueva contraseña" }));
}

// --- Sin token en la URL ---

describe("sin token en la URL", () => {
  it("muestra «Enlace inválido» y no renderiza el formulario", () => {
    render(<RestablecerContrasenaPage />);
    expect(screen.getByText("Enlace inválido")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
  });
});

// --- Con token válido ---

describe("con token válido", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams("token=abc123");
  });

  it("llama a resetPassword con el token y la contraseña nueva", async () => {
    mockResetPassword.mockResolvedValueOnce(undefined);
    render(<RestablecerContrasenaPage />);
    await fillAndSubmit({ password: "secreta123", confirm: "secreta123" });

    await waitFor(() =>
      expect(mockResetPassword).toHaveBeenCalledWith({
        token: "abc123",
        newPassword: "secreta123",
      })
    );
  });

  it("muestra el estado de éxito después de la respuesta", async () => {
    mockResetPassword.mockResolvedValueOnce(undefined);
    render(<RestablecerContrasenaPage />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByText("Contraseña actualizada")).toBeInTheDocument()
    );
  });

  it("no llama al backend si las contraseñas no coinciden", async () => {
    render(<RestablecerContrasenaPage />);
    await fillAndSubmit({ password: "secreta123", confirm: "otraClave1" });

    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it("no llama al backend si la contraseña es demasiado corta", async () => {
    render(<RestablecerContrasenaPage />);
    await fillAndSubmit({ password: "abc", confirm: "abc" });

    expect(
      await screen.findByText("La contraseña debe tener al menos 8 caracteres.")
    ).toBeInTheDocument();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it("muestra el mensaje de enlace inválido/expirado ante un ApiError 400", async () => {
    mockResetPassword.mockRejectedValueOnce(new ApiError(400, "Bad Request"));
    render(<RestablecerContrasenaPage />);
    await fillAndSubmit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("El enlace es inválido o ya expiró");
  });

  it("muestra un mensaje genérico ante otros errores", async () => {
    mockResetPassword.mockRejectedValueOnce(new Error("Network error"));
    render(<RestablecerContrasenaPage />);
    await fillAndSubmit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Ocurrió un error inesperado");
  });

  it("vuelve a habilitar el formulario después de un error", async () => {
    mockResetPassword.mockRejectedValueOnce(new ApiError(400, "Bad Request"));
    render(<RestablecerContrasenaPage />);
    await fillAndSubmit();

    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Guardar nueva contraseña" })).not.toBeDisabled();
  });
});
