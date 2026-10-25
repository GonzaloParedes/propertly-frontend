"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { ComparableListing } from "@/lib/backend-types";
import { formatearMonto } from "@/lib/formato";
import AlquiaVectorLayer from "@/components/dashboard/AlquiaVectorLayer";
import "leaflet/dist/leaflet.css";

/**
 * Mapa real (Leaflet + OpenStreetMap) de la estimación (ALQ-45): el pin de la
 * propiedad y los de **todas** las propiedades del mercado que usó la predicción.
 * Las marcadas con `comparable` (las más parecidas) se dibujan con un color y el
 * resto con otro, para distinguirlas de un vistazo. Es un **mapa fijo**: toda la
 * interacción está deshabilitada (no se arrastra, no hace zoom), solo muestra los
 * pines encuadrados; los popups siguen abriéndose al click. Se carga siempre del
 * lado del cliente (Leaflet toca `window`) vía el wrapper `RentEstimateMap`.
 *
 * Cada pin lleva su número (coincide con la fila de la lista) y se resalta cuando
 * `activeIndex` lo señala. Avisa hacia afuera con `onHover` (mouseover/out) y
 * `onSelect` (click) para que `RentComparablesPanel` coordine el resaltado cruzado
 * y el scroll a la fila. Los pines se dibujan con `divIcon` (no el ícono por
 * defecto de Leaflet, que rompe sus assets bajo el bundler). Este componente se
 * reutiliza en ALQ-92.
 */

/**
 * Estilos de fondo (basemap) disponibles. `alquia` es el estilo **vectorial a
 * medida** con la paleta de marca (MapLibre GL sobre tiles de OpenFreeMap, ver
 * `AlquiaVectorLayer`); se dibuja por otra vía, no como tile raster. Los demás son
 * tiles raster gratis y sin API key, solo piden atribución: `osm` es OpenStreetMap
 * estándar y los `carto-*` son de CARTO (uso libre con atribución; para tráfico
 * alto en producción conviene registrarse en CARTO).
 */
export type TileStyle = "alquia" | "osm" | "carto-positron" | "carto-voyager" | "carto-dark";

/** Los que se sirven como tiles raster vía `<TileLayer>` (todos menos `alquia`). */
type RasterTileStyle = Exclude<TileStyle, "alquia">;

const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO_ATTR = `${OSM_ATTR} &copy; <a href="https://carto.com/attributions">CARTO</a>`;

const TILE_PRESETS: Record<
  RasterTileStyle,
  { url: string; attribution: string; subdomains: string; maxZoom: number }
> = {
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: OSM_ATTR,
    subdomains: "abc",
    maxZoom: 19,
  },
  "carto-positron": {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: CARTO_ATTR,
    subdomains: "abcd",
    maxZoom: 20,
  },
  "carto-voyager": {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: CARTO_ATTR,
    subdomains: "abcd",
    maxZoom: 20,
  },
  "carto-dark": {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: CARTO_ATTR,
    subdomains: "abcd",
    maxZoom: 20,
  },
};

// La propiedad estimada: el pin más grande del mapa y en rosa de marca (#DB4C8E),
// un color distinto del violeta de los comparables y del gris del resto, para que
// salte a la vista como "la seleccionada".
const subjectIcon = L.divIcon({
  className: "rent-map-pin rent-map-pin--subject",
  html: '<span class="rent-map-pin__dot"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function listingIcon(numero: number, activo: boolean, esComparable: boolean) {
  const tipo = esComparable ? "rent-map-pin--comp" : "rent-map-pin--other";
  return L.divIcon({
    className: `rent-map-pin rent-map-pin--listing ${tipo}${activo ? " rent-map-pin--active" : ""}`,
    html: `<span class="rent-map-pin__num">${numero}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

type LatLng = { latitude: number; longitude: number };

function hasCoords(
  comparable: ComparableListing
): comparable is ComparableListing & LatLng {
  return comparable.latitude != null && comparable.longitude != null;
}

/**
 * Al montar dentro del grid y con carga diferida, Leaflet puede medir mal el
 * contenedor y dejar el `fitBounds` con una vista equivocada (se veía solo el pin
 * del sujeto). Recalcula el tamaño y reencuadra a todos los pines, y lo rehace si
 * el contenedor cambia de tamaño. `bounds` está memoizado en el padre, así que
 * esto NO se dispara en cada hover.
 */
function AjustarVista({ bounds }: Readonly<{ bounds: L.LatLngBounds }>) {
  const map = useMap();
  useEffect(() => {
    const encuadrar = () => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
    };
    encuadrar();
    const raf = requestAnimationFrame(encuadrar);
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(encuadrar);
      observer.observe(map.getContainer());
    }
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [map, bounds]);
  return null;
}

/**
 * Saca el prefijo "Leaflet" del control de atribución (es branding de la librería,
 * no obligatorio). La atribución de datos (OSM/OpenFreeMap/OpenMapTiles) se queda:
 * la exige la licencia ODbL de OpenStreetMap; solo la dejamos discreta por CSS.
 */
function SinPrefijoLeaflet() {
  const map = useMap();
  useEffect(() => {
    map.attributionControl?.setPrefix(false);
  }, [map]);
  return null;
}

export default function RentEstimateMapCanvas({
  subject,
  listings,
  activeIndex,
  onHover,
  onSelect,
  tileStyle = "osm",
}: Readonly<{
  subject: LatLng;
  listings: ComparableListing[];
  activeIndex: number | null;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
  tileStyle?: TileStyle;
}>) {
  // `alquia` es vectorial (lo dibuja AlquiaVectorLayer); el resto son tiles raster.
  const tiles = tileStyle === "alquia" ? null : TILE_PRESETS[tileStyle];
  const bounds = useMemo(() => {
    const puntos: [number, number][] = [
      [subject.latitude, subject.longitude],
      ...listings.filter(hasCoords).map((c): [number, number] => [c.latitude, c.longitude]),
    ];
    return L.latLngBounds(puntos);
  }, [subject.latitude, subject.longitude, listings]);

  return (
    <MapContainer
      className="rent-map__canvas"
      bounds={bounds}
      boundsOptions={{ padding: [24, 24] }}
      dragging={false}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
    >
      <AjustarVista bounds={bounds} />
      <SinPrefijoLeaflet />
      {tiles ? (
        <TileLayer
          key={tileStyle}
          attribution={tiles.attribution}
          url={tiles.url}
          subdomains={tiles.subdomains}
          maxZoom={tiles.maxZoom}
          detectRetina
        />
      ) : (
        <AlquiaVectorLayer />
      )}
      <Marker position={[subject.latitude, subject.longitude]} icon={subjectIcon}>
        <Popup>Esta propiedad</Popup>
      </Marker>
      {listings.map((listing, index) =>
        hasCoords(listing) ? (
          <Marker
            key={`${listing.source}-${listing.title}-${index}`}
            position={[listing.latitude, listing.longitude]}
            icon={listingIcon(index + 1, activeIndex === index, listing.comparable)}
            eventHandlers={{
              mouseover: () => onHover(index),
              mouseout: () => onHover(null),
              click: () => onSelect(index),
            }}
          >
            <Popup>
              <strong>{listing.title}</strong>
              {listing.comparable && (
                <>
                  {" "}
                  <em>· comparable</em>
                </>
              )}
              <br />
              {formatearMonto(listing.monthlyRent)}
              {listing.url && (
                <>
                  <br />
                  <a href={listing.url} target="_blank" rel="noopener noreferrer">
                    Ver en la fuente
                  </a>
                </>
              )}
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
}
