# Proposal

## Why

Si el propietario programa un cambio de condiciones y se equivoca —un cero de más en el alquiler, el mes que no era—, hoy no tiene forma de corregirlo: el error queda trabado hasta que el cambio entra en vigencia, y ese primer mes se factura sí o sí con las condiciones equivocadas. El front oculta «Cambiar condiciones» mientras hay un cambio programado y el aviso no ofrece ninguna acción; el backend tampoco expone cómo cancelarlo ni reemplazarlo.

## What Changes

- El aviso «Cambio programado desde…» del detalle del contrato suma dos acciones: **Editar** y **Cancelar cambio**.
- **Editar** abre el mismo diálogo de cambiar condiciones, precargado con el cambio programado (mes, alquiler, vencimiento, actualización) en vez de con las condiciones actuales. Al confirmar, el cambio programado se reemplaza por el nuevo en una sola operación.
- **Cancelar cambio** pide confirmación, borra el cambio programado y el contrato sigue como estaba.
- Al finalizar un contrato que tiene un cambio programado, el diálogo avisa que ese cambio también se descarta.
- Pedido al backend (detallado en `design.md`, apartado «Qué necesita del backend»): cancelar un cambio programado, reemplazarlo de forma atómica, y que finalizar el contrato descarte su cambio programado. Hoy finalizarlo deja al sucesor `SCHEDULED` huérfano y el job falla todos los días al intentar activarlo.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `cambio-de-condiciones`: el cambio programado deja de ser inmutable. Se puede editar o cancelar mientras no entre en vigencia, y lo que se dice al rechazar el backend incluye los casos nuevos.
- `detalle-contrato`: finalizar un contrato con un cambio programado avisa que ese cambio se descarta.

## Impact

- **Front:** `src/components/dashboard/OwnerWorkspace.tsx` (aviso del cambio programado, diálogo de condiciones y diálogo de finalizar), `src/components/dashboard/CambioCondicionesForm.tsx` (modo edición), `src/lib/cambio-condiciones.ts` (precarga desde un contrato programado), `src/lib/backend-client.ts` y `src/lib/backend-types.ts` (endpoints nuevos). Tests en `src/tests/lib/` y `src/tests/components/dashboard/`.
- **Backend (`propertly-backend`, rama `mvp`):** dos operaciones nuevas sobre el cambio programado y un ajuste a `POST /contracts/{id}/terminate`. La parte del front que las usa queda bloqueada hasta que existan.
- **Docs:** `docs/design/sistema-ui.md`, en «Estado de las pantallas», tiene hoy «Cancelar o editar un cambio ya programado (el backend no lo ofrece)» como pendiente.
