import { render, screen } from "@testing-library/react";
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

  it("con Escape se cierra el menú", async () => {
    render(<DashboardNav />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    await userEvent.keyboard("{Escape}");
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
    const inicio = screen.getByRole("link", { name: "Inicio" });
    expect(inicio).toHaveAttribute("href", "/dashboard");
  });

  it("los placeholders de secciones están deshabilitados", async () => {
    render(<DashboardNav />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(screen.getByRole("button", { name: /Propiedades/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Pagos/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Configuración/ })).toBeDisabled();
  });
});

describe("cerrar sesión", () => {
  it("llama a logout() al hacer click", async () => {
    render(<DashboardNav />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(mockLogout).toHaveBeenCalled();
  });
});
