import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Landing from "@/components/landing-v2/Landing";

describe("Landing nueva", () => {
  it("muestra la propuesta de valor oficial como título principal", () => {
    render(<Landing />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sus alquileres, en orden y a la vista.");
  });

  it("lleva todos los «Crear cuenta gratis» al registro", () => {
    render(<Landing />);
    const enlaces = screen.getAllByRole("link", { name: "Crear cuenta gratis" });
    expect(enlaces.length).toBeGreaterThanOrEqual(3);
    for (const enlace of enlaces) expect(enlace).toHaveAttribute("href", "/registro");
  });

  it("ofrece ingresar a quien ya tiene cuenta", () => {
    render(<Landing />);
    for (const enlace of screen.getAllByRole("link", { name: "Ingresar" })) expect(enlace).toHaveAttribute("href", "/login");
  });

  it("dice que los recordatorios le llegan al inquilino, no al propietario", () => {
    render(<Landing />);
    expect(screen.getByText(/a su inquilino por correo, y a usted en su panel/)).toBeInTheDocument();
    expect(screen.queryByText(/reciba avisos antes de cada vencimiento/i)).not.toBeInTheDocument();
  });

  it("abre una pregunta frecuente y muestra su respuesta", async () => {
    render(<Landing />);
    const pregunta = screen.getByText("¿Quién recibe los recordatorios?");
    const detalle = pregunta.closest("details")!;
    expect(detalle).not.toHaveAttribute("open");
    await userEvent.click(pregunta);
    expect(detalle).toHaveAttribute("open");
    expect(within(detalle).getByText(/Su inquilino, por correo/)).toBeInTheDocument();
  });

  it("describe cada vista del producto para lector de pantalla", () => {
    render(<Landing />);
    // Inicio, el calendario del mes y las siete vistas de «Cómo funciona».
    expect(screen.getAllByRole("figure").length).toBe(9);
    expect(screen.getByText(/El Inicio de Alquia: \$\s430\.000 cobrados/)).toBeInTheDocument();
  });

  it("lleva de las anclas del nav a secciones que existen", () => {
    const { container } = render(<Landing />);
    for (const ancla of ["como-funciona", "preguntas"]) expect(container.querySelector(`#${ancla}`)).not.toBeNull();
  });

  it("no usa rayas largas en el texto visible", () => {
    const { container } = render(<Landing />);
    expect(container.textContent).not.toMatch(/[—–]/);
  });
});

describe("Página de inicio", () => {
  it("muestra la landing en «/»", async () => {
    const { default: Home } = await import("@/app/page");
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sus alquileres, en orden y a la vista.");
    expect(screen.getAllByRole("link", { name: "Crear cuenta gratis" })[0]).toHaveAttribute("href", "/registro");
    expect(screen.getAllByRole("figure").length).toBe(9);
  });
});
