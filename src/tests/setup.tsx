import "@testing-library/jest-dom/vitest";
import { useEffect, useState } from "react";
import type { ComponentPropsWithoutRef, ComponentType, ReactNode } from "react";

// Node 25 trae su propio `localStorage` (Web Storage) y, sin `--localstorage-file`, pisa el de jsdom con
// un objeto sin métodos. Si pasa, se lo reemplaza por uno en memoria con la misma interfaz.
if (typeof window.localStorage?.getItem !== "function") {
  const datos = new Map<string, string>();
  const enMemoria: Storage = {
    get length() { return datos.size; },
    clear: () => datos.clear(),
    getItem: (clave) => datos.get(clave) ?? null,
    key: (indice) => [...datos.keys()][indice] ?? null,
    removeItem: (clave) => { datos.delete(clave); },
    setItem: (clave, valor) => { datos.set(clave, String(valor)); },
  };
  Object.defineProperty(window, "localStorage", { value: enMemoria, configurable: true });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Leaflet toca el DOM/`window` del mapa real; en jsdom lo stubbeamos a DOM plano
// para poder afirmar que el mapa y sus pines se renderizan, sin cargar Leaflet.
vi.mock("leaflet", () => ({
  default: { divIcon: () => ({}), latLngBounds: () => ({}) },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => null,
  Marker: ({ children }: { children?: ReactNode }) => (
    <div data-testid="map-marker">{children}</div>
  ),
  Popup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  useMap: () => ({
    invalidateSize: () => {},
    fitBounds: () => {},
    getContainer: () => document.createElement("div"),
  }),
}));

// `next/dynamic` carga el canvas del mapa de forma diferida; acá lo resolvemos
// tras montar para que el test lo vea sin depender del runtime de Next.
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: ComponentType<Record<string, unknown>> }>) =>
    function DynamicStub(props: Record<string, unknown>) {
      // Se guarda el componente envuelto en un objeto (no con el updater funcional
      // `setComp(() => m.default)`): así se evita una función anidada de más y la
      // promesa se marca con `void` porque su resultado se ignora a propósito.
      const [cargado, setCargado] = useState<{
        Componente: ComponentType<Record<string, unknown>>;
      } | null>(null);
      useEffect(() => {
        let active = true;
        void loader().then((m) => {
          if (active) setCargado({ Componente: m.default });
        });
        return () => {
          active = false;
        };
      }, []);
      return cargado ? <cargado.Componente {...props} /> : null;
    },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

type MockImageProps = {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  style?: ComponentPropsWithoutRef<"img">["style"];
  [key: string]: unknown;
};

vi.mock("next/image", () => ({
  default: ({ src, alt, width, height, className, style }: MockImageProps) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt ?? ""} width={width} height={height} className={className} style={style} />;
  },
}));

type MockLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  style?: ComponentPropsWithoutRef<"a">["style"];
  [key: string]: unknown;
};

vi.mock("next/link", () => ({
  default: ({ href, children, className, style }: MockLinkProps) => (
    <a href={href} className={className} style={style}>
      {children}
    </a>
  ),
}));
