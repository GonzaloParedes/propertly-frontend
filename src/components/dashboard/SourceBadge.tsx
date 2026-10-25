"use client";

import { useState } from "react";
import type { ListingSource } from "@/lib/backend-types";

/**
 * Logo de la fuente de un comparable (ALQ-45). Busca el SVG en
 * `public/logos/fuentes/<archivo>.svg`; si no está (hoy la carpeta todavía no se
 * pobló) o falla al cargar, cae a un chip de texto con el nombre del portal. Así
 * la fuente siempre se ve, con logo o sin él, y aparece sola cuando se dejen
 * caer los SVG reales — sin tocar este código.
 *
 * Cuando hay logo, debajo va además el nombre del portal: el logo queda en una
 * columna de ancho fijo (ver `.rent-source` en el CSS) para que, aunque un logo
 * sea más ancho que otro (p. ej. MercadoLibre vs. Argenprop), todos los títulos
 * de los comparables arranquen alineados.
 */

const META: Record<ListingSource, { label: string; file: string }> = {
  ZONAPROP: { label: "ZonaProp", file: "zonaprop" },
  ARGENPROP: { label: "Argenprop", file: "argenprop" },
  MERCADO_LIBRE: { label: "MercadoLibre", file: "mercado-libre" },
  PROPERATI: { label: "Properati", file: "properati" },
  REMAX: { label: "RE/MAX", file: "remax" },
  OTHER: { label: "Otra fuente", file: "" },
};

export default function SourceBadge({ source }: Readonly<{ source: ListingSource }>) {
  const meta = META[source];
  const [fallo, setFallo] = useState(false);

  if (!meta.file || fallo) {
    return (
      <span className="rent-source rent-source--chip" title={meta.label}>
        {meta.label}
      </span>
    );
  }

  return (
    <span className="rent-source">
      {/* Logo de marca local con fallback a chip: next/image no optimiza un SVG ni
          expone onError a través del mock de tests, así que acá un <img> es lo correcto. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="rent-source__logo"
        src={`/logos/fuentes/${meta.file}.svg`}
        alt={meta.label}
        onError={() => setFallo(true)}
      />
      <span className="rent-source__label">{meta.label}</span>
    </span>
  );
}
