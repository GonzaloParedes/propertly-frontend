import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Nav from "@/components/landing-v2/Nav";

// jsdom no trae matchMedia; el menú lo usa para soltar el scroll si la ventana se ensancha.
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

const abrir = () => userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
const menu = () => document.getElementById("lp-menu")!;

describe("menú del celular", () => {
  it("arranca cerrado, con el botón anunciándolo", () => {
    render(<Nav />);
    const boton = screen.getByRole("button", { name: "Abrir menú" });
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(boton).toHaveAttribute("aria-controls", "lp-menu");
    expect(menu()).toHaveAttribute("hidden");
  });

  it("al abrir muestra los links y el botón pasa a «Cerrar menú»", async () => {
    render(<Nav />);
    await abrir();
    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute("aria-expanded", "true");
    const panel = within(menu());
    expect(panel.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Cómo funciona",
      "Preguntas frecuentes",
      "Ingresar",
      "Crear cuenta gratis",
    ]);
    expect(panel.getByRole("link", { name: "Crear cuenta gratis" })).toHaveAttribute("href", "/registro");
  });

  it("deja sin scroll al fondo mientras está abierto", async () => {
    render(<Nav />);
    await abrir();
    expect(document.body.style.overflow).toBe("hidden");
    await userEvent.click(screen.getByRole("button", { name: "Cerrar menú" }));
    expect(document.body.style.overflow).toBe("");
  });

  it("se cierra al volver a tocar el botón", async () => {
    render(<Nav />);
    await abrir();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar menú" }));
    expect(menu()).toHaveAttribute("hidden");
  });

  it("se cierra con Esc y devuelve el foco al botón", async () => {
    render(<Nav />);
    await abrir();
    await userEvent.keyboard("{Escape}");
    expect(menu()).toHaveAttribute("hidden");
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveFocus();
  });

  it("se cierra al tocar un link ancla", async () => {
    render(<Nav />);
    await abrir();
    await userEvent.click(within(menu()).getByRole("link", { name: "Preguntas frecuentes" }));
    expect(menu()).toHaveAttribute("hidden");
  });

  it("mantiene el foco dando la vuelta entre el botón y el panel", async () => {
    render(<Nav />);
    await abrir();
    const boton = screen.getByRole("button", { name: "Cerrar menú" });
    const cta = within(menu()).getByRole("link", { name: "Crear cuenta gratis" });

    cta.focus();
    await userEvent.tab();
    expect(boton).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(cta).toHaveFocus();
  });
});
