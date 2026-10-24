import { StrictMode } from "react";
import { render, screen, fireEvent, act } from "@/tests/render";
import RentEstimateCard from "@/components/dashboard/RentEstimateCard";
import type { ComparableListing, ListingSource, RentEstimate } from "@/lib/backend-types";
import { ApiError } from "@/lib/api";

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    properties: { getRentEstimate: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockGetRentEstimate = vi.mocked(AlquiaBackendClient.properties.getRentEstimate);

const SOURCES: ListingSource[] = [
  "ZONAPROP",
  "ARGENPROP",
  "MERCADO_LIBRE",
  "PROPERATI",
  "REMAX",
];

// Las primeras tres son comparables (las más parecidas); el resto son parte del
// mercado que respaldó la estimación pero sin destacar.
const COMPARABLES: ComparableListing[] = Array.from({ length: 8 }, (_, i) => ({
  source: SOURCES[i % SOURCES.length],
  title: `${48 + i} m² en Palermo`,
  monthlyRent: 600000 + i * 7000,
  currency: "ARS",
  coveredArea: 48 + i,
  bedrooms: 1,
  latitude: -34.58 + i * 0.001,
  longitude: -58.43 + i * 0.001,
  url: `https://portal.example/aviso/${i}`,
  comparable: i < 3,
}));

const ESTIMATE: RentEstimate = {
  estimatedMonthlyRent: 650000,
  currency: "ARS",
  range: { low: 580000, high: 720000 },
  listingsConsidered: 42,
  listings: COMPARABLES,
  subjectLocation: { latitude: -34.6, longitude: -58.42 },
  confidence: "HIGH",
  estimatedAt: "2026-10-12T15:00:00Z",
};

function clickButton(name: RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

test("shows the loading state and then the estimate with its disclaimer", async () => {
  vi.useFakeTimers();
  mockGetRentEstimate.mockResolvedValue(ESTIMATE);

  render(<RentEstimateCard propertyId={7} />);
  clickButton(/sugerir alquiler/i);

  expect(screen.getByText("Estimando…")).toBeInTheDocument();

  // El resultado solo aparece al pasar el piso de tiempo, aunque el backend ya contestó.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2200);
  });

  expect(screen.getByText("Predicción lista.")).toBeInTheDocument();
  expect(screen.getByText("$ 650.000")).toBeInTheDocument();
  expect(screen.getByText(/580\.000/)).toBeInTheDocument();
  expect(screen.getByText(/720\.000/)).toBeInTheDocument();
  expect(screen.getByText("Basado en 42 propiedades del mercado")).toBeInTheDocument();
  expect(screen.getByText("Confianza alta")).toBeInTheDocument();
  expect(screen.getByText(/valor estimado y puede tener margen de error/i)).toBeInTheDocument();

  // La lista con todas las propiedades, su fuente (logo o chip), y el mapa. Los
  // comparables (las tres primeras) se distinguen con el chip "Comparable".
  expect(screen.getByText("Propiedades del mercado")).toBeInTheDocument();
  expect(screen.getAllByText("Comparable")).toHaveLength(3);
  expect(screen.getByAltText("Properati")).toBeInTheDocument();
  expect(screen.getAllByAltText("ZonaProp").length).toBeGreaterThan(0);

  // Cada comparable enlaza a su aviso en la fuente y se abre en otra pestaña.
  const enlace = screen.getByRole("link", { name: /48 m² en Palermo/ });
  expect(enlace).toHaveAttribute("href", "https://portal.example/aviso/0");
  expect(enlace).toHaveAttribute("target", "_blank");
  expect(enlace).toHaveAttribute("rel", expect.stringContaining("noopener"));

  // El mapa (Leaflet, carga diferida) aparece con el pin de la propiedad y los
  // de los comparables. Con timers reales esperamos a que monte el canvas dinámico.
  expect(screen.getByLabelText("Mapa de comparables")).toBeInTheDocument();
  vi.useRealTimers();
  expect(await screen.findByText("Esta propiedad")).toBeInTheDocument();
  expect(screen.getAllByTestId("map-marker")).toHaveLength(1 + COMPARABLES.length);

  expect(mockGetRentEstimate).toHaveBeenCalledWith(7);
});

test("works under StrictMode's mount/unmount/remount cycle", async () => {
  // Regresión: con el patrón «ref de montado», Strict Mode (activo en next dev)
  // dejaba el ref en false tras el primer desmontaje y el resultado nunca se
  // mostraba aunque el backend respondiera.
  vi.useFakeTimers();
  mockGetRentEstimate.mockResolvedValue(ESTIMATE);

  render(
    <StrictMode>
      <RentEstimateCard propertyId={7} />
    </StrictMode>
  );
  clickButton(/sugerir alquiler/i);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(2300);
  });

  expect(screen.getByText("Predicción lista.")).toBeInTheDocument();
  expect(screen.getByText("$ 650.000")).toBeInTheDocument();
});

test("does not reveal the result before the time floor elapses", async () => {
  vi.useFakeTimers();
  mockGetRentEstimate.mockResolvedValue(ESTIMATE);

  render(<RentEstimateCard propertyId={7} />);
  clickButton(/sugerir alquiler/i);

  // Well before the ~2.2s floor: the fetch may have resolved, but no result yet.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(screen.queryByText("Predicción lista.")).not.toBeInTheDocument();
  expect(screen.queryByText("$ 650.000")).not.toBeInTheDocument();
});

test("shows an error message and allows retrying", async () => {
  vi.useFakeTimers();
  mockGetRentEstimate.mockRejectedValueOnce(new ApiError(503, "Service Unavailable"));

  render(<RentEstimateCard propertyId={7} />);
  clickButton(/sugerir alquiler/i);

  // The rejection resolves on the microtask queue; flush it.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(
    screen.getByText("No pudimos estimar el alquiler ahora. Probá de nuevo en un momento.")
  ).toBeInTheDocument();

  // Retry succeeds this time.
  mockGetRentEstimate.mockResolvedValue(ESTIMATE);
  clickButton(/reintentar/i);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2200);
  });
  expect(screen.getByText("$ 650.000")).toBeInTheDocument();
});

test("tells the user when the predictor is unavailable", async () => {
  vi.useFakeTimers();
  mockGetRentEstimate.mockRejectedValueOnce(
    new ApiError(503, "Service Unavailable", "urn:alquia:error:rent-estimate-unavailable")
  );

  render(<RentEstimateCard propertyId={7} />);
  clickButton(/sugerir alquiler/i);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(
    screen.getByText(
      "El estimador de alquiler no está disponible en este momento. Probá de nuevo en un rato."
    )
  ).toBeInTheDocument();
});

test("tells the user when no market data has been loaded yet", async () => {
  vi.useFakeTimers();
  mockGetRentEstimate.mockRejectedValueOnce(
    new ApiError(409, "Conflict", "urn:alquia:error:rent-estimate-no-data")
  );

  render(<RentEstimateCard propertyId={7} />);
  clickButton(/sugerir alquiler/i);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(
    screen.getByText(
      "El estimador está disponible, pero todavía no hay propiedades cargadas para estimar."
    )
  ).toBeInTheDocument();
});

test("tells the user when there isn't enough market data", async () => {
  vi.useFakeTimers();
  mockGetRentEstimate.mockRejectedValueOnce(
    new ApiError(422, "Unprocessable", "urn:alquia:error:rent-estimate-not-enough-data")
  );

  render(<RentEstimateCard propertyId={7} />);
  clickButton(/sugerir alquiler/i);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(
    screen.getByText(
      "No hay suficientes propiedades cerca para estimar el alquiler de esta propiedad."
    )
  ).toBeInTheDocument();
});
