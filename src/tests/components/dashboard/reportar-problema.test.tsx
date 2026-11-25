import { act } from "@testing-library/react";
import { render, screen, within } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import DashboardNav from "@/components/dashboard/DashboardNav";
import ReportarProblema, { AlertaDeError } from "@/components/dashboard/ReportarProblema";
import { ApiError } from "@/lib/api";
import { ERROR } from "@/lib/error-codes";

const { send, captureMessage, lastEventId } = vi.hoisted(() => ({
  send: vi.fn(),
  captureMessage: vi.fn(),
  lastEventId: vi.fn(),
}));

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    feedback: { send },
    invoices: { list: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@sentry/nextjs", () => ({ captureMessage, lastEventId }));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ logout: vi.fn(), user: null }),
}));

beforeEach(() => {
  send.mockReset().mockResolvedValue(undefined);
  captureMessage.mockReset().mockReturnValue("evento-nuevo");
  lastEventId.mockReset().mockReturnValue("evento-anterior");
});

function renderConNavegacion() {
  return render(<><DashboardNav /><ReportarProblema /></>);
}

async function abrirDesdeLaNavegacion() {
  const [enLaBarra] = screen.getAllByRole("button", { name: "Reportar un problema" });
  await userEvent.click(enLaBarra);
  return screen.getByRole("dialog", { name: "Reportar un problema" });
}

describe("Reportar un problema desde la navegación", () => {
  it("la barra y el menú mobile ofrecen la entrada", async () => {
    renderConNavegacion();
    expect(screen.getByRole("button", { name: "Reportar un problema" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const menu = within(screen.getByRole("dialog", { name: "Menú" }));
    await userEvent.click(menu.getByRole("button", { name: "Cuenta y ayuda" }));
    expect(menu.getByRole("button", { name: "Reportar un problema" })).toBeInTheDocument();
  });

  it("no permite enviar sin descripción", async () => {
    renderConNavegacion();
    await abrirDesdeLaNavegacion();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    await userEvent.type(screen.getByRole("textbox"), "   ");
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("envía el tipo elegido, la descripción y el contexto, y agradece", async () => {
    renderConNavegacion();
    await abrirDesdeLaNavegacion();

    expect(screen.getByRole("radio", { name: "Error" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("radio", { name: "Sugerencia" }));
    await userEvent.type(screen.getByRole("textbox", { name: /le gustaría/ }), "  Exportar a Excel  ");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(send).toHaveBeenCalledWith({
      type: "SUGGESTION",
      description: "Exportar a Excel",
      pageUrl: window.location.href,
      userAgent: window.navigator.userAgent,
      errorMessage: undefined,
      sentryEventId: "evento-anterior",
    });
    expect(captureMessage).not.toHaveBeenCalled();
    expect(await screen.findByText(/Recibimos su reporte/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Reportar un problema" })).not.toBeInTheDocument();
  });

  it("si superó el límite lo explica y deja el diálogo abierto", async () => {
    send.mockRejectedValue(new ApiError(429, "Too many", ERROR.FEEDBACK_RATE_LIMITED));
    renderConNavegacion();
    await abrirDesdeLaNavegacion();
    await userEvent.type(screen.getByRole("textbox"), "No carga");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ya nos mandó varios reportes en la última hora");
    expect(screen.getByRole("dialog", { name: "Reportar un problema" })).toBeInTheDocument();
  });

  it("Cancelar cierra sin enviar", async () => {
    renderConNavegacion();
    await abrirDesdeLaNavegacion();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });
});

describe("Avisanos de este error", () => {
  it("abre el diálogo con el error adjunto y lo registra en Sentry al enviar", async () => {
    render(<><AlertaDeError mensaje="No pudimos archivar la propiedad." /><ReportarProblema /></>);

    await userEvent.click(screen.getByRole("button", { name: "Avisanos de este error" }));
    expect(screen.getByRole("dialog", { name: "Reportar un problema" })).toHaveTextContent(
      "Adjuntamos el error que vio: «No pudimos archivar la propiedad.»"
    );
    await userEvent.type(screen.getByRole("textbox", { name: "¿Qué pasó?" }), "Toqué Archivar");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(captureMessage).toHaveBeenCalledWith("Reporte de propietario: No pudimos archivar la propiedad.", "warning");
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      type: "BUG",
      description: "Toqué Archivar",
      errorMessage: "No pudimos archivar la propiedad.",
      sentryEventId: "evento-nuevo",
    }));
  });

  it("si Sentry falla, el reporte sale igual", async () => {
    captureMessage.mockImplementation(() => { throw new Error("sin Sentry"); });
    render(<><AlertaDeError mensaje="Falló" /><ReportarProblema /></>);

    await userEvent.click(screen.getByRole("button", { name: "Avisanos de este error" }));
    await userEvent.type(screen.getByRole("textbox"), "Algo");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ errorMessage: "Falló", sentryEventId: undefined }));
  });
});

describe("Captura de pantalla (ALQ-200)", () => {
  const MB5 = 5242880;
  const png = (nombre = "captura.png") => new File(["x"], nombre, { type: "image/png" });

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:previsualizacion");
    URL.revokeObjectURL = vi.fn();
  });

  const inputDeCaptura = () => screen.getByLabelText("Archivo de captura") as HTMLInputElement;

  async function abrirYEscribir() {
    render(<><DashboardNav /><ReportarProblema /></>);
    await abrirDesdeLaNavegacion();
    await userEvent.type(screen.getByRole("textbox"), "No carga");
  }

  function pegar(archivo: File | null) {
    const items = archivo ? [{ kind: "file", type: archivo.type, getAsFile: () => archivo }] : [{ kind: "string", type: "text/plain", getAsFile: () => null }];
    const evento = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(evento, "clipboardData", { value: { items } });
    act(() => { document.body.dispatchEvent(evento); });
    return evento;
  }

  it("ofrece el selector con los tipos aceptados", async () => {
    await abrirYEscribir();
    expect(screen.getByRole("button", { name: "Adjuntar captura" })).toBeInTheDocument();
    expect(inputDeCaptura()).toHaveAttribute("accept", "image/png,image/jpeg,image/webp");
  });

  it("adjuntar un archivo válido muestra la miniatura y envía multipart con el archivo", async () => {
    await abrirYEscribir();
    const archivo = png();
    await userEvent.upload(inputDeCaptura(), archivo);

    expect(screen.getByRole("img", { name: /captura adjunta/ })).toHaveAttribute("src", "blob:previsualizacion");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ type: "BUG", description: "No carga" }), archivo);
    expect(await screen.findByText(/Recibimos su reporte/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("pegar una imagen con el diálogo abierto la adjunta y reemplaza la anterior", async () => {
    await abrirYEscribir();
    const evento = pegar(png("a.png"));
    expect(evento.defaultPrevented).toBe(true);
    expect(await screen.findByRole("img", { name: /captura adjunta/ })).toBeInTheDocument();

    const otra = new File(["y"], "b.png", { type: "image/png" });
    pegar(otra);
    expect(await screen.findByText("b.png")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(send).toHaveBeenCalledWith(expect.anything(), otra);
  });

  it("pegar texto no se intercepta", async () => {
    await abrirYEscribir();
    expect(pegar(null).defaultPrevented).toBe(false);
    expect(screen.queryByRole("img", { name: /captura adjunta/ })).not.toBeInTheDocument();
  });

  it("quitar la captura la saca y el envío vuelve a ir sin archivo", async () => {
    await abrirYEscribir();
    await userEvent.upload(inputDeCaptura(), png());
    await userEvent.click(screen.getByRole("button", { name: "Quitar" }));

    expect(screen.queryByRole("img", { name: /captura adjunta/ })).not.toBeInTheDocument();
    expect(inputDeCaptura().value).toBe("");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(send.mock.calls[0]).toHaveLength(1);
  });

  it("rechaza una captura de más de 5 MB sin enviarla", async () => {
    await abrirYEscribir();
    const grande = new File(["x"], "grande.png", { type: "image/png" });
    Object.defineProperty(grande, "size", { value: MB5 + 1 });
    await userEvent.upload(inputDeCaptura(), grande);

    expect(screen.getByRole("alert")).toHaveTextContent("pesa más de 5 MB");
    expect(screen.queryByRole("img", { name: /captura adjunta/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(send.mock.calls[0]).toHaveLength(1);
  });

  it("acepta una captura de exactamente 5 MB", async () => {
    await abrirYEscribir();
    const justa = new File(["x"], "justa.webp", { type: "image/webp" });
    Object.defineProperty(justa, "size", { value: MB5 });
    await userEvent.upload(inputDeCaptura(), justa);
    expect(screen.getByRole("img", { name: /captura adjunta/ })).toBeInTheDocument();
  });

  it("rechaza un tipo no soportado, aunque se llame .png", async () => {
    await abrirYEscribir();
    pegar(new File(["x"], "anim.gif", { type: "image/gif" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("PNG, JPG o WebP");
    expect(screen.queryByRole("img", { name: /captura adjunta/ })).not.toBeInTheDocument();
  });

  it.each([
    [413, ERROR.FEEDBACK_SCREENSHOT_TOO_LARGE, "pesa más de 5 MB"],
    [415, ERROR.FEEDBACK_SCREENSHOT_UNSUPPORTED_TYPE, "No pudimos leer la captura"],
    [413, null, "pesa más de 5 MB"],
    [415, null, "No pudimos leer la captura"],
  ])("el %s del backend (type %s) muestra la copy de la captura y deja reintentar", async (status, type, texto) => {
    send.mockRejectedValue(new ApiError(status, "x", type));
    await abrirYEscribir();
    await userEvent.upload(inputDeCaptura(), png());
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(texto);
    expect(screen.getByRole("dialog", { name: "Reportar un problema" })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("No carga");
    expect(screen.getByRole("img", { name: /captura adjunta/ })).toBeInTheDocument();
  });

  it("sin captura el reporte sale como siempre: mismos campos, sin segundo argumento y con toast", async () => {
    await abrirYEscribir();
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      type: "BUG",
      description: "No carga",
      pageUrl: window.location.href,
      userAgent: window.navigator.userAgent,
      errorMessage: undefined,
      sentryEventId: "evento-anterior",
    });
    expect(send.mock.calls[0]).toHaveLength(1);
    expect(await screen.findByText(/Recibimos su reporte/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("al reabrir el diálogo no queda la captura anterior", async () => {
    await abrirYEscribir();
    await userEvent.upload(inputDeCaptura(), png());
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await abrirDesdeLaNavegacion();
    expect(screen.queryByRole("img", { name: /captura adjunta/ })).not.toBeInTheDocument();
  });
});
