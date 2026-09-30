# Tareas

## 1. Derivación

- [x] 1.1 Crear `src/lib/recordatorios.ts` con `describirRecordatorios`: los tres valores en
      texto, y el caso de estar apagados.
- [x] 1.2 `limitesDeDias` con el rango que acepta el backend, en un solo lugar.
- [x] 1.3 Tests de las dos.

## 2. Carga

- [x] 2.1 Pedir `GET /users/me/reminder-settings` al abrir Configuración.
- [x] 2.2 Estado de carga y de error para esa tarjeta, sin voltear la de Cuenta.

## 3. Ver

- [x] 3.1 Mostrar los tres valores y el estado del interruptor general.
- [x] 3.2 Nombrar el aviso de cuota confirmada, aparte de los tres configurables.
- [x] 3.3 Mostrar CUIT y teléfono en la tarjeta Cuenta.
- [x] 3.4 Retirar «Moneda operativa».

## 4. Editar recordatorios

- [x] 4.1 Diálogo con los contadores acotados a 0–30 y el interruptor.
- [x] 4.2 Guardar con `PUT` y confirmar.
- [x] 4.3 Cancelar descarta los cambios.
- [x] 4.4 Manejo de error conservando lo escrito.

## 5. Editar datos de la cuenta

- [x] 5.1 Diálogo con nombre, apellido, CUIT y teléfono cargados, y el correo sólo visible.
- [x] 5.2 Validar con `cuit.ts` y `telefono.ts` antes de enviar.
- [x] 5.3 Enviar el objeto completo con `PUT /users/me`.
- [x] 5.4 Refrescar la sesión al guardar, para que el saludo y la barra lateral se actualicen.
- [x] 5.5 Manejo de error conservando lo escrito.

## 6. Verificación

- [x] 6.1 Tests de la vista y de los dos diálogos.
- [x] 6.2 `npm test`, `npx tsc --noEmit` y `npm run lint`.
- [x] 6.3 Probar contra el backend local: leer y guardar las dos cosas.
- [x] 6.4 Actualizar el estado de las pantallas en `docs/design/sistema-ui.md`.
