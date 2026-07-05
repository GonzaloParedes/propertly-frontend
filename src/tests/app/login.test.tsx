import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError, AuthExpiredError } from "@/lib/api";
import LoginPage from "@/app/login/page";

const mockLogin = vi.fn();
const mockPush = vi.fn();

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

// --- Renderizado ---

describe("renderizado", () => {
  it("muestra el input de correo con su label", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
  });

  it("muestra el input de contraseña con su label", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
  });

  it("muestra el botón de ingresar", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeInTheDocument();
  });

  it("no muestra ningún error al iniciar", () => {
    render(<LoginPage />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// --- Toggle de contraseña ---

describe("toggle mostrar/ocultar contraseña", () => {
  it("el input empieza en type=password", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
  });

  it("al hacer click muestra la contraseña", async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "text");
  });

  it("al hacer click de nuevo vuelve a ocultar", async () => {
    render(<LoginPage />);
    const toggle = screen.getByRole("button", { name: "Mostrar contraseña" });
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
  });
});

// --- Login exitoso ---

describe("login exitoso", () => {
  it("llama a login con email y contraseña y redirige a /dashboard", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText("Correo electrónico"), "test@test.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "secreta123");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@test.com", "secreta123");
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("muestra 'Ingresando…' y deshabilita el formulario mientras está pendiente", async () => {
    mockLogin.mockReturnValueOnce(new Promise(() => {})); // nunca resuelve
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText("Correo electrónico"), "test@test.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "secreta123");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(screen.getByRole("button", { name: "Ingresando…" })).toBeDisabled();
    expect(screen.getByLabelText("Correo electrónico")).toBeDisabled();
    expect(screen.getByLabelText("Contraseña")).toBeDisabled();
  });
});

// --- Estados de error ---

describe("estados de error", () => {
  async function submitWithError(error: Error) {
    mockLogin.mockRejectedValueOnce(error);
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "test@test.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "secreta123");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    return screen.findByRole("alert");
  }

  it("muestra error en credenciales al recibir ApiError 401", async () => {
    const alert = await submitWithError(new ApiError(401, "Unauthorized"));
    expect(alert).toHaveTextContent("Correo o contraseña incorrectos");
  });

  it("muestra error en credenciales con AuthExpiredError", async () => {
    const alert = await submitWithError(new AuthExpiredError());
    expect(alert).toHaveTextContent("Correo o contraseña incorrectos");
  });

  it("muestra error de servidor con ApiError 500", async () => {
    const alert = await submitWithError(new ApiError(500, "Internal Server Error"));
    expect(alert).toHaveTextContent("Error del servidor");
  });

  it("muestra error genérico para errores desconocidos", async () => {
    const alert = await submitWithError(new Error("Unknown"));
    expect(alert).toHaveTextContent("Ocurrió un error inesperado");
  });

  it("rehabilita el formulario tras un error", async () => {
    await submitWithError(new ApiError(401, "Unauthorized"));
    expect(screen.getByRole("button", { name: "Ingresar" })).not.toBeDisabled();
    expect(screen.getByLabelText("Correo electrónico")).not.toBeDisabled();
  });

  it("limpia el error anterior al reenviar el formulario", async () => {
    mockLogin.mockRejectedValueOnce(new ApiError(401, "Unauthorized"));
    mockLogin.mockReturnValueOnce(new Promise(() => {}));
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText("Correo electrónico"), "test@test.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "secreta123");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    await screen.findByRole("alert");

    // Rehabilitar y reenviar
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
