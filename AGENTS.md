<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Identidad visual

Antes de crear o modificar interfaces, estilos, logos, colores o cualquier otro
material visual, consultar el manual de marca ubicado en:

`docs/brand/manual/Manual_de_Marca_Alquia_v1.1.pdf`

Los tokens de color en formato usable están en `docs/brand/color/` — el archivo
canónico es `alquia-colores.json`.

Usar preferentemente los recursos existentes en `public/logos/`. No recrear,
recolorear, deformar ni alterar los logos salvo que el manual lo permita.

## Diseño de producto

El manual de marca manda sobre color, tipografía y logo. Lo que el manual no
cubre — cómo se comportan los componentes de la app — está en:

`docs/design/sistema-ui.md`

Leerlo antes de tocar UI. Incluye los tokens (radios, anillos, alturas), las
decisiones ya tomadas con su porqué, las reglas de accesibilidad que salieron de
medir contraste y daltonismo, y una lista de lo que ya se rechazó para no volver
a proponerlo. El prototipo vigente corre en `localhost:3000/prototipo` y su código está en
`src/components/dashboard/` (OwnerWorkspace + CreationWizard). El HTML de
`docs/prototypes/` quedó congelado y ya no refleja la app.

Ojo: el modelo de dominio real está en `propertly-backend` rama `origin/mvp`, que
diverge de `src/lib/types.ts`. Cómo se resuelve esa divergencia ya está
decidido y anotado: lo que el backend modela manda, y lo que le falta se le
pide. Leer «Modelo de datos: qué manda y qué se pide» antes de tocar tipos.

## Íconos

Los íconos salen de **Lucide** (`lucide-react`). Antes de agregar o dibujar un
SVG de ícono, **primero fijarse si la librería ya tiene uno que sirva** —
buscar en https://lucide.dev o importarlo y probar. La idea es no caer en
generar SVGs a mano/con IA de forma innecesaria (se nota: fue el bug ALQ-26).
Generar un SVG propio **no está prohibido**, pero es el último recurso, sólo
cuando ningún glifo de la librería encaja.

- El set con nombres semánticos (`settings`, `users`, `check`, …) vive en el
  componente compartido `src/components/ui/Icon.tsx`: para un ícono recurrente,
  agregar el nombre al mapa ahí y usar `<Icon name="…" />`.
- Para un ícono de un solo uso, importarlo directo: `import { Mail } from "lucide-react"`.
- Mantener `aria-hidden` (los íconos son decorativos; el texto los acompaña) y
  dejar que el color lo herede `currentColor`, como hace el CSS existente.

Quedan fuera a propósito: los logos de marca (`public/logos/*.svg`) y las
ilustraciones de estados vacíos (`owner-empty__art` en OwnerWorkspace) — esas
son dibujos propios, no íconos de librería.

## Testing

Framework: **Vitest + React Testing Library**. Los tests viven en `src/tests/`.

- `npm test` — corre todos los tests una vez (lo que usa el CI)
- `npm run test:watch` — modo interactivo para desarrollo local
- `npm run test:coverage` — reporte de cobertura

**Qué testear:** comportamiento visible al usuario (lo que aparece en pantalla, qué pasa al hacer click). No testear clases CSS, estado interno, ni implementación de Next.js/React.

**Por qué Vitest y no Jest:** React 19 + React Compiler requiere ESM nativo; Vitest lo soporta sin configuración Babel extra. El React Compiler no corre en tests (es solo una optimización de build).

**Mocks globales** en `src/tests/setup.tsx`: `next/navigation`, `next/image`, `next/link`.

## Monitoreo de errores (Sentry)

Sentry está configurado para server y edge en:
- `sentry.server.config.ts`
- `sentry.edge.config.ts`

Al modificar uno, revisar el otro — ambos deben mantenerse sincronizados.

`tracesSampleRate: 0.1` es intencional — no subirlo sin revisar el plan de Sentry.
El DSN hardcodeado es correcto: en Sentry el DSN del cliente es público por diseño.
