"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import AlquiaVectorLayer from "@/components/dashboard/AlquiaVectorLayer";
import { CENTRO_DE_ARGENTINA, ZOOM_PAIS, ZOOM_UBICACION } from "@/lib/geo";
import "leaflet/dist/leaflet.css";

/**
 * Mapa **interactivo** de ubicación de una propiedad (ALQ-92). A diferencia del
 * mapa de comparables (`RentEstimateMapCanvas`, fijo), acá el propietario ubica el
 * inmueble: arrastra el pin o toca el mapa, y cada cambio se avisa con `onPick`.
 *
 * Caso A (ya hay coordenadas): abre centrado en el punto, con el pin, para
 * verificar/corregir. Caso B (sin coordenadas): abre en el centro de Argentina
 * sin pin, y el primer toque en el mapa lo coloca.
 *
 * Se carga siempre del lado del cliente (Leaflet toca `window`) vía el wrapper
 * `PropertyLocationMap`. El pin se dibuja con `divIcon` (no el ícono por defecto de
 * Leaflet, que rompe sus assets bajo el bundler) y el fondo es el basemap de marca.
 */

type Coordenadas = { latitude: number; longitude: number };

const pinIcon = L.divIcon({
  className: "property-map-pin",
  html: '<span class="property-map-pin__dot"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

/** Toca el mapa → coloca/mueve el pin a ese punto. */
function TocarParaUbicar({ onPick }: Readonly<{ onPick: (coords: Coordenadas) => void }>) {
  useMapEvents({
    click: (e) => onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
  });
  return null;
}

/**
 * Reencuadra cuando las coordenadas cambian desde afuera (p. ej. el propietario
 * eligió otra dirección sugerida). También recalcula el tamaño al montar, porque
 * dentro de un diálogo o una tarjeta el contenedor puede medirse mal al inicio.
 */
function Reencuadrar({ latitude, longitude }: Readonly<{ latitude: number | null; longitude: number | null }>) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize?.();
    if (latitude != null && longitude != null) {
      map.setView?.([latitude, longitude], ZOOM_UBICACION);
    }
  }, [map, latitude, longitude]);
  return null;
}

export default function PropertyLocationMapCanvas({
  latitude,
  longitude,
  onPick,
}: Readonly<{
  latitude: number | null;
  longitude: number | null;
  onPick: (coords: Coordenadas) => void;
}>) {
  const tieneCoordenadas = latitude != null && longitude != null;
  const centro: [number, number] = tieneCoordenadas
    ? [latitude, longitude]
    : [CENTRO_DE_ARGENTINA.latitude, CENTRO_DE_ARGENTINA.longitude];

  return (
    <MapContainer className="rent-map__canvas" center={centro} zoom={tieneCoordenadas ? ZOOM_UBICACION : ZOOM_PAIS}>
      <AlquiaVectorLayer />
      <Reencuadrar latitude={latitude} longitude={longitude} />
      <TocarParaUbicar onPick={onPick} />
      {tieneCoordenadas && (
        <Marker
          position={[latitude, longitude]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = e.target.getLatLng();
              onPick({ latitude: lat, longitude: lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
