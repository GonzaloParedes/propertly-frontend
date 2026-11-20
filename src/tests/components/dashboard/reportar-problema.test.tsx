import { render, screen } from "@/tests/render";
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
  it("la barra y el menú mobile ofrecen la entrada", () => {
    renderConNavegacion();
    expect(screen.getAllByRole("button", { name: "Reportar un problema" })).toHaveLength(2);
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
