import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/context/auth-context";
import type { AuthUser } from "@/context/auth-context";

vi.mock("@/lib/api", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

import { apiGet, apiPost } from "@/lib/api";
const mockApiGet = vi.mocked(apiGet);
const mockApiPost = vi.mocked(apiPost);

const TEST_USER: AuthUser = {
  id: "1",
  email: "test@test.com",
  firstName: "Juan",
  lastName: "Pérez",
};

function TestConsumer() {
  const { user, isLoading, login, logout } = useAuth();
  if (isLoading) return <p>Cargando</p>;
  return (
    <div>
      <p>{user ? `Sesión: ${user.email}` : "Sin sesión"}</p>
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

beforeEach(() => {
  vi.resetAllMocks();
});

// --- Carga inicial ---

describe("carga inicial", () => {
  it("muestra estado de carga antes de que resuelva /auth/me", () => {
    mockApiGet.mockReturnValueOnce(new Promise(() => {})); // nunca resuelve
    renderAuth();
    expect(screen.getByText("Cargando")).toBeInTheDocument();
  });

  it("muestra usuario cuando /auth/me devuelve datos", async () => {
    mockApiGet.mockResolvedValueOnce(TEST_USER);
    renderAuth();
    await waitFor(() =>
      expect(screen.getByText(`Sesión: ${TEST_USER.email}`)).toBeInTheDocument()
    );
  });

  it("muestra sin sesión cuando /auth/me falla", async () => {
    mockApiGet.mockRejectedValueOnce(new Error("401"));
    renderAuth();
    await waitFor(() =>
      expect(screen.getByText("Sin sesión")).toBeInTheDocument()
    );
  });
});

// --- login() ---

describe("login()", () => {
  it("llama a la API y actualiza el usuario en pantalla", async () => {
    // /auth/me inicial → sin sesión
    mockApiGet.mockRejectedValueOnce(new Error("401"));
    // login → post ok
    mockApiPost.mockResolvedValueOnce({});
    // /auth/me tras login → usuario
    mockApiGet.mockResolvedValueOnce(TEST_USER);

    renderAuth();
    await waitFor(() => screen.getByText("Sin sesión"));

    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() =>
      expect(screen.getByText(`Sesión: ${TEST_USER.email}`)).toBeInTheDocument()
    );
    expect(mockApiPost).toHaveBeenCalledWith(
      "/auth/login",
      { email: "a@a.com", password: "123" },
      { retry: false }
    );
  });

});

// --- logout() ---

describe("logout()", () => {
  it("llama a /auth/logout y limpia el usuario", async () => {
    mockApiGet.mockResolvedValueOnce(TEST_USER); // sesión activa
    mockApiPost.mockResolvedValueOnce({});        // logout ok

    renderAuth();
    await waitFor(() => screen.getByText(`Sesión: ${TEST_USER.email}`));

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() =>
      expect(screen.getByText("Sin sesión")).toBeInTheDocument()
    );
    expect(mockApiPost).toHaveBeenCalledWith(
      "/auth/logout",
      undefined,
      { retry: false }
    );
  });

  it("limpia el usuario incluso si el POST falla", async () => {
    mockApiGet.mockResolvedValueOnce(TEST_USER);
    mockApiPost.mockRejectedValueOnce(new Error("Network error"));

    renderAuth();
    await waitFor(() => screen.getByText(`Sesión: ${TEST_USER.email}`));

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() =>
      expect(screen.getByText("Sin sesión")).toBeInTheDocument()
    );
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
