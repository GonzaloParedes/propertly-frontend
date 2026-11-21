import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { StrictMode } from "react";
import { loadMetaPixel, metaPixelId, trackFirstProperty, trackMeta } from "@/lib/meta-pixel";
import { MetaPixel } from "@/components/MetaPixel";

const ruta = vi.hoisted(() => ({ actual: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => ruta.actual }));

const scriptDePixel = () => document.querySelector('script[src*="facebook.net"]');

function activar(id = "1234567890") {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", id);
}

beforeEach(() => {
  delete window.fbq;
  delete window._fbq;
  window.localStorage.clear();
  document.head.querySelectorAll("script").forEach((s) => s.remove());
});
afterEach(() => vi.unstubAllEnvs());

describe("píxel apagado", () => {
  it.each([
    ["fuera de production, con ID", () => { vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "1234567890"); }],
    ["en production sin ID", () => { vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", ""); }],
    ["en production con ID inválido", () => activar("abc'); alert(1);//")],
  ])("%s: no inyecta el script ni dispara nada", (_n, setup) => {
    setup();
    expect(metaPixelId()).toBeNull();
    expect(loadMetaPixel()).toBe(false);
    expect(scriptDePixel()).toBeNull();
    expect(window.fbq).toBeUndefined();

    const fbq = vi.fn();
    window.fbq = fbq as never;
    trackMeta("CompleteRegistration");
    trackFirstProperty(false);
    expect(fbq).not.toHaveBeenCalled();
  });

  it("el componente no inyecta nada ni manda PageView", () => {
    vi.stubEnv("NODE_ENV", "test");
    render(<MetaPixel />);
    expect(scriptDePixel()).toBeNull();
    expect(window.fbq).toBeUndefined();
  });
});

describe("trackMeta", () => {
  it("es no-op si el píxel está activo pero todavía no se cargó", () => {
    activar();
    expect(() => trackMeta("PageView")).not.toThrow();
  });

  it("usa track para estándar y trackCustom para custom, sin datos de usuario", () => {
    activar();
    const fbq = vi.fn();
    window.fbq = fbq as never;
    trackMeta("CompleteRegistration");
    trackMeta("FirstPropertyCreated");
    expect(fbq).toHaveBeenNthCalledWith(1, "track", "CompleteRegistration");
    expect(fbq).toHaveBeenNthCalledWith(2, "trackCustom", "FirstPropertyCreated");
  });
});

describe("loadMetaPixel", () => {
  it("en production con ID inyecta fbevents una sola vez e inicializa sin user data", () => {
    activar();
    expect(loadMetaPixel()).toBe(true);
    expect(loadMetaPixel()).toBe(false);
    expect(document.querySelectorAll('script[src="https://connect.facebook.net/en_US/fbevents.js"]')).toHaveLength(1);
    const llamadas = window.fbq!.queue;
    expect(llamadas).toContainEqual(["init", "1234567890"]);
    expect(llamadas.some((c) => c[0] === "track")).toBe(false);
  });
});

describe("trackFirstProperty", () => {
  beforeEach(() => {
    activar();
    window.fbq = vi.fn() as never;
  });

  it("dispara sólo si no tenía propiedades, y una sola vez por navegador", () => {
    trackFirstProperty(false);
    trackFirstProperty(false);
    expect(window.fbq).toHaveBeenCalledTimes(1);
    expect(window.fbq).toHaveBeenCalledWith("trackCustom", "FirstPropertyCreated");
  });

  it.each([true, null])("no dispara si teniaPropiedades es %s", (v) => {
    trackFirstProperty(v);
    expect(window.fbq).not.toHaveBeenCalled();
  });
});

describe("<MetaPixel /> activo", () => {
  it("manda un PageView por ruta, sin duplicar en Strict Mode, y omite rutas con token", () => {
    activar();
    ruta.actual = "/";
    const { rerender } = render(<StrictMode><MetaPixel /></StrictMode>);
    const pv = () => window.fbq!.queue.filter((c) => c[0] === "track" && c[1] === "PageView");
    expect(pv()).toHaveLength(1);

    ruta.actual = "/dashboard";
    rerender(<StrictMode><MetaPixel /></StrictMode>);
    expect(pv()).toHaveLength(2);

    ruta.actual = "/restablecer-contrasena";
    rerender(<StrictMode><MetaPixel /></StrictMode>);
    expect(pv()).toHaveLength(2);
  });
});
