/**
 * Estilo de mapa **a medida con la paleta de Alquia** (ALQ-45), para MapLibre GL.
 *
 * Es un estilo vectorial MapLibre v8 sobre los tiles de **OpenFreeMap** (gratis,
 * sin API key; esquema OpenMapTiles). Cada capa está pintada con los HEX exactos
 * de la marca (`docs/brand/color/alquia-colores.json`), en clave minimalista
 * monocromática lavanda: superficie clara, agua en lila suave, calles blancas,
 * edificios y parques en tintes de índigo muy bajos, y etiquetas en tinta/gris.
 * El rosa de marca queda reservado para el pin de la propiedad (no va en el mapa).
 *
 * Paleta usada (de la marca):
 *   superficie #F6F5FC · tinta #1E1B2E · gris #514D63 · índigo #5B4BC4
 *   borde tarjeta #DEDAF0 · borde campo #C4BEE4 · divisor #EDEBF7 · info-bg #E7E3F8
 * Tintes derivados (lavanda) para agua/edificios/parques, dentro de la familia.
 */

// Tokens de marca (exactos) + tintes lavanda derivados para rellenos de mapa.
const SUPERFICIE = "#F6F5FC";
const TINTA = "#1E1B2E";
const GRIS = "#514D63";
const BORDE_CAMPO = "#C4BEE4";
const AGUA = "#D8D1F0"; // lila suave (familia lila #A79AF0)
const AGUA_LINEA = "#C7BEE8";
const VERDE_PARQUE = "#E7E3F5"; // info-bg lavanda, en vez de verde (marca monocromática)
const LANDCOVER = "#ECEAF7";
const EDIFICIO = "#EBE7F6";
const EDIFICIO_BORDE = "#DED9F0";
const CALLE = "#FFFFFF";
const CALLE_CASING = "#DCD6EF";
const HALO = "#FFFFFF";

const SRC = "openmaptiles";

// El plugin de Leaflet toma la atribución del `attribution` del source del estilo.
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · ' +
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a>';

export const alquiaMapStyle = {
  version: 8,
  name: "Alquia",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    [SRC]: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
      attribution: ATTRIBUTION,
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": SUPERFICIE },
    },
    {
      id: "landcover",
      type: "fill",
      source: SRC,
      "source-layer": "landcover",
      paint: { "fill-color": LANDCOVER, "fill-opacity": 0.6 },
    },
    {
      id: "park",
      type: "fill",
      source: SRC,
      "source-layer": "park",
      paint: { "fill-color": VERDE_PARQUE, "fill-opacity": 0.7 },
    },
    {
      id: "water",
      type: "fill",
      source: SRC,
      "source-layer": "water",
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": AGUA },
    },
    {
      id: "waterway",
      type: "line",
      source: SRC,
      "source-layer": "waterway",
      minzoom: 8,
      paint: {
        "line-color": AGUA_LINEA,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 16, 2.4],
      },
    },
    {
      id: "building",
      type: "fill",
      source: SRC,
      "source-layer": "building",
      minzoom: 13,
      paint: {
        "fill-color": EDIFICIO,
        "fill-outline-color": EDIFICIO_BORDE,
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 15, 0.9],
      },
    },
    {
      id: "road-casing",
      type: "line",
      source: SRC,
      "source-layer": "transportation",
      minzoom: 7,
      filter: [
        "in",
        ["get", "class"],
        ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary"]],
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": CALLE_CASING,
        "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1.2, 12, 3.5, 16, 9, 20, 22],
      },
    },
    {
      id: "road",
      type: "line",
      source: SRC,
      "source-layer": "transportation",
      minzoom: 10,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": CALLE,
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.6, 12, 1.8, 16, 6, 20, 16],
      },
    },
    {
      id: "boundary",
      type: "line",
      source: SRC,
      "source-layer": "boundary",
      filter: ["<=", ["get", "admin_level"], 4],
      paint: {
        "line-color": BORDE_CAMPO,
        "line-dasharray": [2, 2],
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.6, 10, 1.4],
      },
    },
    {
      id: "water-name",
      type: "symbol",
      source: SRC,
      "source-layer": "water_name",
      minzoom: 10,
      layout: {
        "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": 12,
      },
      paint: { "text-color": GRIS, "text-halo-color": HALO, "text-halo-width": 1.2 },
    },
    {
      id: "road-name",
      type: "symbol",
      source: SRC,
      "source-layer": "transportation_name",
      minzoom: 14,
      layout: {
        "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
        "symbol-placement": "line",
      },
      paint: { "text-color": GRIS, "text-halo-color": HALO, "text-halo-width": 1.4 },
    },
    {
      id: "place-minor",
      type: "symbol",
      source: SRC,
      "source-layer": "place",
      filter: ["in", ["get", "class"], ["literal", ["suburb", "neighbourhood", "village"]]],
      minzoom: 11,
      layout: {
        "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 11, 11, 15, 14],
      },
      paint: { "text-color": GRIS, "text-halo-color": HALO, "text-halo-width": 1.4 },
    },
    {
      id: "place-major",
      type: "symbol",
      source: SRC,
      "source-layer": "place",
      filter: ["in", ["get", "class"], ["literal", ["city", "town"]]],
      layout: {
        "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
        "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 4, 12, 8, 15, 12, 19],
      },
      paint: { "text-color": TINTA, "text-halo-color": HALO, "text-halo-width": 1.6 },
    },
  ],
};
