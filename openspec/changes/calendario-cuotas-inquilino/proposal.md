# Calendario de cuotas del inquilino

## Why

El portal del inquilino muestra todas las cuotas como tarjetas completas, ordenadas por
urgencia. En un contrato largo, encontrar un mes concreto exige recorrer una lista extensa.
Además, un cambio de condiciones crea un contrato sucesor: la API actual del inquilino
devuelve sólo las cuotas del contrato de su enlace y partiría el calendario y sus acciones
en dos. El calendario anual necesita la cadena completa de contratos relacionados.

## What Changes

- `/tenant-portal` muestra **un solo calendario**, sin selector de contratos, con las
  cuotas del contrato original y sus sucesores efectivos. Cualquiera de sus enlaces
  muestra el mismo historial. Conserva en el detalle importe, ajustes, vencimiento,
  estado, comprobante y acciones actuales.
- El selector permite ir al año anterior, al siguiente o elegir directamente uno de los
  años disponibles; no obliga a recorrer todos los años intermedios.
- Un mes sin cuota se distingue según quede fuera o dentro de los intervalos de
  vigencia de la cadena. El primer mes de cada sucesor lleva una indicación discreta
  «Cambiaron las condiciones».
- La fuente de verdad de los estados sigue siendo `InvoiceResponse` y
  `estadoDeCuota`; el período del calendario sale de `invoice.period`, no de `dueDate`.
- El front consume `GET /tenant/calendar`, propuesto en la
  [spec de backend](../../../docs/backend/spec-api-calendario-inquilino.md), con
  `coverage`, `invoices` y `canSubmitPayment` por cuota. `GET /tenant/invoices`
  conserva su respuesta actual para otros consumidores.

## Capabilities

### Modified Capabilities

- `portal-inquilino` — cambia la navegación y presentación de cuotas; mantiene la
  autenticación, el detalle de pago y las reglas de comprobantes vigentes.

## Impact

- Front: `src/app/tenant-portal/`, `src/lib/portal-inquilino.ts`,
  `src/lib/backend-client.ts`, `src/lib/backend-types.ts` y tests de `src/tests/`.
- Backend, como dependencia: la propuesta
  [`tenant-invoice-calendar`](../../../docs/backend/spec-api-calendario-inquilino.md)
  resuelve la cadena por relaciones persistidas, sin selector ni `contractId` enviado
  por el cliente. Hay una discrepancia de producto sobre comprobantes de cuotas
  anteriores impagas que debe resolverse antes de implementar ambas partes.
- El prototipo de revisión está en `/prototipo/inquilino`; sus datos son ficticios.
- Antes de adoptar la vista, validarla con una persona no técnica usando tareas de
  búsqueda de mes, cambio de año e interpretación de meses fuera del contrato.
