# Tareas

## 1. Derivación, en un módulo aparte

- [x] 1.1 Crear `src/lib/portal-inquilino.ts` con `FilaCuotaInquilino` y
      `buildFilasInquilino`, reutilizando `estadoDeCuota` de `cobranzas.ts`.
- [x] 1.2 `puedeSubirComprobante`: confirmada y sin pago `AWAITING_CONFIRMATION` ni
      `CONFIRMED` activo — incluye el caso de un pago `REJECTED` anterior.
- [x] 1.3 `ordenarCuotas`: las que requieren atención primero.
- [x] 1.4 Tests de las tres, incluido el caso sin cuotas y el de un pago rechazado con y
      sin motivo.

## 2. La ruta y la sesión

- [x] 2.1 Crear `src/app/tenant-portal/page.tsx`, fuera de `dashboard/`.
- [x] 2.2 Al cargar con `?token=`, canjearlo con `tenantAuth.session`; sin token, ir
      directo a pedir las cuotas.
- [x] 2.3 Un 401 en cualquiera de los dos casos muestra «este enlace no funciona», sin
      distinguir el motivo.
- [x] 2.4 Estado de carga mientras se resuelve la sesión y las cuotas.

## 3. Listado de cuotas

- [x] 3.1 Cada fila con período, vencimiento, importe y estado.
- [x] 3.2 Orden: las que requieren atención antes que las resueltas.
- [x] 3.3 Cuota sin confirmar: importe con la aclaración de que puede cambiar, sin acción
      de subir.
- [x] 3.4 Estado vacío cuando no hay cuotas todavía.
- [x] 3.5 Aviso de error si la carga falla, sin mostrar una lista vacía.

## 4. Subir comprobante

- [x] 4.1 Selector de archivo en las cuotas que lo permiten.
- [x] 4.2 Guardar con `tenantPortal.createPayment` y reflejar el estado sin recargar.
- [x] 4.3 No ofrecer la acción si ya hay un pago activo sin resolver.
- [x] 4.4 Mostrar el motivo de rechazo cuando el último pago fue `REJECTED`, y permitir
      subir de nuevo.
- [x] 4.5 Manejo de error, conservando el estado anterior de la cuota.

## 5. Ver el pago y su comprobante

- [x] 5.1 Mostrar el estado del pago cargado (esperando / confirmado / rechazado).
- [x] 5.2 Ver o descargar el comprobante propio con `tenantPortal.getReceipt`.

## 6. Verificación

- [x] 6.1 Tests de la página: sesión, listado, subida y sus estados de error.
- [x] 6.2 `npm test`, `npx tsc --noEmit` y `npm run lint`.
- [x] 6.3 Probar contra el backend local: token real de punta a punta, contrato
      terminado, pago rechazado y reintento.
- [x] 6.4 Actualizar el estado de las pantallas en `docs/design/sistema-ui.md`.
