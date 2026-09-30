# Design

## Context

`POST /contracts/{id}/schema-change` devuelve un `ContractResponse` —el del **sucesor**, con `status: SCHEDULED`— y deja al predecesor `ACTIVE` hasta el mes elegido (el job diario lo activa). Reglas del backend: `effectiveFrom` primer día de mes, posterior al mes corriente y no posterior al último mes de facturación; un solo `SCHEDULED` por propiedad; 400 si hay cuota paga del predecesor desde `effectiveFrom`. `dueDay` 1–28. Ver `specs/scheduled-contract-schema-change/spec.md` del backend.

Hoy el diálogo «Cambiar condiciones» en `OwnerWorkspace.tsx` es un prototipo con valores fijos y **ningún botón lo abre** (`setConditionsOpen(true)` no existe). Sus dos modos («solo la próxima cuota», «a futuro») repiten lo que ya resolvió `ajustar-cuota` en Cobranzas.

## Goals / Non-Goals

**Goals:**
- Un diálogo real, un solo modo, conectado al endpoint nuevo.
- Que el estado `SCHEDULED` no rompa los listados que hoy asumen cuatro estados.

**Non-Goals:**
- Cancelar o editar un cambio programado.
- Simular cuánto rendirán las condiciones nuevas.

## Decisions

1. **La lógica en `src/lib/cambio-condiciones.ts`**, pura y testeada, como `ajustes.ts`: meses elegibles, validación, armado del body. El componente sólo pinta.
2. **Mes elegible, no fecha libre.** Un selector de meses entre el siguiente al corriente y el último del contrato, enviado como `YYYY-MM-01`. Así el 400 por fecha inválida no debería ocurrir; igual se maneja. Alternativa descartada: input de fecha, que invita a elegir un día que no es 1.
3. **Cómo se encuentra el cambio programado.** El sucesor lleva `predecessorContract`; el predecesor sólo lo apunta por `successorContractId` una vez reemplazado. **Verificado en el código del backend** (`ContractController.toResponse` → `getSuccessorContractId` → `findByPredecessorContractId`, sin filtrar por estado): el predecesor `ACTIVE` trae `successorContractId` apuntando al sucesor `SCHEDULED`. El detalle pide ese contrato con `GET /contracts/{id}`. Consecuencia: el aviso «fue reemplazado» sólo corresponde a `SUPERSEDED`; un contrato `ACTIVE` con `successorContractId` tiene un cambio programado.
4. **`SCHEDULED` → «Programado»** en `estadoDeContrato`, fuera de «vigentes», «por terminar» y «finalizados».
5. **Quitar el modo «solo la próxima cuota»** y el estado `conditionMode`; el título pasa a ser el del botón, «Cambiar condiciones desde el próximo período».
6. **No se envía `incrementIndexName` salvo método `INDEX`**, igual que el asistente de contratos.
7. **Sin reintento automático:** un POST que crea un contrato no es idempotente.

## Risks / Trade-offs

- El `:8080` local no tiene el endpoint: hay que levantar la rama del backend, o se verifica sólo con tests.
- Un contrato `SCHEDULED` puede aparecer en pantallas que filtran por estado sin haberlo previsto; la tarea 1 lo cubre con búsqueda de usos.

## Open Questions

Ninguna. La que había —si el predecesor expone al sucesor— se respondió leyendo el código (decisión 3); falta confirmarla contra el servidor en la tarea 5.3.
