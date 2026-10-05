import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmarCorreoPage from "@/app/confirmar-correo/page";
import { ApiError } from "@/lib/api";
import { ERROR } from "@/lib/error-codes";

// El mock global de setup.tsx devuelve siempre un URLSearchParams vacío; acá hace
// falta controlar el token de la URL, así que se pisa next/navigation por archivo.
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/confirmar-correo",
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    auth: { confirmEmail: vi.fn(), resendVerification: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockConfirmEmail = vi.mocked(AlquiaBackendClient.auth.confirmEmail);
const mockResendVerification = vi.mocked(AlquiaBackendClient.auth.resendVerification);

beforeEach(() => {
  vi.resetAllMocks();
  searchParams = new URLSearchParams();
});

describe("sin token en la URL", () => {
  it("no llama al backend y ofrece reenviar el enlace", () => {
    render(<ConfirmarCorreoPage />);
    expect(mockConfirmEmail).not.toHaveBeenCalled();
    expect(screen.getByText("No pudimos verificar tu correo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reenviar enlace" })).toBeInTheDocument();
  });
});

describe("con token en la URL", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams("token=abc123");
  });

  it("confirma el correo con el token y muestra el estado de éxito", async () => {
    mockConfirmEmail.mockResolvedValueOnce(undefined);
    render(<ConfirmarCorreoPage />);

    await waitFor(() =>
      expect(mockConfirmEmail).toHaveBeenCalledWith({ token: "abc123" })
    );
    expect(await screen.findByText("¡Correo verificado!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al inicio de sesión" })).toBeInTheDocument();
  });

  it("muestra el mensaje de enlace vencido ante un token inválido", async () => {
    mockConfirmEmail.mockRejectedValueOnce(
      new ApiError(400, "Bad Request", ERROR.INVALID_OR_EXPIRED_TOKEN)
    );
    render(<ConfirmarCorreoPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("El enlace venció o no es válido");
    expect(screen.getByRole("button", { name: "Reenviar enlace" })).toBeInTheDocument();
  });

  it("permite reenviar el enlace desde el estado de error", async () => {
    mockConfirmEmail.mockRejectedValueOnce(
      new ApiError(400, "Bad Request", ERROR.INVALID_OR_EXPIRED_TOKEN)
    );
    mockResendVerification.mockResolvedValueOnce(undefined);
    render(<ConfirmarCorreoPage />);

    await screen.findByRole("button", { name: "Reenviar enlace" });
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "owner@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Reenviar enlace" }));

    await waitFor(() =>
      expect(mockResendVerification).toHaveBeenCalledWith({ email: "owner@example.com" })
    );
    expect(
      await screen.findByText(/te enviamos un enlace nuevo/i)
    ).toBeInTheDocument();
  });
});
