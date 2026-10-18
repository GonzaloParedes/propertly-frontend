import { render, screen } from "@testing-library/react";
import NotFound, { metadata } from "@/app/not-found";

describe("página 404", () => {
  it("explica en español que la página no existe", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: "Esta página no existe" })).toBeInTheDocument();
    expect(screen.getByText("Error 404")).toBeInTheDocument();
    expect(screen.getByAltText("Alquia")).toBeInTheDocument();
  });

  it("ofrece volver al inicio", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
  });

  it("ofrece escribir al equipo", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: "Escribinos" })).toHaveAttribute("href");
  });

  it("titula la pestaña «Página no encontrada | Alquia»", () => {
    expect(metadata.title).toBe("Página no encontrada | Alquia");
  });
});
