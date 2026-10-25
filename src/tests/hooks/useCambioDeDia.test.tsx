import { act, renderHook } from "@testing-library/react";
import { useCambioDeDia } from "@/hooks/useCambioDeDia";

// 23:50 del 10/10 en Buenos Aires (UTC-3).
const ANTES_DE_MEDIANOCHE = new Date("2026-10-11T02:50:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(ANTES_DE_MEDIANOCHE);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCambioDeDia", () => {
  it("avisa una sola vez cuando pasa la medianoche argentina", () => {
    const alCambiar = vi.fn();
    renderHook(() => useCambioDeDia({ activo: true, alCambiar }));

    act(() => { vi.advanceTimersByTime(9 * 60_000); });
    expect(alCambiar).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(60_000); }); // 00:00 del 11/10
    expect(alCambiar).toHaveBeenCalledTimes(1);

    act(() => { vi.advanceTimersByTime(60 * 60_000); }); // sigue siendo el 11/10
    expect(alCambiar).toHaveBeenCalledTimes(1);
  });

  it("no mira la hora UTC: la medianoche UTC (21:00 argentinas) no cuenta", () => {
    vi.setSystemTime(new Date("2026-10-10T23:50:00Z")); // 20:50 en Buenos Aires
    const alCambiar = vi.fn();
    renderHook(() => useCambioDeDia({ activo: true, alCambiar }));

    act(() => { vi.advanceTimersByTime(20 * 60_000); }); // ya es 11/10 en UTC, 21:10 en Buenos Aires
    expect(alCambiar).not.toHaveBeenCalled();
  });

  it("si la pestaña estaba dormida, se da cuenta al volver a verla", () => {
    const alCambiar = vi.fn();
    renderHook(() => useCambioDeDia({ activo: true, alCambiar }));

    vi.setSystemTime(new Date("2026-10-11T12:00:00Z")); // pasó la noche sin que corrieran los timers
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(alCambiar).toHaveBeenCalledTimes(1);
  });

  it("sin nada que dependa del día no vigila", () => {
    const alCambiar = vi.fn();
    renderHook(() => useCambioDeDia({ activo: false, alCambiar }));

    act(() => { vi.advanceTimersByTime(30 * 60_000); });
    expect(alCambiar).not.toHaveBeenCalled();
  });

  it("al desmontar deja de vigilar", () => {
    const alCambiar = vi.fn();
    const { unmount } = renderHook(() => useCambioDeDia({ activo: true, alCambiar }));
    unmount();

    act(() => { vi.advanceTimersByTime(30 * 60_000); });
    expect(alCambiar).not.toHaveBeenCalled();
  });
});
