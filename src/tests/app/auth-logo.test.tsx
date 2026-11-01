import { render, screen } from "@testing-library/react";
import LoginPage from "@/app/login/page";
import RegistroPage from "@/app/registro/page";
import OlvidarContrasenaPage from "@/app/olvidar-contrasena/page";
import RestablecerContrasenaPage from "@/app/restablecer-contrasena/page";
import ConfirmarCorreoPage from "@/app/confirmar-correo/page";

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

// En celular el header índigo y en escritorio el panel de marca: los dos logos
// tienen que llevar al inicio, en todas las pantallas de auth.
describe.each([
  ["login", LoginPage],
  ["registro", RegistroPage],
  ["olvidar contraseña", OlvidarContrasenaPage],
  ["restablecer contraseña", RestablecerContrasenaPage],
  ["confirmar correo", ConfirmarCorreoPage],
])("%s", (_nombre, Pagina) => {
  it("lleva al inicio desde el logo, en celular y en escritorio", () => {
    render(<Pagina />);
    const logos = screen.getAllByRole("link", { name: "Alquia — volver al inicio" });
    expect(logos).toHaveLength(2);
    for (const logo of logos) expect(logo).toHaveAttribute("href", "/");
  });
});
