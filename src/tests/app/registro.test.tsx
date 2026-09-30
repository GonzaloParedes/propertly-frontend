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

// 27-24891055-6 es un CUIL con dígito verificador válido; el formulario lo
// valida en el cliente, así que un número inventado no deja enviar.
const CUIT_VALIDO = "27248910556";

async function fillAndSubmit({
  firstName = "María",
  lastName = "González",
  taxId = CUIT_VALIDO,
  email = "maria@ejemplo.com",
  phone = "1144552210",
  password = "secreta123",
} = {}) {
  await userEvent.type(screen.getByLabelText("Nombre"), firstName);
  await userEvent.type(screen.getByLabelText("Apellido"), lastName);
  if (taxId) await userEvent.type(screen.getByLabelText("CUIT o CUIL"), taxId);
  await userEvent.type(screen.getByLabelText("Correo electrónico"), email);
  if (phone) await userEvent.type(screen.getByLabelText("Teléfono"), phone);
  await userEvent.type(screen.getByLabelText("Contraseña"), password);
  await userEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
}

// --- Renderizado ---

describe("renderizado", () => {
  it("muestra los 6 campos del formulario", () => {
    render(<RegistroPage />);
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Apellido")).toBeInTheDocument();
    expect(screen.getByLabelText("CUIT o CUIL")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
  });

  it("muestra el botón de crear cuenta", () => {
    render(<RegistroPage />);
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeInTheDocument();
  });

  it("no muestra el estado de éxito al iniciar", () => {
    render(<RegistroPage />);
    expect(screen.queryByText("Revise su correo")).not.toBeInTheDocument();
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
          taxId: "27248910556",
          phoneNumber: "1144552210",
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
      expect(screen.getByText("Revise su correo")).toBeInTheDocument()
    );
    expect(screen.getByText("maria@ejemplo.com")).toBeInTheDocument();
  });

  it("oculta el formulario en el estado de éxito", async () => {
    mockApiPost.mockResolvedValueOnce({});
    render(<RegistroPage />);
    await fillAndSubmit();

    await waitFor(() => screen.getByText("Revise su correo"));
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

// --- CUIT ---

describe("CUIT", () => {
  it("se formatea con guiones mientras se escribe", async () => {
    render(<RegistroPage />);
    const campo = screen.getByLabelText("CUIT o CUIL");
    await userEvent.type(campo, CUIT_VALIDO);
    expect(campo).toHaveValue("27-24891055-6");
  });

  it("manda el CUIT sin guiones, que es lo que espera el backend", async () => {
    mockApiPost.mockResolvedValueOnce({});
    render(<RegistroPage />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(mockApiPost).toHaveBeenCalledWith(
        "/auth/register",
        expect.objectContaining({ taxId: "27248910556" }),
        { retry: false }
      )
    );
  });

  it("no llama al backend si el dígito verificador no cierra", async () => {
    render(<RegistroPage />);
    await fillAndSubmit({ taxId: "27248910557" });

    expect(await screen.findByText(/no es válido/)).toBeInTheDocument();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it("no llama al backend si faltan dígitos", async () => {
    render(<RegistroPage />);
    await fillAndSubmit({ taxId: "2724891" });

    expect(await screen.findByText("Faltan dígitos: son 11 en total.")).toBeInTheDocument();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it("no llama al backend si el CUIT está vacío", async () => {
    // Con el campo vacío corta el `required` nativo del navegador, así que
    // handleSubmit ni llega a ejecutarse y el mensaje propio no aparece acá.
    render(<RegistroPage />);
    await fillAndSubmit({ taxId: "" });

    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it("pide el CUIT si el usuario borra lo que había escrito y sale del campo", async () => {
    render(<RegistroPage />);
    const campo = screen.getByLabelText("CUIT o CUIL");
    await userEvent.type(campo, "27");
    await userEvent.clear(campo);
    await userEvent.tab();

    expect(await screen.findByText("Ingrese su CUIT o CUIL.")).toBeInTheDocument();
  });

  it("no muestra el error antes de que el usuario toque el campo", () => {
    render(<RegistroPage />);
    expect(screen.queryByText("Ingrese su CUIT o CUIL.")).not.toBeInTheDocument();
  });

  it("marca el campo como inválido para lectores de pantalla", async () => {
    render(<RegistroPage />);
    await fillAndSubmit({ taxId: "27248910557" });

    expect(screen.getByLabelText("CUIT o CUIL")).toHaveAttribute("aria-invalid", "true");
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
