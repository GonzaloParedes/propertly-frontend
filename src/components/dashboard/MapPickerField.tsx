"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Direccion } from "@/lib/borradores";

/**
 * Selector de ubicación por mapa (ALQ-197): fallback de AddressField cuando el
 * autocomplete no encuentra la dirección. Reutiliza PropertyLocationMapCanvas
 * (pin arrastrable + click-to-place) iniciado en Buenos Aires. Al confirmar
 * genera un Direccion con las coordenadas elegidas y el texto escrito como calle.
 */

type Coordenadas = { latitude: number; longitude: number };

const PropertyLocationMapCanvas = dynamic(
  () => import("@/components/dashboard/PropertyLocationMapCanvas"),
  {
    ssr: false,
    loading: () => <div className="rent-map__loading">Cargando mapa…</div>,
  }
);

const BUENOS_AIRES: Coordenadas = { latitude: -34.6037, longitude: -58.3816 };

export default function MapPickerField({
  initialStreet,
  onConfirm,
  onCancel,
}: Readonly<{
  initialStreet: string;
  onConfirm: (d: Direccion) => void;
  onCancel: () => void;
}>) {
  const [coords, setCoords] = useState<Coordenadas>(BUENOS_AIRES);

  function confirmar() {
    onConfirm({
      street: initialStreet,
      number: "",
      city: "",
      province: "",
      postalCode: "",
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
  }

  return (
    <div className="owner-map-picker">
      <p className="owner-wizard-label">Arrastrá el pin o tocá el mapa para marcar la ubicación</p>
      <div className="rent-map">
        <PropertyLocationMapCanvas
          latitude={coords.latitude}
          longitude={coords.longitude}
          onPick={setCoords}
        />
      </div>
      <p className="owner-map-picker__hint" aria-live="polite">
        Ubicación: <strong>{coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</strong>
      </p>
      <div className="owner-map-picker__actions">
        <button type="button" className="owner-button owner-button--small" onClick={confirmar}>
          Confirmar ubicación
        </button>
        <button type="button" className="owner-ac-chosen__change" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
