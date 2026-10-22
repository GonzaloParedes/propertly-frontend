"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

/**
 * Tarjeta de ubicación del alta/edición de una propiedad (ALQ-92): un mapa
 * interactivo donde el propietario ve, verifica y corrige dónde está el inmueble,
 * de modo que la propiedad nunca se guarde sin coordenadas.
 *
 * Carga el mapa real (`PropertyLocationMapCanvas`, Leaflet) sólo en el cliente con
 * `ssr: false`, porque Leaflet accede a `window`. La consigna cambia según haya o
 * no un punto: con coordenadas (Caso A) pide verificar/corregir; sin coordenadas
 * (Caso B) pide marcar la ubicación en el mapa.
 */

type Coordenadas = { latitude: number; longitude: number };

const PropertyLocationMapCanvas = dynamic(
  () => import("@/components/dashboard/PropertyLocationMapCanvas"),
  {
    ssr: false,
    loading: () => <div className="rent-map__loading">Cargando mapa…</div>,
  }
);

function formatearCoordenada(valor: number): string {
  return valor.toFixed(5);
}

export default function PropertyLocationMap({
  latitude,
  longitude,
  onChange,
}: Readonly<{
  latitude: number | null;
  longitude: number | null;
  onChange: (coords: Coordenadas) => void;
}>) {
  const tieneCoordenadas = latitude != null && longitude != null;

  return (
    <section className="property-map" aria-label="Ubicación de la propiedad">
      <p className="property-map__hint">
        <MapPin aria-hidden="true" size={18} />
        {tieneCoordenadas
          ? "Verifique la ubicación en el mapa. Si no es exacta, arrastre el pin o toque el punto correcto."
          : "Toque el mapa para marcar dónde está el inmueble. Es necesario para guardarlo."}
      </p>
      <div className="rent-map">
        <PropertyLocationMapCanvas latitude={latitude} longitude={longitude} onPick={onChange} />
      </div>
      <p className="property-map__coords" aria-live="polite">
        {tieneCoordenadas
          ? `Ubicación marcada: ${formatearCoordenada(latitude)}, ${formatearCoordenada(longitude)}`
          : "Ubicación sin marcar"}
      </p>
    </section>
  );
}
