# Design

## Context

Lo que existe, tal como lo dejó `programar-cambio-condiciones` (archivado el 28/09/2026):

- `POST /contracts/{id}/schema-change` crea un sucesor `SCHEDULED` y deja `ACTIVE` al predecesor. El predecesor lo apunta con `successorContractId`, y el detalle lo trae con `GET /contracts/{successorId}` (`useScheduledContractLoad` en `OwnerWorkspace.tsx`).
- El front decide qué mostrar con dos datos: con `successorContractId` y el sucesor `SCHEDULED` muestra el aviso «Cambio programado desde…»; sin `successorContractId` ofrece «Cambiar condiciones». Si el cambio programado desaparece, el detalle recargado vuelve solo al segundo caso, sin lógica nueva.
- `CambioCondicionesForm` precarga desde el contrato vigente (`condicionesIniciales`) y llama a `scheduleSchemaChange`. Los mensajes de error se eligen por texto del 400 (`mensajeDeError`).

Lo que falta en el backend (`propertly-backend`, `origin/mvp` en `e97ce36`), verificado en el código:

- `scheduleSchemaChange` rechaza con 400 «Contract already has a scheduled successor». No se puede programar encima.
- No hay forma de cancelar: `ContractController` no tiene `DELETE` de contrato ni otra acción que lo haga.
- `PUT /contracts/{id}` sobre el sucesor no sirve. `update` rechaza con «Property already has an active contract», porque el predecesor de la misma propiedad sigue `ACTIVE`. Aunque pasara, permitiría tocar `startDate`, `propertyId` y `tenantId`, y romper que el sucesor arranca el día 1 del mes y hereda propiedad e inquilino.
- `terminate` sólo pasa el predecesor a `TERMINATED` y no toca el sucesor `SCHEDULED`. Al llegar el mes, `activateScheduledContract` lanza «Scheduled contract must have an active predecessor». El job lo intenta y falla todos los días, cada uno en su propia transacción.

## Goals / Non-Goals

**Goals:**
- Reusar el formulario y la lógica de programar. Editar es programar con otra precarga y otro endpoint.
- Que un error del backend nunca deje al propietario sin el cambio que tenía programado.
- Que la parte del front que no depende del backend se pueda hacer y testear ya.

**Non-Goals:**
- Editar un cambio que ya entró en vigencia. Para eso está programar uno nuevo.
- Historial de cambios cancelados o reemplazados.
- Tocar el endpoint heredado `POST /invoices/{id}/schema-change`.

## Decisions

1. **Editar reutiliza `CambioCondicionesForm` con un modo.** El componente recibe un `programado?: ContractResponse` opcional. Con él, la precarga sale del contrato programado: mes = su `startDate`; alquiler, vencimiento y actualización, sus valores. Además, el título pasa a «Editar el cambio programado», la confirmación a «Guardar cambio» y el envío va al endpoint de reemplazo. El rango de meses se sigue calculando sobre el contrato vigente, porque el sucesor hereda su `endDate`. Se descartó un formulario aparte porque duplicaría validación, revisión y errores.
   La precarga del programado se toma de `initialRentAmount` y no de `currentRent`. Un contrato `SCHEDULED` todavía no tiene aumentos aplicados, así que hoy valen lo mismo, pero `initialRentAmount` es lo que se cargó.

2. **Reemplazo atómico, no «cancelar y volver a programar».** Si el front hiciera `DELETE` + `POST` y el segundo fallara (cuota paga en el mes nuevo, red, sesión vencida), el propietario perdería el cambio que tenía y no se enteraría hasta ver el aviso vacío. Por eso se pide una sola operación al backend (ver abajo). Mientras no exista, la edición queda deshabilitada. No se hace un sustituto en dos pasos.

3. **Cancelar con diálogo de confirmación**, con el mismo patrón que «Quitar este ajuste» o «Archivar esta propiedad»: `Dialog` con explicación, «Volver» en `quiet` y «Cancelar cambio» en `danger`. Texto: «El contrato sigue con sus condiciones actuales. Si más adelante quiere cambiarlas, puede programar un cambio nuevo.» El botón de cerrar dice «Volver», no «Cancelar», para que no haya dos «Cancelar» con sentidos opuestos en el mismo diálogo.

4. **Las acciones van dentro del aviso del cambio programado**, en `ContractSummaryCard`, como botones `secondary` chicos. No van en el encabezado: ahí «Finalizar contrato» es la acción destructiva del contrato, y sumar dos botones del cambio programado mezcla niveles. Ver la tabla de tonos en `docs/design/sistema-ui.md` («`quiet` nunca solo en una fila»).

5. **Después de cada acción se recarga el detalle** (`setRecargaContrato`), como ya hace `conditionsProgrammed`. No se arregla el estado local a mano. El reemplazo puede devolver un sucesor con otro `id`, y recargar evita asumir que se mantiene.

6. **«Ya no está programado» se trata aparte.** Si el job activa el cambio o otra pestaña lo cancela mientras el diálogo está abierto, el backend responde con un error propio. El front lo reconoce por el texto, igual que los demás 400 de `mensajeDeError`, muestra «Este cambio ya entró en vigencia o fue cancelado» y recarga el detalle.

7. **Finalizar con un cambio programado:** el diálogo de finalizar suma una oración si hay `scheduledContract`. El descarte lo hace el backend dentro de `terminate`. El front no cancela antes de terminar, por la misma razón que en la decisión 2.

## Qué necesita del backend

Este apartado se le pasa tal cual a quien hace `propertly-backend`. Las rutas son una propuesta; lo que importa es el comportamiento. Las tres operaciones cuelgan del contrato **vigente**, igual que el `POST` que crea el cambio, así el front no maneja el `id` del sucesor para escribir.

**1 · Cancelar el cambio programado**

`DELETE /contracts/{id}/schema-change`, donde `{id}` es el contrato `ACTIVE`.

- Borra el sucesor `SCHEDULED`. El predecesor queda exactamente como estaba: `ACTIVE`, con sus cuotas, y sin `successorContractId` en la próxima lectura.
- Es seguro porque un sucesor `SCHEDULED` todavía no tiene `PreInvoice`, `Invoice` ni acceso del inquilino. Si alguno de esos supuestos no se cumple, avisar: cambia el diseño.
- `204` si se canceló. `400` con un mensaje propio, por ejemplo «Contract has no scheduled successor», si no hay cambio programado (ya se activó o ya se canceló). Mismo scoping por usuario que el resto: `404` si el contrato no es del usuario.

**2 · Reemplazar el cambio programado en una operación**

`PUT /contracts/{id}/schema-change`, con `{id}` el contrato `ACTIVE`. Mismo cuerpo que el `POST` (`ScheduledSchemaChangeRequest`: `effectiveFrom` más las condiciones).

- En una sola transacción: valida igual que el `POST` (primer día de mes, mes futuro, dentro del plazo, sin cuota paga desde `effectiveFrom`, configuración de actualización) y reemplaza el sucesor `SCHEDULED` por uno con los datos nuevos.
- Si algo falla, el cambio programado anterior queda intacto.
- Devuelve el `ContractResponse` del sucesor, con `status: SCHEDULED`. Puede ser el mismo registro actualizado o uno nuevo: el front no asume que el `id` se mantiene.
- `400` con el mismo mensaje que en el punto 1 si no hay cambio programado. Los demás `400` iguales que en el `POST`.
- Alternativa igual de buena: que el `POST` acepte reemplazar si ya hay uno programado. La preferimos explícita, porque un `POST` que pisa sin avisar puede borrar un cambio que otra pestaña acaba de programar.

**3 · Finalizar descarta el cambio programado**

`POST /contracts/{id}/terminate`: si el contrato tiene un sucesor `SCHEDULED`, lo borra en la misma transacción.

- Hoy queda huérfano y `activateScheduledContract` falla cada día al llegar su mes («Scheduled contract must have an active predecessor»).
- Es un bug del backend aunque el front no cambie nada. Para el front, alcanza con que después de terminar el detalle no muestre el aviso.

## Risks / Trade-offs

- [El backend tarda o elige otra forma] → La tarea se divide en dos bloques: el primero no depende del backend y se testea con el cliente mockeado. Si las rutas cambian, sólo se tocan los dos métodos de `backend-client.ts` y sus tests.
- [El día 1 del mes de activación, antes de que corra el job, el sucesor sigue `SCHEDULED` pero su mes ya no es futuro] → El formulario no lo puede editar (el mes no está en el rango) y el backend tampoco lo aceptaría. Ese día el aviso muestra el cambio sin «Editar» ni «Cancelar cambio». Se calcula comparando su `startDate` con el mes corriente.
- [Reconocer el error por texto es frágil] → Es el criterio que ya usa `mensajeDeError`. Se pide un mensaje fijo y se cubre con un test por mensaje. Si el backend algún día devuelve códigos, se cambia en un solo lugar.
- [Recargar después de cada acción suma un viaje] → Es el mismo costo que hoy al programar, y evita mantener a mano un estado que el backend define.

## Open Questions

- Si el reemplazo conserva el `id` del sucesor o crea uno nuevo. No cambia el front (decisión 5), pero conviene saberlo para leer los logs.
