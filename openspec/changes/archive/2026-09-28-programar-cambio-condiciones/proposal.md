# Proposal

## Why

El botón «Cambiar condiciones» del detalle de contrato promete cambiar el alquiler «desde el próximo período», pero el único endpoint que existía cortaba sobre una cuota ya emitida y podía reescribir períodos impagos. El backend publicó `POST /contracts/{contractId}/schema-change` (commit `c791aeb`), que programa el cambio para un mes futuro. Ahora la promesa se puede cumplir.

## What Changes

- El propietario programa, desde el detalle de un contrato vigente, nuevas condiciones (alquiler, día de vencimiento, actualización) a partir del primer día de un mes futuro.
- Se llama a `POST /contracts/{contractId}/schema-change`. **No** se usa `/invoices/{id}/schema-change`.
- El detalle muestra el cambio programado (sucesor en estado `SCHEDULED`) con su fecha y sus condiciones, y deja de ofrecer programar otro.
- Se conocen los errores 400 del backend: fecha inválida, factura paga desde esa fecha, ya hay un cambio programado.
- Se retira del diálogo la mitad «Modificar solo la próxima cuota»: ya vive en Cobranzas (`ajustar-cuota`) y en el diálogo era un formulario de mentira.
- `ContractStatus` incorpora `SCHEDULED`; los listados de contratos lo tratan como «Programado» y no lo cuentan como vigente.

## Capabilities

### New Capabilities

- `cambio-de-condiciones`: programar y ver un cambio de condiciones a futuro sobre un contrato vigente.

### Modified Capabilities

<!-- Ninguna: detalle-contrato no cambia sus requisitos, sólo suma una acción y un bloque que cubre la capability nueva. -->

## Impact

- `src/lib/backend-types.ts`: `ContractStatus`, `ScheduledSchemaChangeRequest`.
- `src/lib/backend-client.ts`: `contracts.scheduleSchemaChange`.
- `src/lib/contratos.ts`, `tenant-rows.ts`, `inicio.ts`: contratos `SCHEDULED` no son vigentes ni reemplazados.
- `src/components/dashboard/OwnerWorkspace.tsx`: diálogo de condiciones y bloque del cambio programado en el detalle.
- Nuevo `src/lib/cambio-condiciones.ts`: fechas permitidas y validación.
- Dependencia: el `:8080` local aún no expone el endpoint; hay que levantar la rama `codex/frontend-integration-lots` del backend para verificar de punta a punta.

## Out of Scope

- Editar, cancelar o reemplazar un cambio ya programado (el backend tampoco lo permite todavía).
- Más de un sucesor programado por contrato.
- Cambios retroactivos o inmediatos (`/invoices/{id}/schema-change`).
