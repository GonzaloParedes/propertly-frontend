import { render, screen } from "@testing-library/react";
import { Cargando, Spinner } from "@/components/ui/Spinner";

describe("Cargando", () => {
  it("anuncia su rótulo como estado", () => {
    render(<Cargando>Cargando sus contratos…</Cargando>);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando sus contratos…");
  });

  it("el anillo no se anuncia", () => {
    const { container } = render(<Spinner />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
