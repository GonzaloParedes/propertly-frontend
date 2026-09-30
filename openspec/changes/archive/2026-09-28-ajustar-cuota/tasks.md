# Tareas

## 1. Derivación

- [x] 1.1 Crear `src/lib/ajustes.ts` con `calcularDelta`: importe final y total vigente a
      `{kind, value}`, o nada si no hay diferencia.
- [x] 1.2 `describirAjuste`: cada ajuste en texto, leyendo monto fijo y porcentaje.
- [x] 1.3 `efectoDeAjuste`: cuánto representa un porcentual sobre esa cuota.
- [x] 1.4 Tests de las tres, incluidos el importe igual y los ajustes acumulados.

## 2. La acción en Cobranzas

- [x] 2.1 Ofrecer «Ajustar importe» en las cuotas sin confirmar.
- [x] 2.2 No ofrecerla en las confirmadas.
- [x] 2.3 Que la fila muestre el total nuevo al guardar.

## 3. El diálogo

- [x] 3.1 Mostrar importe base, ajustes cargados y total vigente.
- [x] 3.2 Campo de importe final y de motivo, con el efecto calculado a la vista.
- [x] 3.3 Guardar con `POST /invoices/{id}/adjustments`.
- [x] 3.4 Editar un ajuste existente con `PUT`.
- [x] 3.5 Quitar con `DELETE`, confirmando antes.
- [x] 3.6 Validaciones: motivo obligatorio, importe positivo, diferencia distinta de cero.
- [x] 3.7 Manejo de error, incluido el 400 de cuota confirmada.

## 4. Verificación

- [x] 4.1 Tests del módulo y del diálogo.
- [x] 4.2 `npm test`, `npx tsc --noEmit` y `npm run lint`.
- [x] 4.3 Probar contra el backend local: sumar, editar y quitar.
- [x] 4.4 Actualizar `docs/design/sistema-ui.md`.
