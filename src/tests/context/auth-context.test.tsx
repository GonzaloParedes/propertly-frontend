import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { ApiError, apiGet } from "@/lib/api";

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    auth: { login: vi.fn(), logout: vi.fn() },
    users: { getMe: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockGetMe = vi.mocked(AlquiaBackendClient.users.getMe);
const mockLogin = vi.mocked(AlquiaBackendClient.auth.login);
const mockLogout = vi.mocked(AlquiaBackendClient.auth.logout);

// La sesión es el usuario entero, no sólo el correo: el nombre alimenta el
// saludo de Inicio y la tarjeta Cuenta de Configuración.
const USUARIO = {
  id: 1,
  email: "test@test.com",
  firstName: "Ricardo",
  lastName: "Rosas",
  taxId: "20224567899",
  phoneNumber: "+5491144552210",
};

function TestConsumer() {
  const { user, isLoading, login, logout } = useAuth();
  if (isLoading) return <p>Cargando</p>;
  return (
    <div>
      <p>{user ? `Sesión: ${user.firstName} ${user.lastName} (${user.email})` : "Sin sesión"}</p>
      {/* Los handlers capturan el error para que no sea unhandled en tests */}
      <button onClick={() => void login("a@a.com", "123").catch(() => {})}>Login</button>
      <button onClick={() => void logout().catch(() => {})}>Logout</button>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

const SESION = "Sesión: Ricardo Rosas (test@test.com)";

beforeEach(() => {
  vi.resetAllMocks();
});

// --- Carga inicial ---

describe("carga inicial", () => {
  it("muestra estado de carga antes de que resuelva la verificación de sesión", () => {
    mockGetMe.mockReturnValueOnce(new Promise(() => {})); // nunca resuelve
    renderAuth();
    expect(screen.getByText("Cargando")).toBeInTheDocument();
  });

  it("muestra el usuario completo cuando hay sesión", async () => {
    mockGetMe.mockResolvedValueOnce(USUARIO);
    renderAuth();
    await waitFor(() => expect(screen.getByText(SESION)).toBeInTheDocument());
  });

  it("verifica la sesión con la renovación habilitada al volver a abrir la app", async () => {
    mockGetMe.mockRejectedValueOnce(new Error("401"));
    renderAuth();
    await waitFor(() => expect(screen.getByText("Sin sesión")).toBeInTheDocument());
    expect(mockGetMe).toHaveBeenCalledWith();
  });

  it("quita el contenido autenticado cuando ya no puede renovar la sesión", async () => {
    mockGetMe.mockResolvedValueOnce(USUARIO);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(new Response("", { status: 401 })));
    renderAuth();
    await waitFor(() => expect(screen.getByText(SESION)).toBeInTheDocument());

    await act(async () => {
      await apiGet("/properties").catch(() => {});
    });

    await waitFor(() => expect(screen.getByText("Sin sesión")).toBeInTheDocument());
  });
});

// --- login() ---

describe("login()", () => {
  it("llama a la API y actualiza el usuario en pantalla", async () => {
    mockGetMe.mockRejectedValueOnce(new Error("401")); // verificación inicial → sin sesión
    mockLogin.mockResolvedValueOnce(undefined);
    mockGetMe.mockResolvedValueOnce(USUARIO); // tras el login → usuario

    renderAuth();
    await waitFor(() => screen.getByText("Sin sesión"));

    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(screen.getByText(SESION)).toBeInTheDocument());
    expect(mockLogin).toHaveBeenCalledWith({ email: "a@a.com", password: "123" });
  });
});

// --- logout() ---

describe("logout()", () => {
  it("cierra la sesión y limpia el usuario", async () => {
    mockGetMe.mockResolvedValueOnce(USUARIO);
    mockLogout.mockResolvedValueOnce(undefined);

    renderAuth();
    await waitFor(() => screen.getByText(SESION));

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => expect(screen.getByText("Sin sesión")).toBeInTheDocument());
    expect(mockLogout).toHaveBeenCalled();
  });

  it("limpia el usuario incluso si el cierre de sesión falla", async () => {
    mockGetMe.mockResolvedValueOnce(USUARIO);
    mockLogout.mockRejectedValueOnce(new Error("Network error"));

    renderAuth();
    await waitFor(() => screen.getByText(SESION));

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => expect(screen.getByText("Sin sesión")).toBeInTheDocument());
  });

  it("con la sesión ya vencida cierra igual, sin dejar el 401 sin atrapar", async () => {
    mockGetMe.mockResolvedValueOnce(USUARIO);
    mockLogout.mockRejectedValueOnce(new ApiError(401, "Authentication required"));
    // Como lo llama la barra lateral: con `void` y sin catch. Si el 401 se
    // escapara, Vitest falla la corrida por rechazo sin atrapar.
    function BotonDeLaBarra() {
      const { logout } = useAuth();
      return <button onClick={() => void logout()}>Cerrar sesión</button>;
    }
    render(<AuthProvider><TestConsumer /><BotonDeLaBarra /></AuthProvider>);
    await waitFor(() => screen.getByText(SESION));

    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(screen.getByText("Sin sesión")).toBeInTheDocument());
  });
});

// --- useAuth fuera de AuthProvider ---

describe("useAuth fuera de AuthProvider", () => {
  it("lanza error con mensaje descriptivo", () => {
    function Bare() {
      useAuth();
      return null;
    }
    // Silenciar el error de consola que React emite por el throw no capturado
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow("useAuth must be used inside AuthProvider");
    spy.mockRestore();
  });
});
