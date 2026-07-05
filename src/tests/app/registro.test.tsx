import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegistroPage from "@/app/registro/page";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiPost: vi.fn() };
});

import { apiPost, ApiError } from "@/lib/api";
const mockApiPost = vi.mocked(apiPost);

beforeEach(() => {
  vi.resetAllMocks();
});

async function fillAndSubmit({
  firstName = "María",
  lastName = "González",
  email = "maria@ejemplo.com",
  password = "secreta123",
} = {}) {
  await userEvent.type(screen.getByLabelText("Nombre"), firstName);
  await userEvent.type(screen.getByLabelText("Apellido"), lastName);
  await userEvent.type(screen.getByLabelText("Correo electrónico"), email);
  await userEvent.type(screen.getByLabelText("Contraseña"), password);
  await userEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
}

// --- Renderizado ---

describe("renderizado", () => {
  it("muestra los 4 campos del formulario", () => {
    render(<RegistroPage />);
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Apellido")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
  });

  it("muestra el botón de crear cuenta", () => {
    render(<RegistroPage />);
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeInTheDocument();
  });

  it("no muestra el estado de éxito al iniciar", () => {
    render(<RegistroPage />);
    expect(screen.queryByText("Revisá tu correo")).not.toBeInTheDocument();
  });
});

// --- Toggle de contraseña ---

describe("toggle mostrar/ocultar contraseña", () => {
  it("el input empieza en type=password", () => {
    render(<RegistroPage />);
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
  });

  it("al hacer click muestra la contraseña", async () => {
    render(<RegistroPage />);
    await userEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "text");
  });

  it("al hacer click de nuevo vuelve a ocultar", async () => {
    render(<RegistroPage />);
    await userEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    await userEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
  });
});

// --- Registro exitoso ---

describe("registro exitoso", () => {
  it("llama a apiPost con el payload correcto", async () => {
    mockApiPost.mockResolvedValueOnce({});
    render(<RegistroPage />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(mockApiPost).toHaveBeenCalledWith(
        "/auth/register",
        {
          firstName: "María",
          lastName: "González",
          email: "maria@ejemplo.com",
          password: "secreta123",
        },
        { retry: false }
      )
    );
  });

  it("muestra el estado de éxito con el email ingresado", async () => {
    mockApiPost.mockResolvedValueOnce({});
    render(<RegistroPage />);
    await fillAndSubmit({ email: "maria@ejemplo.com" });

    await waitFor(() =>
      expect(screen.getByText("Revisá tu correo")).toBeInTheDocument()
    );
    expect(screen.getByText("maria@ejemplo.com")).toBeInTheDocument();
  });

  it("oculta el formulario en el estado de éxito", async () => {
    mockApiPost.mockResolvedValueOnce({});
    render(<RegistroPage />);
    await fillAndSubmit();

    await waitFor(() => screen.getByText("Revisá tu correo"));
    expect(screen.queryByRole("button", { name: "Crear cuenta" })).not.toBeInTheDocument();
  });

  it("muestra el link para volver al login en el estado de éxito", async () => {
    mockApiPost.mockResolvedValueOnce({});
    render(<RegistroPage />);
    await fillAndSubmit();

    await waitFor(() => screen.getByText("Volver al inicio de sesión"));
    expect(screen.getByRole("link", { name: "Volver al inicio de sesión" })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("muestra 'Creando cuenta…' y deshabilita el form mientras está pendiente", async () => {
    mockApiPost.mockReturnValueOnce(new Promise(() => {}));
    render(<RegistroPage />);
    await fillAndSubmit();

    expect(screen.getByRole("button", { name: "Creando cuenta…" })).toBeDisabled();
    expect(screen.getByLabelText("Correo electrónico")).toBeDisabled();
  });
});

// --- Estados de error ---

describe("estados de error", () => {
  it("muestra error de validación con ApiError 400", async () => {
    mockApiPost.mockRejectedValueOnce(new ApiError(400, "Bad Request"));
    render(<RegistroPage />);
    await fillAndSubmit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Verifique los datos ingresados");
  });

  it("muestra error genérico para otros errores", async () => {
    mockApiPost.mockRejectedValueOnce(new Error("Network error"));
    render(<RegistroPage />);
    await fillAndSubmit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos crear su cuenta");
  });

  it("el mensaje de error tiene role=alert", async () => {
    mockApiPost.mockRejectedValueOnce(new ApiError(400, "Bad Request"));
    render(<RegistroPage />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument()
    );
  });

  it("rehabilita el formulario tras un error", async () => {
    mockApiPost.mockRejectedValueOnce(new ApiError(400, "Bad Request"));
    render(<RegistroPage />);
    await fillAndSubmit();

    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Crear cuenta" })).not.toBeDisabled();
  });
});
