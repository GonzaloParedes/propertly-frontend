# Tasks

## 1. Núcleo: parseo RFC 9457 y catálogo

- [x] 1.1 En `src/lib/api.ts` extender `ApiError` con `type: string | null` y `fieldErrors: Record<string,string> | null` (constructor retrocompatible: `status`/`message` siguen). Verificar: `npm run build`/typecheck compila y los consumidores actuales de `err.status`/`err.message` siguen válidos.
- [x] 1.2 En `fetchWithAuth` (rama `!res.ok`) parsear el body `application/problem+json`: `message = body.detail ?? body.title ?? res.statusText`, `type = body.type ?? null`, `fieldErrors = body.errors ?? null`. Actualizar también el `new ApiError(...)` del camino de refresh fallido. Verificar: test unitario que, dado un body `{type,detail,status,errors}`, produce un `ApiError` con esos campos.
- [x] 1.3 Crear `src/lib/error-codes.ts`: `ERROR` con los URN del catálogo del back que el front distingue (duplicados, property-has-active-contract, payment-on-unconfirmed-invoice, adjustment-on-confirmed-invoice, invoice-total-negative, schema-change-over-paid-invoice, contract-already-has-successor, effective-from-*), el mapa `type → copy en español`, un `FALLBACK` genérico en español, y `copyDeError(err, overrides?)`. Verificar: test de `copyDeError` (type conocido → copy; desconocido/ausente → fallback; override por pantalla).
- [x] 1.4 Documentar en `src/lib/CLAUDE.md` que `error-codes.ts` espeja `ApiErrorType` del back y debe mantenerse sincronizado a mano (no hay pipeline cross-repo; ALQ-32). Verificar: la nota existe y nombra el archivo del back.

## 2. Migrar los sitios que matchean por texto

- [x] 2.1 `src/components/dashboard/CreationWizard.tsx`: `mensajeDeError` (líneas ~28/31) y el error de contrato (~214, "Property already has an active contract") → `err.type === ERROR.*` vía `copyDeError`. Verificar: test RTL que ante un `ApiError` con cada `type` muestra el copy correcto en español.
- [x] 2.2 `src/app/registro/page.tsx` (~25/28, tax id / phone) → match por `type` con el override de copy propio del registro. Verificar: test RTL del registro con esos `type`.
- [x] 2.3 `src/components/dashboard/OwnerWorkspace.tsx`: `mensajeDeErrorCobranza` (~347), `mensajeErrorDeInquilino` (~381/382) y los ajustes (~2357/2360) → match por `type`. Verificar: test RTL por cada helper migrado.
- [x] 2.4 Confirmar que ningún sitio compara ya `err.message === "<inglés>"`. Verificar: `grep -rn 'err.message ===' src` no devuelve nada.

## 3. Auditar ramas por status desalineadas (400→409) y validación inline

- [x] 3.1 `src/components/dashboard/CambioCondicionesForm.tsx` (~28, `err.status === 400`): los motivos "cuota paga desde el mes" y "cambio ya programado" ahora llegan **409**; pasar a distinguir por `type` (schema-change-over-paid-invoice, contract-already-has-successor, effective-from-*). Verificar: test RTL con un rechazo 409 que hoy caería al genérico y ahora muestra el motivo.
- [x] 3.2 Revisar en `OwnerWorkspace.tsx` las ramas `err.status === 400/409` de cobranza/finalización/archivado que el 400→409 pudo desalinear; donde haya un `type` dedicado, usarlo; si no, dejar el fallback por status. Verificar: test de la cobranza sobre cuota no confirmada (ahora 409) mostrando el copy específico.
- [x] 3.3 `src/app/tenant-portal/TenantPortal.tsx` (~165, `err.status === 400`): auditar contra los `type` de pago del inquilino; usar `type` donde aplique. Verificar: test del portal con el rechazo correspondiente.
- [x] 3.4 Validación inline por campo desde `fieldErrors`: en el/los formularios con banner único (p. ej. alta/edición de inquilino) mostrar el error junto al campo cuando el back lo manda. Verificar: test RTL que, dado `errors: { taxId: "…" }`, muestra el mensaje junto al campo del documento.

## 4. Actualizar tests existentes y verificación final

- [x] 4.1 Actualizar los tests de `src/tests/` que mockean el body viejo `{message}` o asertan branching por texto en inglés, al shape RFC `{type, detail, status, errors}`. Verificar: `npm test` en verde.
- [x] 4.2 `npm test` y `npm run lint` en verde en todo el repo. Verificar: ambos comandos salen sin errores.
- [x] 4.3 `openspec validate manejo-de-errores --strict` en verde. Verificar: el comando reporta la change válida.
