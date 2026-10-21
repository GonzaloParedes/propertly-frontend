// Copia el worker de MapLibre GL a public/ para auto-hostearlo (ALQ-45).
//
// MapLibre levanta su render en un Web Worker. Bajo Turbopack (next dev) el
// bundler le arma una URL `file://` que el navegador no puede cargar ("Worker
// failed to load"). Sirviendo el worker como asset estático propio y apuntándole
// con `maplibregl.config.WORKER_URL` (ver AlquiaVectorLayer), evitamos que el
// bundler resuelva esa URL, y funciona igual en dev (Turbopack) y en build.
//
// Se regenera en cada `predev`/`prebuild`, así sigue la versión instalada de
// maplibre-gl. El destino está en .gitignore (no se commitea el vendored).

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs");
const destDir = resolve(root, "public/vendor");
const dest = resolve(destDir, "maplibre-gl-worker.js");

try {
  mkdirSync(destDir, { recursive: true });
  copyFileSync(src, dest);
  console.log("[copy-maplibre-worker] OK -> public/vendor/maplibre-gl-worker.js");
} catch (err) {
  // No frenamos dev/build por esto: solo el basemap "alquia" lo necesita.
  console.warn("[copy-maplibre-worker] no se pudo copiar el worker:", err.message);
}
