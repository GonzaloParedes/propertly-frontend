# Proposal

## Why

Hoy el frontend decide qué error mostrar **comparando el texto en inglés** del mensaje del backend
(`err.message === "Tax ID already registered"`, en ~6 sitios). Es frágil —cualquier cambio de copy en
el back rompe el front en silencio— y esconde un **bug latente**: la misma condición ("ese documento ya
existe") llega por dos caminos con status y texto distintos (chequeo app-level vs. colisión `UNIQUE`
concurrente), así que el front sólo captura uno y el otro cae al mensaje genérico.

La fase 1 (backend, ALQ-31) ya reemplazó el contrato de error por **RFC 9457 (Problem Details)**:
cada condición ahora trae un identificador estable `type` (URN `urn:alquia:error:<slug>`), unificó los
duplicados en **409**, y **movió ~16 condiciones de 400 → 409** por semántica. Como el back **eliminó el
campo `message`**, el front debe migrar para llegar a prod junto con el back.

## What Changes

- `ApiError` pasa a llevar `type: string | null` y `fieldErrors: Record<string, string> | null`, además
  de `status`/`message`. `src/lib/api.ts` parsea `type`, `detail` (con fallback `title` → `statusText`) y
  `errors` de la respuesta `application/problem+json` (hoy sólo lee `message`).
- Nuevo módulo `src/lib/error-codes.ts`: **espejo tipado del catálogo** `ApiErrorType` del backend (los
  URN como constantes), un mapa `type → copy en español`, un **fallback genérico en español**, y un helper
  para resolver el copy por `type` con override por pantalla.
- Migrar los ~6 sitios de `err.message === "<inglés>"` a match por `err.type === ERROR.X`
  (`CreationWizard.tsx`, `registro/page.tsx`, `OwnerWorkspace.tsx`). **Nunca** mostrar `detail` crudo
  (inglés): siempre copy por `type` o fallback.
- Revisar las ramas que hoy deciden por `err.status` (400/409) donde el backend movió el status: el
  duplicado concurrente ahora se captura (mismo `type`, 409) → **el bug latente queda arreglado**.
- **BREAKING (coordinado con el back)**: el front deja de depender de `message`. Front y back deben
  mergearse juntos a `main`.
- Validación inline por campo desde la extensión `errors` (donde hoy hay un banner único).

## Capabilities

### New Capabilities
- `manejo-de-errores`: cómo el frontend interpreta los errores del backend. Decide qué mostrar por el
  identificador estable `type` (no por el texto del mensaje ni sólo por el status), muestra copy en
  español por `type` con un fallback genérico en español, nunca expone el `detail` en inglés, garantiza
  que una misma condición de negocio produzca el mismo aviso sin importar el camino/status que la generó,
  y expone los errores por-campo del backend para validación inline.

### Modified Capabilities
- `cambio-de-condiciones`: el requirement «Errores del backend» afirma que el rechazo llega «con 400»;
  tras la fase 1 varios de esos motivos (cuota paga desde el mes, cambio ya programado) llegan como **409**.
  El motivo se distingue por `type`, no por status, y el diálogo lo muestra igual.
- `detalle-inquilino`: el rechazo de documento/teléfono duplicado se reconoce por `type` (robusto ante el
  camino de colisión concurrente, no sólo el chequeo previo), y los rechazos por-campo del backend se
  pueden mostrar junto al campo.

## Impact

- **Código front** (sólo `alquia-frontend`, branch `mvp`): `src/lib/api.ts` (parseo + `ApiError`),
  nuevo `src/lib/error-codes.ts`, `src/components/dashboard/CreationWizard.tsx`,
  `src/app/registro/page.tsx`, `src/components/dashboard/OwnerWorkspace.tsx`, y revisión de
  `src/components/dashboard/CambioCondicionesForm.tsx` y `src/app/tenant-portal/TenantPortal.tsx` por las
  ramas de status.
- **Contrato con el backend**: depende del catálogo `ApiErrorType` de la fase 1; `error-codes.ts` lo
  espeja. Cambios del catálogo en el back deben reflejarse acá.
- **Tests** (Vitest + RTL, `src/tests/`): actualizar los que mockean el body viejo (`{message}`) al shape
  RFC (`{type, detail, status, errors}`); nuevos para `error-codes` y los sitios migrados.
- No se toca `propertly-frontend`. No se cubre i18n/`MessageSource` (el español vive en el front).
