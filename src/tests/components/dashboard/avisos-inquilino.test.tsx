import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartelAvisosInquilino, ControlAvisosInquilino } from "@/components/dashboard/AvisosInquilino";

it("explica que hace falta correo para activar avisos al crear", () => {
  render(<CartelAvisosInquilino activo={false} tieneCorreo={false} onChange={vi.fn()} />);
  expect(screen.getByRole("switch", { name: "Avisar al inquilino" })).toBeDisabled();
  expect(screen.getByText(/Puede crear el contrato sin avisos/)).toBeInTheDocument();
});

it("habilita la activación al completar el correo", async () => {
  const onChange = vi.fn();
  const { rerender } = render(<CartelAvisosInquilino activo={false} tieneCorreo={false} onChange={onChange} />);
  rerender(<CartelAvisosInquilino activo={false} tieneCorreo onChange={onChange} />);
  await userEvent.click(screen.getByRole("switch", { name: "Avisar al inquilino" }));
  expect(onChange).toHaveBeenCalledWith(true);
});

it("bloquea activar sin correo pero permite apagar avisos que estaban activos", async () => {
  const onChange = vi.fn().mockResolvedValue(undefined);
  const { rerender } = render(<ControlAvisosInquilino enabled={false} tieneCorreo={false} onChange={onChange} />);
  expect(screen.getByRole("switch", { name: "Avisar al inquilino" })).toBeDisabled();
  expect(screen.getByText(/desde los datos del inquilino/)).toBeInTheDocument();
  rerender(<ControlAvisosInquilino enabled tieneCorreo={false} onChange={onChange} />);
  await userEvent.click(screen.getByRole("switch", { name: "Avisar al inquilino" }));
  expect(onChange).toHaveBeenCalledWith(false);
});
