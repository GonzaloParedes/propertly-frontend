# Alineación de API · calendario único del inquilino

La spec `propertly-backend/specs/tenant-invoice-calendar/spec.md`
reemplaza nuestra propuesta anterior de `GET /tenant/contract-summary`. Este documento
registra la respuesta del equipo frontend: qué aceptamos y qué ajuste pedimos antes de
cerrar el contrato de API. El [contexto de la pantalla actual](calendario-inquilino-contexto-para-backend.md)
sigue explicando el problema original.

## Acuerdos

- **Un calendario, sin selector de contratos.** `GET /tenant/calendar` devuelve la
  cadena efectiva completa de predecesores y sucesores vinculados. El enlace original
  y cada enlace sucesor muestran el mismo historial. Otro contrato del mismo inquilino
  sin vínculo explícito queda fuera.
- **Meses y estados.** `coverage` permite clasificar meses sin importe; `invoices`
  conserva todas las cuotas, incluso varias del mismo período. `preInvoices` aporta
  `{ contractId, period, amount }` cuando existe un importe proyectado todavía no
  emitido ni confirmado. El front ubica cada elemento por `period`; una factura tiene
  prioridad sobre su proyección consumida y una proyección se muestra como «Importe a
  confirmar», sin acciones de pago. Un sucesor `SCHEDULED` no aparece antes de activarse.
- **Encabezado personal.** `tenant.firstName` y `tenant.lastName` se derivan de la
  sesión del enlace, sin enviar `tenantId` ni `contractId`. El portal los usa sólo
  para el saludo; la respuesta no expone contacto, datos fiscales, propietario ni
  propiedad.
- **Marca visual discreta.** El primer mes de cada intervalo sucesor efectivo dice
  «Cambiaron las condiciones». No sustituye el estado de pago ni anticipa importes.
- **Elegibilidad por cuota.** El front muestra «Subir comprobante» sólo cuando
  `canSubmitPayment` es verdadero. El endpoint de escritura sigue siendo autoridad
  si el estado cambia después de la lectura.

## Regla aceptada: cuotas anteriores impagas

La spec backend implementada permite la siguiente regla precisa:

> Mientras la cadena tenga un sucesor `ACTIVE`, una cuota impaga y confirmada de un
> contrato predecesor `SUPERSEDED`, cuyo período corresponda a su intervalo efectivo,
> puede recibir un comprobante si no tiene un pago activo. Esto vale desde el enlace
> original o el sucesor. `canSubmitPayment` y `POST /tenant/payments` deben coincidir.

No se reabre una cuota pagada ni se recrean cuotas que el cambio de condiciones haya
eliminado. Cuando la cadena ya no tiene contrato activo, se conserva el comportamiento
histórico: lectura de cuotas y comprobantes, sin nuevas cargas.

`canSubmitPayment` y la autorización de `POST /tenant/payments` ya aplican esta misma
regla. El front sólo la representa.
