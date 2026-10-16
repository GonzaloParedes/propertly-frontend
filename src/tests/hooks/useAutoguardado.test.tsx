import { act, renderHook } from "@testing-library/react";
import { useAutoguardado } from "@/hooks/useAutoguardado";
import { ApiError } from "@/lib/api";
import { ERROR } from "@/lib/error-codes";
import type { ContenidoDeBorrador } from "@/lib/borradores";

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    contractDrafts: { create: vi.fn(), update: vi.fn(), get: vi.fn(), remove: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";

const crear = vi.mocked(AlquiaBackendClient.contractDrafts.create);
const actualizar = vi.mocked(AlquiaBackendClient.contractDrafts.update);
const traer = vi.mocked(AlquiaBackendClient.contractDrafts.get);
const borrar = vi.mocked(AlquiaBackendClient.contractDrafts.remove);

const AHORA = "2026-10-15T12:00:00Z";

function borrador(id: number, version: number, contenido: ContenidoDeBorrador) {
  return { id, version, label: contenido.label, payload: contenido.payload, createdAt: AHORA, updatedAt: AHORA, expiresAt: AHORA, document: null };
}

const contenido = (alquiler: string, label = "Lavalle 950"): ContenidoDeBorrador => ({ label, payload: { paso: 3, alquiler } });

type Props = { activo: boolean; contenido: ContenidoDeBorrador; paso: number; inicial?: { id: number; version: number; contenido: ContenidoDeBorrador } | null };

function montar(props: Props) {
  return renderHook((actuales: Props) => useAutoguardado(actuales), { initialProps: props });
}

/** Deja correr los temporizadores y las promesas que dejaron pendientes. */
async function pasar(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  crear.mockImplementation(async (cuerpo) => borrador(5, 0, cuerpo));
  actualizar.mockImplementation(async (id, cuerpo) => borrador(id, cuerpo.version + 1, cuerpo));
  borrar.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutoguardado · cuándo nace el borrador", () => {
  it("no crea nada mientras el propietario no salió del primer paso, escriba lo que escriba", async () => {
    const { rerender, result } = montar({ activo: false, contenido: contenido("1"), paso: 1 });
    rerender({ activo: false, contenido: contenido("12"), paso: 1 });
    await pasar(10_000);

    expect(crear).not.toHaveBeenCalled();
    expect(actualizar).not.toHaveBeenCalled();
    expect(result.current.estado).toBe("inactivo");
    expect(result.current.id).toBeNull();
  });

  it("crea el borrador una sola vez cuando pasa a estar activo", async () => {
    const { rerender, result } = montar({ activo: false, contenido: contenido("450000"), paso: 1 });

    rerender({ activo: true, contenido: contenido("450000"), paso: 2 });
    await pasar(0);

    expect(crear).toHaveBeenCalledTimes(1);
    expect(crear).toHaveBeenCalledWith(contenido("450000"));
    expect(result.current.id).toBe(5);
    expect(result.current.estado).toBe("guardado");

    await pasar(10_000);
    expect(crear).toHaveBeenCalledTimes(1);
    expect(actualizar).not.toHaveBeenCalled();
  });
});

describe("useAutoguardado · cuándo guarda", () => {
  async function conBorrador() {
    const vista = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    return vista;
  }

  it("un cambio de paso guarda enseguida, con la versión que devolvió el alta", async () => {
    const { rerender } = await conBorrador();

    rerender({ activo: true, contenido: contenido("1"), paso: 3 });
    expect(actualizar).not.toHaveBeenCalled(); // mismo contenido: nada que mandar
    rerender({ activo: true, contenido: contenido("450000"), paso: 4 });
    await pasar(0);

    expect(actualizar).toHaveBeenCalledTimes(1);
    expect(actualizar).toHaveBeenCalledWith(5, { ...contenido("450000"), version: 0 }, undefined);
  });

  it("mientras escribe espera 2 segundos sin cambios, y entonces manda sólo lo último", async () => {
    const { rerender } = await conBorrador();

    rerender({ activo: true, contenido: contenido("12"), paso: 2 });
    await pasar(1500);
    rerender({ activo: true, contenido: contenido("123"), paso: 2 });
    await pasar(1500);
    expect(actualizar).not.toHaveBeenCalled();

    await pasar(500);

    expect(actualizar).toHaveBeenCalledTimes(1);
    expect(actualizar).toHaveBeenCalledWith(5, { ...contenido("123"), version: 0 }, undefined);
  });

  it("no manda nada si el contenido es el mismo aunque sea otro objeto o tenga las claves en otro orden", async () => {
    const { rerender } = await conBorrador();

    rerender({ activo: true, contenido: { payload: { alquiler: "1", paso: 3 }, label: "Lavalle 950" }, paso: 2 });
    await pasar(10_000);

    expect(actualizar).not.toHaveBeenCalled();
  });

  it("un cambio mientras viaja otro pedido espera al primero y manda sólo lo más nuevo, con la versión nueva", async () => {
    const { rerender, result } = await conBorrador();
    let terminar: (valor: ReturnType<typeof borrador>) => void = () => {};
    actualizar.mockImplementationOnce(() => new Promise((resolver) => { terminar = resolver; }));

    rerender({ activo: true, contenido: contenido("12"), paso: 3 });
    await pasar(0);
    expect(actualizar).toHaveBeenCalledTimes(1);
    expect(result.current.estado).toBe("guardando");

    rerender({ activo: true, contenido: contenido("123"), paso: 4 });
    rerender({ activo: true, contenido: contenido("1234"), paso: 5 });
    await pasar(5000);
    expect(actualizar).toHaveBeenCalledTimes(1); // ninguno sale mientras el primero viaja

    await act(async () => { terminar(borrador(5, 1, contenido("12"))); });
    await pasar(0);

    expect(actualizar).toHaveBeenCalledTimes(2);
    expect(actualizar).toHaveBeenLastCalledWith(5, { ...contenido("1234"), version: 1 }, undefined);
    expect(result.current.estado).toBe("guardado");
  });
});

describe("useAutoguardado · si falla", () => {
  it("avisa, reintenta con espera creciente y vuelve a «guardado» cuando se logra", async () => {
    const { rerender, result } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    actualizar.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    actualizar.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    rerender({ activo: true, contenido: contenido("12"), paso: 3 });
    await pasar(0);
    expect(result.current.estado).toBe("error");
    expect(actualizar).toHaveBeenCalledTimes(1);

    await pasar(1999);
    expect(actualizar).toHaveBeenCalledTimes(1);
    await pasar(1);
    expect(actualizar).toHaveBeenCalledTimes(2); // a los 2 s
    expect(result.current.estado).toBe("error");

    await pasar(4999);
    expect(actualizar).toHaveBeenCalledTimes(2);
    await pasar(1);
    expect(actualizar).toHaveBeenCalledTimes(3); // a los 5 s del segundo
    expect(result.current.estado).toBe("guardado");
    expect(actualizar).toHaveBeenLastCalledWith(5, { ...contenido("12"), version: 0 }, undefined);
  });

  it("si no se pudo crear, reintenta crearlo", async () => {
    crear.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { result } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    expect(result.current.estado).toBe("error");
    expect(result.current.id).toBeNull();

    await pasar(2000);

    expect(crear).toHaveBeenCalledTimes(2);
    expect(result.current.id).toBe(5);
    expect(result.current.estado).toBe("guardado");
  });

  it("un 409 de versión frena el guardado, dice la versión del otro y no insiste", async () => {
    const { rerender, result } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    actualizar.mockRejectedValueOnce(new ApiError(409, "x", ERROR.CONTRACT_DRAFT_VERSION_CONFLICT, null, { currentVersion: 4 }));

    rerender({ activo: true, contenido: contenido("12"), paso: 3 });
    await pasar(0);
    expect(result.current.estado).toBe("conflicto");
    expect(result.current.conflicto).toEqual({ versionActual: 4 });

    rerender({ activo: true, contenido: contenido("123"), paso: 4 });
    await pasar(60_000);
    expect(actualizar).toHaveBeenCalledTimes(1);
  });

  it("«conservar esta» vuelve a mandar con la versión del otro y retoma el guardado", async () => {
    const { rerender, result } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    actualizar.mockRejectedValueOnce(new ApiError(409, "x", ERROR.CONTRACT_DRAFT_VERSION_CONFLICT, null, { currentVersion: 4 }));
    rerender({ activo: true, contenido: contenido("12"), paso: 3 });
    await pasar(0);

    await act(async () => { await result.current.conservarEsta(); });

    expect(actualizar).toHaveBeenLastCalledWith(5, { ...contenido("12"), version: 4 }, undefined);
    expect(result.current.estado).toBe("guardado");
    expect(result.current.conflicto).toBeNull();

    rerender({ activo: true, contenido: contenido("123"), paso: 3 });
    await pasar(2000);
    expect(actualizar).toHaveBeenLastCalledWith(5, { ...contenido("123"), version: 5 }, undefined);
  });

  it("«cargar la otra» trae el borrador del otro dispositivo y no lo vuelve a guardar sin cambios", async () => {
    const { rerender, result } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    actualizar.mockRejectedValueOnce(new ApiError(409, "x", ERROR.CONTRACT_DRAFT_VERSION_CONFLICT, null, { currentVersion: 4 }));
    rerender({ activo: true, contenido: contenido("12"), paso: 3 });
    await pasar(0);
    // El backend guarda el JSON con otro orden de claves.
    traer.mockResolvedValueOnce(borrador(5, 4, { label: "Lavalle 950", payload: { alquiler: "999", paso: 3 } }));

    let otro: Awaited<ReturnType<typeof result.current.cargarLaOtra>> | undefined;
    await act(async () => { otro = await result.current.cargarLaOtra(); });
    expect(otro?.payload).toEqual({ alquiler: "999", paso: 3 });
    expect(result.current.conflicto).toBeNull();

    rerender({ activo: true, contenido: contenido("999"), paso: 3 });
    await pasar(10_000);
    expect(actualizar).toHaveBeenCalledTimes(1); // sólo el que chocó

    rerender({ activo: true, contenido: contenido("9990"), paso: 3 });
    await pasar(2000);
    expect(actualizar).toHaveBeenLastCalledWith(5, { ...contenido("9990"), version: 4 }, undefined);
  });

  it("un 409 por el límite de borradores lo dice y no insiste", async () => {
    crear.mockRejectedValueOnce(new ApiError(409, "x", ERROR.CONTRACT_DRAFT_LIMIT_REACHED, null, { limit: 3 }));
    const { rerender, result } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    expect(result.current.estado).toBe("limite");

    rerender({ activo: true, contenido: contenido("12"), paso: 3 });
    await pasar(60_000);

    expect(crear).toHaveBeenCalledTimes(1);
    expect(result.current.id).toBeNull();
  });

  it("un 404 al guardar (se descartó en otro dispositivo) frena sin volver a crearlo", async () => {
    const { rerender, result } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    actualizar.mockRejectedValueOnce(new ApiError(404, "x", null));

    rerender({ activo: true, contenido: contenido("12"), paso: 3 });
    await pasar(0);
    expect(result.current.estado).toBe("desaparecido");

    rerender({ activo: true, contenido: contenido("123"), paso: 4 });
    await pasar(60_000);
    expect(crear).toHaveBeenCalledTimes(1);
    expect(actualizar).toHaveBeenCalledTimes(1);
  });
});

describe("useAutoguardado · al cerrar la página", () => {
  async function conCambioSinGuardar() {
    const vista = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    vista.rerender({ activo: true, contenido: contenido("12345"), paso: 2 });
    return vista;
  }

  it("manda lo que quedó sin guardar con keepalive", async () => {
    await conCambioSinGuardar();

    await act(async () => { window.dispatchEvent(new Event("pagehide")); });

    expect(actualizar).toHaveBeenCalledTimes(1);
    expect(actualizar).toHaveBeenCalledWith(5, { ...contenido("12345"), version: 0 }, { keepalive: true });
  });

  it("al esconder la pestaña también, pero no al volver a mostrarla", async () => {
    await conCambioSinGuardar();

    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(actualizar).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(actualizar).toHaveBeenCalledWith(5, { ...contenido("12345"), version: 0 }, { keepalive: true });
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });

  it("si cambió de pestaña y volvió, el siguiente guardado sigue con la versión nueva", async () => {
    const { rerender } = await conCambioSinGuardar();
    await act(async () => { window.dispatchEvent(new Event("pagehide")); });
    await pasar(0);

    rerender({ activo: true, contenido: contenido("123456"), paso: 2 });
    await pasar(2000);

    expect(actualizar).toHaveBeenLastCalledWith(5, { ...contenido("123456"), version: 1 }, undefined);
  });

  it("no manda nada si está todo guardado, ni si todavía no hay borrador", async () => {
    montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    await act(async () => { window.dispatchEvent(new Event("pagehide")); });
    expect(actualizar).not.toHaveBeenCalled();

    const sinBorrador = montar({ activo: false, contenido: contenido("9"), paso: 1 });
    await act(async () => { window.dispatchEvent(new Event("pagehide")); });
    expect(actualizar).not.toHaveBeenCalled();
    expect(sinBorrador.result.current.id).toBeNull();
  });
});

describe("useAutoguardado · retomando un borrador", () => {
  const inicial = { id: 8, version: 3, contenido: contenido("450000") };

  it("no guarda nada al abrirlo ni cuando el backend devolvió las claves en otro orden", async () => {
    const reordenado: ContenidoDeBorrador = { label: "Lavalle 950", payload: { alquiler: "450000", paso: 3 } };
    const { result } = montar({ activo: true, contenido: contenido("450000"), paso: 3, inicial: { ...inicial, contenido: reordenado } });
    await pasar(10_000);

    expect(crear).not.toHaveBeenCalled();
    expect(actualizar).not.toHaveBeenCalled();
    expect(result.current.id).toBe(8);
  });

  it("un cambio lo actualiza con la versión con que se abrió", async () => {
    const { rerender } = montar({ activo: true, contenido: contenido("450000"), paso: 3, inicial });

    rerender({ activo: true, contenido: contenido("460000"), paso: 3, inicial });
    await pasar(2000);

    expect(crear).not.toHaveBeenCalled();
    expect(actualizar).toHaveBeenCalledWith(8, { ...contenido("460000"), version: 3 }, undefined);
  });

  it("si lo que se retoma ya no coincide con lo guardado (se limpió algo), lo guarda solo", async () => {
    montar({ activo: true, contenido: contenido("450000", "Lavalle 950 · Pérez"), paso: 3, inicial });
    await pasar(2000);

    expect(actualizar).toHaveBeenCalledTimes(1);
  });
});

describe("useAutoguardado · salir, crear y descartar", () => {
  it("guardarAhora manda lo pendiente sin esperar los 2 segundos y dice si quedó guardado", async () => {
    const { rerender, result } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    rerender({ activo: true, contenido: contenido("12"), paso: 2 });

    let ok = false;
    await act(async () => { ok = await result.current.guardarAhora(); });

    expect(ok).toBe(true);
    expect(actualizar).toHaveBeenCalledWith(5, { ...contenido("12"), version: 0 }, undefined);
  });

  it("guardarAhora con todo ya guardado no traba los guardados que vienen después", async () => {
    const { rerender, result } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);

    await act(async () => { await result.current.guardarAhora(); });
    await act(async () => { await result.current.guardarAhora(); });
    rerender({ activo: true, contenido: contenido("12"), paso: 2 });
    await pasar(2000);

    expect(actualizar).toHaveBeenCalledTimes(1);
    expect(actualizar).toHaveBeenCalledWith(5, { ...contenido("12"), version: 0 }, undefined);
  });

  it("guardarAhora dice que no quedó guardado si el pedido falla", async () => {
    const { rerender, result } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    actualizar.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    rerender({ activo: true, contenido: contenido("12"), paso: 2 });

    let ok = true;
    await act(async () => { ok = await result.current.guardarAhora(); });

    expect(ok).toBe(false);
  });

  it("guardarAhora sin borrador (no salió del primer paso) no hace nada y no es un fallo", async () => {
    const { result } = montar({ activo: false, contenido: contenido("1"), paso: 1 });

    let ok = false;
    await act(async () => { ok = await result.current.guardarAhora(); });

    expect(ok).toBe(true);
    expect(crear).not.toHaveBeenCalled();
  });

  it("congelar espera el pedido que viaja y no deja salir otro; descongelar retoma", async () => {
    const { rerender, result } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    let terminar: (valor: ReturnType<typeof borrador>) => void = () => {};
    actualizar.mockImplementationOnce(() => new Promise((resolver) => { terminar = resolver; }));
    rerender({ activo: true, contenido: contenido("12"), paso: 3 });
    await pasar(0);

    let esperado = false;
    const congelando = result.current.congelar().then(() => { esperado = true; });
    await pasar(0);
    expect(esperado).toBe(false);

    await act(async () => { terminar(borrador(5, 1, contenido("12"))); await congelando; });
    expect(esperado).toBe(true);

    rerender({ activo: true, contenido: contenido("123"), paso: 4 });
    await pasar(10_000);
    expect(actualizar).toHaveBeenCalledTimes(1);

    act(() => { result.current.descongelar(); });
    await pasar(0);
    expect(actualizar).toHaveBeenCalledTimes(2);
  });

  it("al desmontarse con cambios sin guardar manda lo último con keepalive", async () => {
    const { rerender, unmount } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    rerender({ activo: true, contenido: contenido("12"), paso: 2 });

    unmount();
    await pasar(0);

    expect(actualizar).toHaveBeenCalledTimes(1);
    expect(actualizar).toHaveBeenCalledWith(5, { ...contenido("12"), version: 0 }, { keepalive: true });
  });

  it("al desmontarse con todo guardado, o ya detenido, no manda nada", async () => {
    const limpio = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    limpio.unmount();
    const detenido = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);
    detenido.rerender({ activo: true, contenido: contenido("12"), paso: 2 });
    act(() => { detenido.result.current.detener(); });
    detenido.unmount();
    await pasar(0);

    expect(actualizar).not.toHaveBeenCalled();
  });

  it("detener corta el guardado para siempre", async () => {
    const { rerender, result } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);

    act(() => { result.current.detener(); });
    rerender({ activo: true, contenido: contenido("12"), paso: 3 });
    await pasar(60_000);
    await act(async () => { window.dispatchEvent(new Event("pagehide")); });

    expect(actualizar).not.toHaveBeenCalled();
  });

  it("descartar espera el pedido que viaja, borra el borrador y no guarda más", async () => {
    const { rerender, result } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);

    await act(async () => { await result.current.descartar(); });
    rerender({ activo: true, contenido: contenido("12"), paso: 3 });
    await pasar(60_000);

    expect(borrar).toHaveBeenCalledWith(5);
    expect(actualizar).not.toHaveBeenCalled();
    expect(result.current.id).toBeNull();
  });

  it("descartar en pleno alta espera a que el borrador exista y recién entonces lo borra", async () => {
    let creado: (valor: ReturnType<typeof borrador>) => void = () => {};
    crear.mockImplementationOnce(() => new Promise((resolver) => { creado = resolver; }));
    const { result } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);

    let listo = false;
    const descartando = result.current.descartar().then(() => { listo = true; });
    await pasar(0);
    expect(borrar).not.toHaveBeenCalled();

    await act(async () => { creado(borrador(5, 0, contenido("1"))); await descartando; });

    expect(listo).toBe(true);
    expect(borrar).toHaveBeenCalledWith(5);
  });

  it("adoptarVersion hace que el próximo guardado use la versión que subió el PDF", async () => {
    const { rerender, result } = montar({ activo: true, contenido: contenido("1"), paso: 2 });
    await pasar(0);

    act(() => { result.current.adoptarVersion(7); });
    rerender({ activo: true, contenido: contenido("12"), paso: 3 });
    await pasar(0);

    expect(actualizar).toHaveBeenCalledWith(5, { ...contenido("12"), version: 7 }, undefined);
  });
});
