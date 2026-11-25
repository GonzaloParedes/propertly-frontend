import { fireEvent, render, screen, within } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import DashboardNav from "@/components/dashboard/DashboardNav";

const mockLogout = vi.fn();

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("menú cerrado por defecto", () => {
  it("el botón hamburguesa tiene aria-expanded=false", () => {
    render(<DashboardNav />);
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });
});

describe("abrir y cerrar el menú", () => {
  it("al hacer click en la hamburguesa, aria-expanded pasa a true", async () => {
    render(<DashboardNav />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("al hacer click en cerrar, aria-expanded vuelve a false", async () => {
    render(<DashboardNav />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar menú" }));
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("al tocar fuera del panel (botón de fondo) se cierra el menú", async () => {
    render(<DashboardNav />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar menú al tocar fuera" }));
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("el botón de fondo no entra en el orden de tabulación", async () => {
    render(<DashboardNav />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(screen.getByRole("button", { name: "Cerrar menú al tocar fuera" })).toHaveAttribute("tabindex", "-1");
  });

  it("con Escape se cierra el menú", async () => {
    render(<DashboardNav />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    fireEvent(screen.getByRole("dialog", { name: "Menú" }), new Event("cancel", { cancelable: true }));
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });
});

describe("ítems del menú", () => {
  it("'Inicio' es un link habilitado a /dashboard", async () => {
    render(<DashboardNav />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const drawer = screen.getByRole("dialog", { name: "Menú" });
    const inicio = within(drawer).getByRole("link", { name: "Inicio" });
    expect(inicio).toHaveAttribute("href", "/dashboard");
  });

  it("navega a las secciones de gestión", async () => {
    render(<DashboardNav />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const drawer = screen.getByRole("dialog", { name: "Menú" });
    expect(within(drawer).getByRole("link", { name: "Propiedades" })).toHaveAttribute(
      "href",
      "/dashboard/propiedades"
    );
    expect(within(drawer).getByRole("link", { name: "Contratos" })).toHaveAttribute(
      "href",
      "/dashboard/contratos"
    );
    expect(within(drawer).getByRole("link", { name: /Cobranzas/ })).toHaveAttribute(
      "href",
      "/dashboard/cobranzas"
    );
  });
});

describe("Herramientas", () => {
  it("despliega enlaces directos a cada herramienta", async () => {
    render(<DashboardNav />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const menu = within(screen.getByRole("dialog", { name: "Menú" }));
    const tools = menu.getByRole("button", { name: "Herramientas" });
    expect(tools).toHaveAttribute("aria-expanded", "false");
    expect(menu.queryByRole("link", { name: "Predictor de alquiler" })).not.toBeInTheDocument();
    await userEvent.click(tools);
    expect(tools).toHaveAttribute("aria-expanded", "true");
    expect(menu.getByRole("link", { name: "Predictor de alquiler" })).toHaveAttribute("href", "/dashboard/herramientas/predictor");
    expect(menu.getByRole("link", { name: "Consulta de deudores" })).toHaveAttribute("href", "/dashboard/herramientas/bcra");
    expect(menu.getByRole("link", { name: "Calculadora de aumentos" })).toHaveAttribute("href", "/dashboard/herramientas/calculadora");
  });

  it("pliega el submenú de escritorio al elegir otra sección", async () => {
    const onNavigate = vi.fn();
    render(<DashboardNav activeView="inicio" onNavigate={onNavigate} />);
    const sidebar = within(screen.getByRole("complementary", { name: "Navegación principal" }));
    const tools = sidebar.getByRole("button", { name: "Herramientas" });
    await userEvent.click(tools);
    expect(sidebar.getByRole("button", { name: "Predictor de alquiler" })).toBeInTheDocument();

    await userEvent.click(sidebar.getByRole("button", { name: "Propiedades" }));
    expect(onNavigate).toHaveBeenCalledWith("propiedades", undefined);
    expect(tools).toHaveAttribute("aria-expanded", "false");
    expect(sidebar.queryByRole("button", { name: "Predictor de alquiler" })).not.toBeInTheDocument();
  });

  it("mantiene un solo submenú abierto en el celular", async () => {
    render(<DashboardNav />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const menu = within(screen.getByRole("dialog", { name: "Menú" }));
    const tools = menu.getByRole("button", { name: "Herramientas" });
    const account = menu.getByRole("button", { name: "Cuenta y ayuda" });

    await userEvent.click(tools);
    await userEvent.click(account);
    expect(tools).toHaveAttribute("aria-expanded", "false");
    expect(account).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(tools);
    expect(account).toHaveAttribute("aria-expanded", "false");
    expect(tools).toHaveAttribute("aria-expanded", "true");
  });

  it("abre la herramienta elegida en la demo y cierra el menú", async () => {
    const onNavigate = vi.fn();
    render(<DashboardNav activeView="inicio" onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const menu = within(screen.getByRole("dialog", { name: "Menú" }));
    await userEvent.click(menu.getByRole("button", { name: "Herramientas" }));
    await userEvent.click(menu.getByRole("button", { name: "Calculadora de aumentos" }));
    expect(onNavigate).toHaveBeenCalledWith("herramientas", "calculadora");
    expect(screen.queryByRole("dialog", { name: "Menú" })).not.toBeInTheDocument();
  });
});

describe("tutorial", () => {
  it("el menú ofrece volver a verlo", async () => {
    render(<DashboardNav />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const menu = screen.getByRole("dialog", { name: "Menú" });
    await userEvent.click(within(menu).getByRole("button", { name: "Cuenta y ayuda" }));
    expect(within(menu).getByRole("button", { name: "Ver tutorial" })).toBeInTheDocument();
    expect(within(screen.getByRole("complementary", { name: "Navegación principal" })).getByRole("button", { name: "Ver tutorial" })).toBeInTheDocument();
  });
});

describe("cerrar sesión", () => {
  it("llama a logout() al hacer click", async () => {
    render(<DashboardNav />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const drawer = screen.getByRole("dialog", { name: "Menú" });
    await userEvent.click(within(drawer).getByRole("button", { name: "Cuenta y ayuda" }));
    await userEvent.click(within(drawer).getByRole("button", { name: "Cerrar sesión" }));
    expect(mockLogout).toHaveBeenCalled();
  });
});
