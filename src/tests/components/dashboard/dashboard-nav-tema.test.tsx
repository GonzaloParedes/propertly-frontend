import { render, screen, within } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import DashboardNav from "@/components/dashboard/DashboardNav";
import type { UserResponse } from "@/lib/backend-types";

const USUARIO: UserResponse = {
  id: 1,
  email: "ricardo@ejemplo.com",
  firstName: "Ricardo",
  lastName: "Rosas",
  taxId: "20224567899",
  phoneNumber: "+5491144552210",
};

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: USUARIO, logout: vi.fn() }),
}));

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    invoices: { list: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";

beforeEach(() => {
  vi.resetAllMocks();
  // El conteo de cuotas pendientes no interesa acá, pero el efecto lo pide.
  vi.mocked(AlquiaBackendClient.invoices.list).mockResolvedValue([]);
  try {
    window.localStorage.clear();
  } catch {
    // jsdom siempre lo tiene.
  }
  delete document.documentElement.dataset.theme;
});

/** El toggle del sidebar (hay una copia también en la barra y el cajón móviles). */
function toggleEnSidebar() {
  const sidebar = screen.getByRole("complementary", { name: "Navegación principal" });
  return within(sidebar).getByRole("button", { name: /Activar modo (oscuro|claro)/ });
}

it("ofrece el cambio de tema en el navbar, en claro por defecto", () => {
  render(<DashboardNav />);

  const toggle = toggleEnSidebar();
  expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(toggle).toHaveAccessibleName("Activar modo oscuro");
  expect(document.documentElement.dataset.theme).toBe("light");
});

it("al activarlo, pinta el panel en oscuro y recuerda la preferencia", async () => {
  render(<DashboardNav />);

  await userEvent.click(toggleEnSidebar());

  expect(toggleEnSidebar()).toHaveAttribute("aria-pressed", "true");
  expect(toggleEnSidebar()).toHaveAccessibleName("Activar modo claro");
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(window.localStorage.getItem("alquia:theme")).toBe("dark");
});

it("arranca en oscuro si ya estaba guardado", () => {
  window.localStorage.setItem("alquia:theme", "dark");

  render(<DashboardNav />);

  expect(toggleEnSidebar()).toHaveAttribute("aria-pressed", "true");
  expect(document.documentElement.dataset.theme).toBe("dark");
});

it("al apagarlo, vuelve a claro y lo recuerda", async () => {
  window.localStorage.setItem("alquia:theme", "dark");
  render(<DashboardNav />);

  await userEvent.click(toggleEnSidebar());

  expect(toggleEnSidebar()).toHaveAttribute("aria-pressed", "false");
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(window.localStorage.getItem("alquia:theme")).toBe("light");
});
