# Design

## Context

Ver `proposal.md` — Why. El backend (ALQ-31 fase 1) ya emite RFC 9457 (`application/problem+json`) con un
catálogo de 43 `type` (`exception/ApiErrorType.java`): URN `urn:alquia:error:<slug>` + title (inglés) +
status. Eliminó `message`. El front hoy: `ApiError` sólo guarda `status`/`message`; `src/lib/api.ts` lee
`body.message`; ~6 sitios comparan `err.message === "<inglés>"` y varias ramas deciden por `err.status`
(400/409). Como el back movió ~16 condiciones de 400 → 409, algunas de esas ramas de status quedarían
desalineadas.

## Goals / Non-Goals

**Goals:**
- `ApiError` transporta `type` y `fieldErrors` sin romper a los consumidores que hoy usan `status`/`message`.
- Un único módulo tipado espeja el catálogo del back y centraliza el copy en español.
- El matcheo por texto en inglés desaparece; queda matcheo por `type` con fallback en español.

**Non-Goals:**
- No se cambia el catálogo del back ni se agrega i18n.
- No se rediseñan las pantallas; sólo cómo resuelven el aviso y, donde aplique, validación inline.
- Mirror exhaustivo de los 43 `type` no es obligatorio para los technical/framework que el usuario nunca
  acciona: se mapean a fallback. Se mirrorean con constante + copy los que alguna pantalla distingue.

## Decisions

### `ApiError` aditivo, no breaking para consumidores internos
`ApiError` suma `type: string | null` y `fieldErrors: Record<string,string> | null`; `status`/`message` se
mantienen. `message` pasa a ser `detail ?? title ?? statusText` (ya no `body.message`, que el back eliminó).
Las ramas existentes que leen `err.status` siguen compilando; se migran sólo las que comparan `err.message`.
_Alternativa descartada_: subclases por familia de error — demasiada ceremonia para un discriminante que ya
es un string estable.

### `src/lib/error-codes.ts` como espejo del catálogo
Constantes `ERROR = { DUPLICATE_TAX_ID: "urn:alquia:error:duplicate-tax-id", … } as const`, un mapa
`type → copy en español` por defecto, un `FALLBACK` genérico en español, y un helper
`copyDeError(err, overrides?)` que devuelve el copy por `type` (o el fallback) y permite override por
pantalla. El copy que hoy vive embebido en los sitios (`mensajeDeError*`) se centraliza acá.
_Alternativa descartada_: generar el módulo desde el enum del back en build — no hay pipeline cross-repo
(ALQ-32, post-MVP); se mantiene sincronizado a mano, documentado en `src/lib/CLAUDE.md`.

### El override por pantalla resuelve el copy divergente
Mismo `type` (`duplicate-tax-id`) dice "Ese documento ya figura en otro inquilino suyo" en `OwnerWorkspace`
y "Ese documento ya está registrado" en `registro`. `copyDeError(err, { [ERROR.DUPLICATE_TAX_ID]: "…" })`
cubre el caso sin duplicar la tabla base.

### Nunca mostrar `detail`/`title` crudos
Están en inglés. El front siempre resuelve por `type`; el fallback es español. `detail` sólo se usaría para
telemetría/log, no para UI.

### Status como respaldo, no discriminante
Donde hoy una rama hace `err.status === 400/409` para distinguir condiciones, se pasa a `err.type`. El
status crudo queda sólo para el fallback genérico (p. ej. "revise los datos" ante un 400 sin `type`
conocido).

## Risks / Trade-offs

- **Desincronización front/back del catálogo** → el front cae al fallback en español (degradación segura, no
  rompe); se documenta la regla de sync en `src/lib/CLAUDE.md` y se cubre el fallback con test.
- **Deploy acoplado** (el back eliminó `message`) → front y back deben mergear juntos a `main`; se nota en
  el proposal y en el tasks.
- **Ramas de status que quedaron desalineadas por el 400→409** → se auditan los sitios que hoy branchean por
  `status`, no sólo los que comparan `message`.

## Migration Plan

1. `api.ts` (parseo + `ApiError`) y `error-codes.ts` primero; no cambian comportamiento visible por sí solos.
2. Migrar sitio por sitio los `err.message ===` a `err.type ===` / `copyDeError`.
3. Actualizar tests al shape RFC y sumar los nuevos.
4. Rollback: es front-only y aditivo; revertir los commits del front. (Nada se commitea en esta sesión.)
