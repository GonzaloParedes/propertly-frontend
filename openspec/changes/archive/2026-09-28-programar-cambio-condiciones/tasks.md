# Tareas

## 1. Contrato con el backend

- [x] 1.1 Comprobar la forma real: respuesta del POST y si el predecesor expone al sucesor `SCHEDULED`. Resuelto leyendo el código de la rama `codex/frontend-integration-lots` y anotado en `design.md` (decisión 3); la prueba contra el servidor queda en 5.3.
- [x] 1.2 Sumar `SCHEDULED` a `ContractStatus` y `ScheduledSchemaChangeRequest` a `backend-types.ts`.
- [x] 1.3 Sumar `contracts.scheduleSchemaChange(id, body)` a `backend-client.ts`, con su test.
- [x] 1.4 Buscar todos los usos de `ContractStatus` y hacer que `SCHEDULED` no cuente como vigente ni reemplazado (`contratos.ts`, `tenant-rows.ts`, `inicio.ts`): estado «Programado».

## 2. Lógica

- [x] 2.1 Crear `src/lib/cambio-condiciones.ts`: meses elegibles (siguiente al corriente hasta el último del contrato) y `YYYY-MM-01`.
- [x] 2.2 Validación: alquiler > 0, día 1–28, frecuencia > 0, valor o índice según el método.
- [x] 2.3 Armado del body sin `incrementIndexName` fuera de `INDEX`.
- [x] 2.4 Tests de las tres, incluidos fin de contrato el mes siguiente y contrato sin meses elegibles.

## 3. El diálogo

- [x] 3.1 Retirar el modo «solo la próxima cuota» y `conditionMode`.
- [x] 3.2 Abrir el diálogo desde el detalle de un contrato vigente sin cambio programado; no ofrecerlo en los demás.
- [x] 3.3 Campos precargados con las condiciones actuales; selector de mes; validaciones a la vista.
- [x] 3.4 Paso de revisión con lo que queda intacto y lo que rige desde el mes.
- [x] 3.5 Confirmar con `POST /contracts/{id}/schema-change`; error 400 con el motivo y datos conservados.

## 4. Ver el cambio programado

- [x] 4.1 Bloque en el detalle con mes de inicio y condiciones nuevas (según lo hallado en 1.1).
- [x] 4.2 Refrescar el detalle al confirmar.
- [x] 4.3 «Programado» en el listado de contratos.

## 5. Verificación

- [x] 5.1 Tests del diálogo, del bloque y del listado.
- [x] 5.2 `npm test`, `npx tsc --noEmit` y `npm run lint`.
- [x] 5.3 Probar de punta a punta contra la rama del backend.
- [x] 5.4 Actualizar `docs/design/sistema-ui.md` (pendiente «Cambiar condiciones a futuro») y `docs/backend/pedido-de-cambios-api.md`.
