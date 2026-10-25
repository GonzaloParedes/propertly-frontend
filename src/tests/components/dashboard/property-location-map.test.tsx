import type { ReactNode } from "react";
import { render, screen, fireEvent, act } from "@/tests/render";
import PropertyLocationMap from "@/components/dashboard/PropertyLocationMap";

// Capturamos el handler de "toque en el mapa" que registra el canvas, para poder
// simular que el propietario toca un punto sin un mapa real.
const eventos = vi.hoisted(() => ({ click: undefined as undefined | ((e: { latlng: { lat: number; lng: number } }) => void) }));

vi.mock("@/components/dashboard/AlquiaVectorLayer", () => ({ default: () => null }));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children?: ReactNode }) => <div data-testid="map">{children}</div>,
  // El pin del mapa real; al "clickearlo" disparamos su `dragend` como si el
  // propietario lo hubiera arrastrado a otro punto.
  Marker: ({ eventHandlers }: { eventHandlers?: { dragend?: (e: { target: { getLatLng: () => { lat: number; lng: number } } }) => void } }) => (
    <button
      type="button"
      data-testid="pin"
      onClick={() => eventHandlers?.dragend?.({ target: { getLatLng: () => ({ lat: -31.4201, lng: -64.1888 }) } })}
    />
  ),
  useMap: () => ({ invalidateSize: () => {}, setView: () => {} }),
  useMapEvents: (handlers: { click?: (e: { latlng: { lat: number; lng: number } }) => void }) => {
    eventos.click = handlers.click;
    return {};
  },
}));

afterEach(() => {
  vi.clearAllMocks();
  eventos.click = undefined;
});

test("Caso A: con coordenadas muestra el pin, pide verificar y lista la ubicación", async () => {
  render(<PropertyLocationMap latitude={-34.6037} longitude={-58.3816} onChange={vi.fn()} />);

  expect(await screen.findByTestId("pin")).toBeInTheDocument();
  expect(screen.getByText(/Verifique la ubicación/i)).toBeInTheDocument();
  expect(screen.getByText(/Ubicación marcada: -34\.60370, -58\.38160/)).toBeInTheDocument();
});

test("Caso B: sin coordenadas no hay pin, pide marcar y la ubicación queda sin marcar", async () => {
  render(<PropertyLocationMap latitude={null} longitude={null} onChange={vi.fn()} />);

  expect(await screen.findByTestId("map")).toBeInTheDocument();
  expect(screen.queryByTestId("pin")).not.toBeInTheDocument();
  expect(screen.getByText(/Toque el mapa para marcar/i)).toBeInTheDocument();
  expect(screen.getByText(/Ubicación sin marcar/)).toBeInTheDocument();
});

test("Caso B: tocar el mapa reporta las coordenadas del punto", async () => {
  const onChange = vi.fn();
  render(<PropertyLocationMap latitude={null} longitude={null} onChange={onChange} />);
  await screen.findByTestId("map");

  act(() => {
    eventos.click?.({ latlng: { lat: -34.9, lng: -57.95 } });
  });

  expect(onChange).toHaveBeenCalledWith({ latitude: -34.9, longitude: -57.95 });
});

test("Caso A: arrastrar el pin reporta las nuevas coordenadas", async () => {
  const onChange = vi.fn();
  render(<PropertyLocationMap latitude={-34.6037} longitude={-58.3816} onChange={onChange} />);

  fireEvent.click(await screen.findByTestId("pin"));

  expect(onChange).toHaveBeenCalledWith({ latitude: -31.4201, longitude: -64.1888 });
});
