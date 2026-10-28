import { act, render, screen, within } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import DashboardNav from "@/components/dashboard/DashboardNav";
import Tutorial from "@/components/dashboard/Tutorial";
import { CLAVE_TUTORIAL, TUTORIAL_ABRIR } from "@/lib/tutorial";

const mockLogout = vi.fn();

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ logout: mockLogout, user: null }),
}));

beforeEach(() => {
  window.localStorage.removeItem(CLAVE_TUTORIAL);
  mockLogout.mockReset();
});

describe("primer ingreso", () => {
  it("muestra el recorrido propiedad, inquilino y contrato", async () => {
    render(<Tutorial auto />);

    expect(await screen.findByRole("dialog", { name: "Primero, la propiedad" })).toBeInTheDocument();
    expect(screen.getByText(/después un inquilino y al final un contrato/)).toBeInTheDocument();
    expect(screen.getByText("Paso 1 de 3")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("dialog", { name: "Después, el inquilino" })).toBeInTheDocument();
    expect(screen.getByText(/quien alquila/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("dialog", { name: "Y cierra con el contrato" })).toBeInTheDocument();
    expect(screen.getByText(/«Nuevo contrato» junta la propiedad y el inquilino/)).toBeInTheDocument();
  });

  it("se puede volver al paso anterior", async () => {
    render(<Tutorial auto />);
    await userEvent.click(await screen.findByRole("button", { name: "Siguiente" }));
    await userEvent.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByRole("dialog", { name: "Primero, la propiedad" })).toBeInTheDocument();
  });

  it("saltear lo cierra y no vuelve a abrirse solo", async () => {
    const { unmount } = render(<Tutorial auto />);
    await userEvent.click(await screen.findByRole("button", { name: "Saltear" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(CLAVE_TUTORIAL)).toBe("visto");

    unmount();
    render(<Tutorial auto />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("terminarlo también lo marca como visto", async () => {
    render(<Tutorial auto />);
    await userEvent.click(await screen.findByRole("button", { name: "Siguiente" }));
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await userEvent.click(screen.getByRole("button", { name: "Entendido" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(CLAVE_TUTORIAL)).toBe("visto");
  });

  it("Escape lo saltea", async () => {
    render(<Tutorial auto />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(CLAVE_TUTORIAL)).toBe("visto");
  });

  it("si ya lo vio, el ingreso no lo vuelve a mostrar", () => {
    window.localStorage.setItem(CLAVE_TUTORIAL, "visto");
    render(<Tutorial auto />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("volver a abrirlo", () => {
  it("el menú lo abre aunque ya se haya salteado", async () => {
    window.localStorage.setItem(CLAVE_TUTORIAL, "visto");
    render(<><DashboardNav /><Tutorial /></>);

    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const menu = screen.getByRole("complementary", { name: "Menú principal" });
    await userEvent.click(within(menu).getByRole("button", { name: "Ver tutorial" }));

    expect(await screen.findByRole("dialog", { name: "Primero, la propiedad" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute("aria-expanded", "false");
  });

  it("también se abre con el evento que dispara Configuración", async () => {
    window.localStorage.setItem(CLAVE_TUTORIAL, "visto");
    render(<Tutorial />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event(TUTORIAL_ABRIR));
    });

    expect(await screen.findByRole("dialog", { name: "Primero, la propiedad" })).toBeInTheDocument();
  });
});
