import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "@/components/ui/Toast";

function Disparador() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.exito("Propiedad agregada.")}>exito</button>
      <button onClick={() => toast.error("No pudimos descargar el documento.")}>error</button>
      <button onClick={() => ["uno", "dos", "tres", "cuatro"].forEach((m) => toast.exito(m))}>varios</button>
    </>
  );
}

function region(tipo: "exito" | "error") {
  return document.querySelector(`[data-toasts="${tipo}"]`) as HTMLElement;
}

function abrir() {
  return render(<ToastProvider><Disparador /></ToastProvider>);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("toasts", () => {
  it("el éxito se anuncia con cortesía y el error con prioridad", async () => {
    abrir();
    await userEvent.click(screen.getByText("exito"));
    await userEvent.click(screen.getByText("error"));

    const exito = region("exito");
    const error = region("error");
    expect(exito).toHaveAttribute("aria-live", "polite");
    expect(exito).toHaveTextContent("Listo: Propiedad agregada.");
    expect(error).toHaveAttribute("aria-live", "assertive");
    expect(error).toHaveTextContent("Error: No pudimos descargar el documento.");
  });

  it("las regiones existen vacías antes del primer aviso", () => {
    abrir();
    expect(region("exito")).toBeEmptyDOMElement();
    expect(region("error")).toBeEmptyDOMElement();
  });

  it("no roba el foco", async () => {
    abrir();
    await userEvent.click(screen.getByText("exito"));
    expect(screen.getByText("exito")).toHaveFocus();
  });

  it("el éxito se va solo pasados unos segundos", () => {
    vi.useFakeTimers();
    abrir();
    act(() => screen.getByText("exito").click());
    expect(screen.getByText(/Propiedad agregada/)).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(6100); });

    expect(screen.queryByText(/Propiedad agregada/)).not.toBeInTheDocument();
  });

  it("el error se queda hasta que se cierra", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    abrir();
    await userEvent.click(screen.getByText("error"));

    act(() => { vi.advanceTimersByTime(60000); });
    expect(screen.getByText(/No pudimos descargar/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByText(/No pudimos descargar/)).not.toBeInTheDocument();
  });

  it("no se cierra mientras el puntero está encima", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    abrir();
    await userEvent.click(screen.getByText("exito"));

    await userEvent.hover(screen.getByText(/Propiedad agregada/));
    act(() => { vi.advanceTimersByTime(20000); });

    expect(screen.getByText(/Propiedad agregada/)).toBeInTheDocument();
  });

  it("con cuatro seguidos se ven los tres más recientes", async () => {
    abrir();
    await userEvent.click(screen.getByText("varios"));

    expect(screen.queryByText(/uno/)).not.toBeInTheDocument();
    expect(screen.getByText(/dos/)).toBeInTheDocument();
    expect(screen.getByText(/cuatro/)).toBeInTheDocument();
  });

  it("usarlo sin proveedor falla en vez de ocultar el aviso", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Disparador />)).toThrow(/ToastProvider/);
  });
});
