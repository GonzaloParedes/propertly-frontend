"use client";

import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { alquiaMapStyle } from "@/components/dashboard/alquiaMapStyle";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Basemap vectorial **a medida con la paleta de Alquia** (ALQ-45). Renderiza el
 * estilo `alquiaMapStyle` (MapLibre GL sobre tiles de OpenFreeMap) como una capa de
 * Leaflet, vía el plugin `@maplibre/maplibre-gl-leaflet`, así el resto del mapa
 * (pines, bounds, popups de react-leaflet) sigue igual: solo cambia el fondo.
 *
 * MapLibre GL (~200 KB) se importa de forma **diferida** dentro del efecto, para
 * que solo pese cuando este estilo está seleccionado (no en los basemaps raster).
 * El plugin lee `maplibregl` del scope global al construir la capa, por eso se
 * setea en `window` antes de importarlo. La atribución (OSM/OpenFreeMap/
 * OpenMapTiles) la toma el plugin del `attribution` del source del estilo.
 */

export default function AlquiaVectorLayer() {
  const map = useMap();

  useEffect(() => {
    let layer: L.Layer | undefined;
    let cancelled = false;

    // `void`: la promesa del IIFE se ignora a propósito — los errores los captura
    // el `try/catch` de adentro y el efecto se cancela vía `cancelled`/cleanup.
    void (async () => {
      try {
        // maplibre-gl expone sus clases como named exports (sin `default`); el plugin
        // de Leaflet usa `maplibregl.Map`, así que le pasamos el namespace completo.
        const maplibregl = await import("maplibre-gl");
        (window as unknown as { maplibregl?: unknown }).maplibregl = maplibregl;

        // Worker auto-hosteado: sin esto, bajo Turbopack el bundler le arma una URL
        // `file://` al worker y el navegador no lo carga. El archivo lo deja en
        // public/vendor/ el script predev/prebuild (ver scripts/copy-maplibre-worker.mjs).
        maplibregl.config.WORKER_URL = "/vendor/maplibre-gl-worker.js";
        await import("@maplibre/maplibre-gl-leaflet");
        if (cancelled) return;

        const factory = (
          L as unknown as { maplibreGL?: (opts: Record<string, unknown>) => L.Layer }
        ).maplibreGL;
        // En jsdom (tests) o si el plugin no llega a adjuntarse a `L` (hipo de red,
        // worker), `maplibreGL` queda sin definir: degradamos a un mapa sin fondo
        // vectorial (los pines y el encuadre de Leaflet siguen) en vez de romper con
        // una promesa rechazada sin capturar.
        if (typeof factory !== "function") return;
        layer = factory({ style: alquiaMapStyle });
        layer.addTo(map);
      } catch (e) {
        if (!cancelled) console.warn("No se pudo cargar el basemap de Alquia:", e);
      }
    })();

    return () => {
      cancelled = true;
      if (layer && map.hasLayer(layer)) map.removeLayer(layer);
    };
  }, [map]);

  return null;
}
