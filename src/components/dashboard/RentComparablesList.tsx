"use client";

import { ExternalLink } from "lucide-react";
import SourceBadge from "@/components/dashboard/SourceBadge";
import type { ComparableListing } from "@/lib/backend-types";
import { formatearImporte } from "@/lib/formato";

/**
 * Lista de las propiedades que respaldaron la estimación (ALQ-45). Se muestran
 * **todas** las usadas en la predicción; las marcadas con `comparable` (las más
 * parecidas a la propiedad) llevan un chip «Comparable» y un estilo destacado para
 * distinguirlas del resto, igual que sus pines en el mapa. Cada ítem lleva un
 * número (que coincide con el pin del mapa, para emparejar fila↔pin de un vistazo),
 * la fuente (logo o chip), un título, sus metros/dormitorios, y el alquiler
 * publicado. Si la propiedad trae `url`, la fila entera es un enlace al aviso en la
 * fuente (abre en otra pestaña).
 *
 * El resaltado cruzado con el mapa se coordina desde `RentComparablesPanel`:
 * `onHover` avisa qué fila se está señalando y `activeIndex` marca cuál resaltar
 * (ya sea por hover en la fila o por hover/click en su pin). El `id` por fila lo
 * usa el mapa para hacer scroll hasta ella al clickear el pin.
 */
export default function RentComparablesList({
  listings,
  activeIndex,
  onHover,
}: Readonly<{
  listings: ComparableListing[];
  activeIndex: number | null;
  onHover: (index: number | null) => void;
}>) {
  if (listings.length === 0) {
    return null;
  }

  return (
    <ul className="rent-comparables__list">
      {listings.map((listing, index) => {
        const meta = [
          listing.coveredArea != null ? `${listing.coveredArea} m²` : null,
          listing.bedrooms != null ? `${listing.bedrooms} dorm.` : null,
        ]
          .filter(Boolean)
          .join(" · ");

        const activo = activeIndex === index;
        const base = `rent-comparable${listing.comparable ? " is-comparable" : ""}${
          activo ? " is-active" : ""
        }`;

        const contenido = (
          <>
            <span className="rent-comparable__num" aria-hidden="true">
              {index + 1}
            </span>
            <SourceBadge source={listing.source} />
            <div className="rent-comparable__body">
              <p className="rent-comparable__title">
                <span className="rent-comparable__title-text">{listing.title}</span>
                {listing.comparable && (
                  <span className="rent-comparable__tag">Comparable</span>
                )}
                {listing.url && (
                  <ExternalLink className="rent-comparable__ext" size={13} aria-hidden="true" />
                )}
              </p>
              {meta && <p className="rent-comparable__meta">{meta}</p>}
            </div>
            <p className="rent-comparable__price">
              {formatearImporte(listing.monthlyRent, listing.currency)}
            </p>
          </>
        );

        return (
          <li key={`${listing.source}-${listing.title}-${index}`}>
            {listing.url ? (
              <a
                id={`rent-comparable-${index}`}
                className={`${base} rent-comparable--link`}
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Ver el aviso en la fuente (se abre en otra pestaña)"
                onMouseEnter={() => onHover(index)}
                onMouseLeave={() => onHover(null)}
              >
                {contenido}
              </a>
            ) : (
              <div
                id={`rent-comparable-${index}`}
                className={base}
                onMouseEnter={() => onHover(index)}
                onMouseLeave={() => onHover(null)}
              >
                {contenido}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
