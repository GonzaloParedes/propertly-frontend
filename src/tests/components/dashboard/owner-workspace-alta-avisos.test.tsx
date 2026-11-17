import { render, screen } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock("@/components/dashboard/CreationWizard", () => ({
  default: function AsistenteFalso({ onComplete }: { onComplete?: (resultado?: { avisosActivados?: boolean; avisosSinActivar?: boolean }) => void }) {
    return (
      <section aria-label="Asistente de nuevo contrato">
        <button type="button" onClick={() => onComplete?.()}>Completar sin avisos</button>
        <button type="button" onClick={() => onComplete?.({ avisosActivados: true })}>Completar con avisos</button>
        <button type="button" onClick={() => onComplete?.({ avisosSinActivar: true })}>Completar con falla de avisos</button>
      </section>
    );
  },
}));

const SIN_ENVIO = "Listo: Contrato creado. Podés activar los avisos al inquilino desde su detalle.";
const CON_ENLACE = "Listo: Contrato creado. Le enviamos al inquilino su enlace por correo.";
const FALLA = "Aviso: El contrato se creó, pero no pudimos activar los avisos al inquilino. Podés activarlos desde su detalle.";

function toasts() {
  return document.querySelector('[data-toasts="exito"]') as HTMLElement;
}

async function completar(nombre: string) {
  render(<OwnerWorkspace initialView="contratos" demo />);
  await userEvent.click(screen.getByRole("button", { name: "Nuevo contrato" }));
  await userEvent.click(await screen.findByRole("button", { name: nombre }));
}

describe("toast al crear un contrato", () => {
  it("con los avisos apagados no menciona ningún envío y dice que se activan desde el detalle", async () => {
    await completar("Completar sin avisos");

    expect(toasts()).toHaveTextContent(SIN_ENVIO);
    expect(toasts()).not.toHaveTextContent(/correo|enviamos/);
  });

  it("si el propietario los prendió y el PUT respondió bien, dice que le enviamos el enlace", async () => {
    await completar("Completar con avisos");

    expect(toasts()).toHaveTextContent(CON_ENLACE);
    expect(screen.queryByText(/no pudimos activar los avisos/)).not.toBeInTheDocument();
  });

  it("si falló el PUT, el éxito no menciona el envío y el aviso de falla está en voseo", async () => {
    await completar("Completar con falla de avisos");

    expect(toasts()).toHaveTextContent(SIN_ENVIO);
    expect(toasts()).toHaveTextContent(FALLA);
    expect(toasts()).not.toHaveTextContent(/correo|enviamos|Puede activarlos/);
  });
});
