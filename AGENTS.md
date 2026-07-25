<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Identidad visual

Antes de crear o modificar interfaces, estilos, logos, colores o cualquier otro
material visual, consultar el manual de marca ubicado en:

`docs/brand/Manual_de_Marca_Alquia.pdf`

Usar preferentemente los recursos existentes en `public/logos/`. No recrear,
recolorear, deformar ni alterar los logos salvo que el manual lo permita.

## Testing

Framework: **Vitest + React Testing Library**. Los tests viven en `src/tests/`.

- `npm test` — corre todos los tests una vez (lo que usa el CI)
- `npm run test:watch` — modo interactivo para desarrollo local
- `npm run test:coverage` — reporte de cobertura

**Qué testear:** comportamiento visible al usuario (lo que aparece en pantalla, qué pasa al hacer click). No testear clases CSS, estado interno, ni implementación de Next.js/React.

**Por qué Vitest y no Jest:** React 19 + React Compiler requiere ESM nativo; Vitest lo soporta sin configuración Babel extra. El React Compiler no corre en tests (es solo una optimización de build).

**Mocks globales** en `src/tests/setup.ts`: `next/navigation`, `next/image`, `next/link`.

## Monitoreo de errores (Sentry)

Sentry está configurado para server y edge en:
- `sentry.server.config.ts`
- `sentry.edge.config.ts`

Al modificar uno, revisar el otro — ambos deben mantenerse sincronizados.

`tracesSampleRate: 0.1` es intencional — no subirlo sin revisar el plan de Sentry.
El DSN hardcodeado es correcto: en Sentry el DSN del cliente es público por diseño.
