"use client";

import dynamic from "next/dynamic";
import type { ComparableListing } from "@/lib/backend-types";
import type { TileStyle } from "@/components/dashboard/RentEstimateMapCanvas";

/**
 * Mapa de la estimación (ALQ-45): la propiedad + todas las propiedades del mercado
 * que usó la predicción, con los comparables distinguidos del resto por color.
 * Carga el mapa real (`RentEstimateMapCanvas`, Leaflet) solo en el cliente con
 * `ssr: false`, porque Leaflet accede a `window` y no puede renderizarse en el
 * servidor.
 *
 * Se asume que la propiedad **siempre tiene coordenadas** (lo garantiza ALQ-92),
 * así que `subject` nunca es null acá y no hay estado "sin ubicación". El
 * resaltado cruzado con la lista lo coordina `RentComparablesPanel` vía
 * `activeIndex`/`onHover`/`onSelect`.
 */
const RentEstimateMapCanvas = dynamic(
  () => import("@/components/dashboard/RentEstimateMapCanvas"),
  {
    ssr: false,
    loading: () => <div className="rent-map__loading">Cargando mapa…</div>,
  }
);

export default function RentEstimateMap({
  subject,
  listings,
  activeIndex,
  onHover,
  onSelect,
  tileStyle,
}: Readonly<{
  subject: { latitude: number; longitude: number };
  listings: ComparableListing[];
  activeIndex: number | null;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
  tileStyle?: TileStyle;
}>) {
  return (
    <section className="rent-map" aria-label="Mapa de comparables">
      <RentEstimateMapCanvas
        subject={subject}
        listings={listings}
        activeIndex={activeIndex}
        onHover={onHover}
        onSelect={onSelect}
        tileStyle={tileStyle}
      />
    </section>
  );
}
