import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PrototipoInquilinoPage from "@/app/prototipo/inquilino/page";

describe("prototipo de cuotas del inquilino", () => {
  it("muestra los 12 meses y abre el detalle del mes elegido", async () => {
    render(<PrototipoInquilinoPage />);

    expect(screen.getByRole("heading", { name: "Cuotas de 2026" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Ver detalle/ })).toHaveLength(12);

    await userEvent.click(screen.getByRole("button", { name: "Octubre 2026: Pago a confirmar. Ver detalle" }));
    const detalle = screen.getByRole("region", { name: "Detalle de octubre 2026" });
    expect(within(detalle).getByText("480.022", { exact: false })).toBeInTheDocument();
    expect(within(detalle).getByText("Su comprobante está esperando confirmación del propietario.")).toBeInTheDocument();
  });

  it("permite cambiar de año y diferencia los meses sin cuota", async () => {
    render(<PrototipoInquilinoPage />);

    await userEvent.click(screen.getByRole("button", { name: "2027" }));
    expect(screen.getByRole("heading", { name: "Cuotas de 2027" })).toBeInTheDocument();
    expect(screen.getAllByText("Importe a confirmar")).toHaveLength(2);
    expect(screen.getAllByText("Después del contrato")).toHaveLength(7);
    expect(screen.getAllByRole("button", { name: /Ver detalle/ })).toHaveLength(3);

    await userEvent.click(screen.getByRole("button", { name: "2025" }));
    expect(screen.getByRole("heading", { name: "Cuotas de 2025" })).toBeInTheDocument();
    expect(screen.getAllByText("Antes del contrato")).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: /Ver detalle/ })).toHaveLength(7);
    expect(screen.getByRole("button", { name: "Junio 2025: Pagada. Ver detalle" })).toBeInTheDocument();
    expect(screen.getByText("Cambiaron las condiciones")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Septiembre 2025: Vencida. Ver detalle" }));
    expect(screen.getByText(/Esta cuota sigue pendiente aunque las condiciones hayan cambiado/)).toBeInTheDocument();
  });
});
