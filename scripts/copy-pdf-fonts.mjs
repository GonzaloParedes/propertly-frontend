// Copia las tipografías de marca para el PDF de la liquidación (ALQ-140).
//
// `@react-pdf/renderer` necesita los archivos de fuente como URL: no sirve la
// que carga el CSS. Se toman los `.woff` latinos de Fontsource (Quicksand para
// títulos y el monto, Nunito Sans para el texto) y se sirven como assets
// estáticos propios desde /vendor/fonts. Se regenera en cada `predev`/`prebuild`;
// el destino está en .gitignore (/public/vendor/).

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destDir = resolve(root, "public/vendor/fonts");

const fuentes = [
  ["quicksand", "quicksand-latin-600-normal.woff"],
  ["quicksand", "quicksand-latin-700-normal.woff"],
  ["nunito-sans", "nunito-sans-latin-400-normal.woff"],
  ["nunito-sans", "nunito-sans-latin-600-normal.woff"],
  ["nunito-sans", "nunito-sans-latin-700-normal.woff"],
];

try {
  mkdirSync(destDir, { recursive: true });
  for (const [paquete, archivo] of fuentes) {
    copyFileSync(resolve(root, `node_modules/@fontsource/${paquete}/files/${archivo}`), resolve(destDir, archivo));
  }
  console.log(`[copy-pdf-fonts] OK -> public/vendor/fonts (${fuentes.length} archivos)`);
} catch (err) {
  // No frenamos dev/build: sólo la liquidación en PDF las necesita.
  console.warn("[copy-pdf-fonts] no se pudieron copiar las tipografías:", err.message);
}
