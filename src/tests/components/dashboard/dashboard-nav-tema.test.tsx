import { render, screen } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import DashboardNav from "@/components/dashboard/DashboardNav";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

beforeEach(() => {
  window.localStorage.clear();
});

function abrirConfiguracion() {
  return render(<OwnerWorkspace initialView="configuracion" demo />);
}

it("ofrece el ajuste en Apariencia, con el tema claro por defecto", () => {
  abrirConfiguracion();

  expect(screen.getByRole("heading", { name: "Apariencia" })).toBeInTheDocument();
  expect(screen.getByRole("switch", { name: "Modo oscuro" })).not.toBeChecked();
  expect(document.documentElement.dataset.theme).toBe("light");
});

it("aplica el tema oscuro y lo recuerda al volver a abrir el panel", async () => {
  const { unmount } = abrirConfiguracion();

  await userEvent.click(screen.getByRole("switch", { name: "Modo oscuro" }));

  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(window.localStorage.getItem("alquia:theme")).toBe("dark");
  unmount();
  abrirConfiguracion();
  expect(screen.getByRole("switch", { name: "Modo oscuro" })).toBeChecked();
});

it("vuelve al modo claro y recuerda el cambio", async () => {
  window.localStorage.setItem("alquia:theme", "dark");
  abrirConfiguracion();

  await userEvent.click(screen.getByRole("switch", { name: "Modo oscuro" }));

  expect(screen.getByRole("switch", { name: "Modo oscuro" })).not.toBeChecked();
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(window.localStorage.getItem("alquia:theme")).toBe("light");
});

it("retira el control de tema de la navegación", () => {
  render(<DashboardNav />);
  expect(screen.queryByRole("button", { name: /modo (claro|oscuro)/i })).not.toBeInTheDocument();
});
