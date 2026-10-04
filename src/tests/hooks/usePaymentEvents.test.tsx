import { renderHook } from "@testing-library/react";
import { usePaymentEvents } from "@/hooks/usePaymentEvents";
import { FakeEventSource, instalarEventSourceFalso } from "@/tests/fake-event-source";

let Falso: typeof FakeEventSource;

beforeEach(() => {
  Falso = instalarEventSourceFalso();
});

function opciones(over: Partial<Parameters<typeof usePaymentEvents>[0]> = {}) {
  return {
    ruta: "/payments/events",
    onConectada: vi.fn(),
    onPagoActualizado: vi.fn(),
    onSesionPerdida: vi.fn(),
    ...over,
  };
}

describe("usePaymentEvents", () => {
  it("abre el stream de la ruta con cookies", () => {
    renderHook(() => usePaymentEvents(opciones()));

    expect(Falso.instancias).toHaveLength(1);
    expect(Falso.instancias[0].url).toMatch(/\/payments\/events$/);
    expect(Falso.instancias[0].init).toEqual({ withCredentials: true });
  });

  it("sin ruta no abre ningún stream", () => {
    renderHook(() => usePaymentEvents(opciones({ ruta: null })));
    expect(Falso.instancias).toHaveLength(0);
  });

  it("al conectarse, pide recargar los datos", () => {
    const o = opciones();
    renderHook(() => usePaymentEvents(o));

    Falso.instancias[0].emitir("connected");
    expect(o.onConectada).toHaveBeenCalledTimes(1);
  });

  it("entrega cada payment-updated con sus campos", () => {
    const o = opciones();
    renderHook(() => usePaymentEvents(o));

    const evento = { paymentId: 42, invoiceId: 7, contractId: 3, status: "REJECTED" };
    Falso.instancias[0].emitir("payment-updated", evento);
    expect(o.onPagoActualizado).toHaveBeenCalledWith(evento);
  });

  it("un evento que no se puede leer no rompe la pantalla", () => {
    const o = opciones();
    renderHook(() => usePaymentEvents(o));

    expect(() => Falso.instancias[0].emitirCrudo("payment-updated", "{no es json")).not.toThrow();
    expect(o.onPagoActualizado).not.toHaveBeenCalled();
  });

  it("replaced cierra el stream y no vuelve a conectarse", () => {
    renderHook(() => usePaymentEvents(opciones()));

    Falso.instancias[0].emitir("replaced");
    expect(Falso.instancias[0].readyState).toBe(FakeEventSource.CLOSED);
    expect(Falso.instancias).toHaveLength(1);
  });

  it("si el navegador cierra el stream (401), renueva la sesión y reconecta", async () => {
    const renovarSesion = vi.fn().mockResolvedValue(true);
    const o = opciones({ renovarSesion });
    renderHook(() => usePaymentEvents(o));

    Falso.instancias[0].fallar(FakeEventSource.CLOSED);
    await vi.waitFor(() => expect(Falso.instancias).toHaveLength(2));

    expect(renovarSesion).toHaveBeenCalledTimes(1);
    expect(o.onSesionPerdida).not.toHaveBeenCalled();
  });

  it("si no se puede renovar la sesión, avisa y no reconecta", async () => {
    const renovarSesion = vi.fn().mockResolvedValue(false);
    const o = opciones({ renovarSesion });
    renderHook(() => usePaymentEvents(o));

    Falso.instancias[0].fallar(FakeEventSource.CLOSED);
    await vi.waitFor(() => expect(o.onSesionPerdida).toHaveBeenCalledTimes(1));

    expect(Falso.instancias).toHaveLength(1);
  });

  it("sin renovación disponible, cerrado por el navegador avisa directo", async () => {
    const o = opciones();
    renderHook(() => usePaymentEvents(o));

    Falso.instancias[0].fallar(FakeEventSource.CLOSED);
    await vi.waitFor(() => expect(o.onSesionPerdida).toHaveBeenCalledTimes(1));
  });

  it("un error transitorio no hace nada: el navegador reintenta solo", () => {
    const o = opciones({ renovarSesion: vi.fn().mockResolvedValue(true) });
    renderHook(() => usePaymentEvents(o));

    Falso.instancias[0].fallar(FakeEventSource.CONNECTING);
    expect(o.renovarSesion).not.toHaveBeenCalled();
    expect(o.onSesionPerdida).not.toHaveBeenCalled();
  });

  it("al desmontar cierra el stream", () => {
    const { unmount } = renderHook(() => usePaymentEvents(opciones()));
    unmount();
    expect(Falso.instancias[0].readyState).toBe(FakeEventSource.CLOSED);
  });

  it("si se desmonta mientras renueva la sesión, no reconecta", async () => {
    let resolver: (valor: boolean) => void = () => {};
    const renovarSesion = vi.fn(() => new Promise<boolean>((resolve) => { resolver = resolve; }));
    const { unmount } = renderHook(() => usePaymentEvents(opciones({ renovarSesion })));

    Falso.instancias[0].fallar(FakeEventSource.CLOSED);
    unmount();
    resolver(true);
    await Promise.resolve();

    expect(Falso.instancias).toHaveLength(1);
  });
});
