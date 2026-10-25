# Tasks

> **Bloque A (grupos 1–4): no depende del backend.** Se hace y se testea ya, con el cliente
> mockeado. **Bloque B (grupos 5–6): espera** los endpoints de «Qué necesita del backend» en
> `design.md`. Hasta entonces, las acciones quedan detrás de un flag en el cliente.

## 1. Pedido y cliente

- [ ] 1.1 Pasarle a quien hace `propertly-backend` el apartado «Qué necesita del backend» de `design.md` y anotar debajo de ese apartado la respuesta (rutas finales, mensajes de error, si el reemplazo conserva el `id`). Verificación: el apartado tiene la respuesta anotada con fecha.
- [ ] 1.2 Sumar `contracts.cancelScheduledChange(id)` (`DELETE /contracts/{id}/schema-change`) y `contracts.replaceScheduledChange(id, body)` (`PUT`, `retry: false`) a `src/lib/backend-client.ts`. Verificación: tests en `src/tests/lib/backend-client.test.ts` que comprueban método, ruta y cuerpo.
- [ ] 1.3 Exportar desde `backend-client.ts` una constante `CAMBIO_PROGRAMADO_EDITABLE = false`, que habilita las acciones. Verificación: con `false`, los tests del detalle no muestran «Editar» ni «Cancelar cambio».

## 2. Lógica

- [ ] 2.1 En `src/lib/cambio-condiciones.ts`, agregar la precarga desde un contrato programado: mes = `startDate` y alquiler = `initialRentAmount`; vencimiento y actualización, los suyos. Verificación: tests en `src/tests/lib/cambio-condiciones.test.ts` con porcentaje fijo, ICL e IPC.
- [ ] 2.2 Agregar `programadoEditable(programado, hoyISO)`: `true` sólo si el `startDate` es de un mes posterior al corriente. Verificación: test del día 1 del mes de activación (`false`) y del último día del mes anterior (`true`).
- [ ] 2.3 Ampliar `mensajeDeError` de `CambioCondicionesForm` con «ya no está programado», usando el mensaje acordado en 1.1, y moverlo a `cambio-condiciones.ts` para que también lo use la cancelación. Verificación: un test por mensaje, incluido el de cambio ya programado que existe hoy.

## 3. Editar

- [ ] 3.1 Darle a `CambioCondicionesForm` el modo edición con `programado` opcional: precarga de 2.1, el texto de la confirmación y el envío a `replaceScheduledChange`. Verificación: test que abre la edición y ve el alquiler del programado, no el del vigente.
- [ ] 3.2 Botón «Editar» en el aviso del cambio programado (`ContractSummaryCard`), sólo si `programadoEditable` y el flag lo permiten. Abre el diálogo titulado «Editar el cambio programado». Verificación: test en `owner-workspace-cambio-condiciones.test.tsx`.
- [ ] 3.3 Al confirmar: cerrar, recargar el detalle y mostrar el toast «Cambio programado actualizado.». Si falla: diálogo abierto, datos conservados y el aviso sin cambios. Si el motivo es «ya no está programado»: cerrar y recargar. Verificación: tests de éxito, rechazo por cuota paga y «ya no está programado», con el cliente mockeado.

## 4. Cancelar y finalizar

- [ ] 4.1 Botón «Cancelar cambio» en el aviso, junto a «Editar» y con las mismas condiciones, que abre la confirmación: «Volver» en `quiet`, «Cancelar cambio» en `danger` (design, decisión 3). Verificación: test que cierra con «Volver» y comprueba que no se llamó al cliente.
- [ ] 4.2 Al confirmar: llamar a `cancelScheduledChange`, recargar y mostrar el toast «Cambio cancelado.». Si falla: motivo en el diálogo y el cambio sigue programado. Si el motivo es «ya no está programado»: cerrar y recargar. Verificación: tests de los tres casos; después del éxito se ofrece otra vez «Cambiar condiciones».
- [ ] 4.3 En el diálogo «Finalizar este contrato», si hay cambio programado, sumar «El cambio de condiciones programado desde {mes} también se descarta.». Verificación: test en `owner-workspace-detalle-contrato.test.tsx`, con y sin cambio programado.
- [ ] 4.4 `npm test`, `npx tsc --noEmit` y `npm run lint` sin errores al cerrar el bloque A.

## 5. Conectar (cuando el backend esté)

- [ ] 5.1 Ajustar rutas, mensajes y tests de 1.2 y 2.3 a lo que respondió el backend en 1.1, y poner `CAMBIO_PROGRAMADO_EDITABLE` en `true`. Verificación: `npm test` pasa.
- [ ] 5.2 Contra `localhost:8080` con la rama del backend: programar, editar el alquiler, mover el mes, cancelar y volver a programar. Verificación: después de cada paso, el detalle y `GET /contracts/{id}` coinciden.
- [ ] 5.3 Contra `localhost:8080`: finalizar un contrato con un cambio programado y comprobar con `GET /contracts?propertyId=` que no queda ningún `SCHEDULED` huérfano.
- [ ] 5.4 Contra `localhost:8080`: editar con una cuota paga en el mes elegido y comprobar que el cambio anterior sigue intacto (reemplazo atómico).

## 6. Cierre

- [ ] 6.1 Quitar el flag `CAMBIO_PROGRAMADO_EDITABLE` y las ramas muertas. Verificación: `grep` sin resultados y `npm test` pasa.
- [ ] 6.2 En `docs/design/sistema-ui.md`, «Estado de las pantallas», sacar «Cancelar o editar un cambio ya programado» de pendientes. Verificación: la tabla ya no lo lista.
