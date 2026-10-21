"use client";

import { useState } from "react";
import RentComparablesList from "@/components/dashboard/RentComparablesList";
import RentEstimateMap from "@/components/dashboard/RentEstimateMap";
import type { TileStyle } from "@/components/dashboard/RentEstimateMapCanvas";
import type { ComparableListing } from "@/lib/backend-types";

/**
 * Panel de propiedades de la estimación (ALQ-45): la lista y el mapa lado a lado,
 * emparejados. Reciben **todas** las `listings` que usó la predicción, en el mismo
 * orden e índice, y cada una trae `comparable` para que ambos lados distingan a los
 * más parecidos del resto. Es el dueño del estado compartido para el **resaltado
 * cruzado**: `activo` es el índice de la propiedad señalada, lo setea tanto el hover
 * en la fila como el hover/click en su pin, y ambos lados lo usan para resaltarse en
 * conjunto. Al clickear un pin, además, se hace scroll hasta su fila.
 */
export default function RentComparablesPanel({
  subject,
  listings,
  tileStyle,
}: Readonly<{
  subject: { latitude: number; longitude: number };
  listings: ComparableListing[];
  tileStyle?: TileStyle;
}>) {
  const [activo, setActivo] = useState<number | null>(null);

  const seleccionar = (index: number) => {
    setActivo(index);
    document
      .getElementById(`rent-comparable-${index}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <section className="rent-comparables">
      <h3 className="rent-comparables__title">Propiedades del mercado</h3>
      <div className="rent-cmp-panel">
        <RentComparablesList listings={listings} activeIndex={activo} onHover={setActivo} />
        <RentEstimateMap
          subject={subject}
          listings={listings}
          activeIndex={activo}
          onHover={setActivo}
          onSelect={seleccionar}
          tileStyle={tileStyle}
        />
      </div>
    </section>
  );
}
