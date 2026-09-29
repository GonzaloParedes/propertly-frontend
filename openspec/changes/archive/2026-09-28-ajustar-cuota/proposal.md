# Ajustar el importe de una cuota

## Why

El detalle de contrato tenía un botón «Cambiar condiciones» con dos flujos adentro. Al
conectarlo lo retiramos porque ninguno funcionaba. Este cambio devuelve el primero: el
ajuste puntual de una cuota.

Es el que más se usa y el único que está entero del lado del backend. El segundo —cambiar
las condiciones a futuro— queda afuera hasta que se resuelva una ambigüedad de la API: el
corte cuelga de una cuota emitida, así que «desde el próximo período» hoy no se puede
expresar. Está preguntado.

Sin esto, un descuento pactado por una reparación o un recargo por expensas no se puede
cargar en ningún lado: el propietario tiene que avisarle al inquilino por fuera y cobrarle
un número distinto del que la app muestra.

## What Changes

- Desde Cobranzas, una cuota **sin confirmar** puede recibir ajustes: descuentos y recargos,
  con un nombre que explique de qué se trata.
- El propietario escribe el **importe final** que quiere cobrar; el sistema calcula la
  diferencia contra el total actual y la guarda como ajuste.
- Los ajustes ya cargados se listan, se editan y se quitan.
- Una cuota **confirmada** no ofrece ajustes, porque el backend los rechaza: confirmar es
  justamente cerrar el importe.
- El inquilino ve el total ajustado, que es lo que ya devuelve la API.

## Capabilities

### New Capabilities

- `ajuste-de-cuota` — sumar, editar y quitar descuentos y recargos sobre una cuota que
  todavía no fue confirmada.

### Modified Capabilities

Ninguna. Cobranzas no es una capacidad registrada todavía; su comportamiento no cambia más
que en la acción nueva.

## Impact

- `src/components/dashboard/OwnerWorkspace.tsx` — una acción más en la fila de Cobranzas y
  su diálogo.
- `src/lib/ajustes.ts` (nuevo) — el cálculo de la diferencia y cómo se dice cada ajuste.
- Endpoints: `POST`, `PUT` y `DELETE` sobre `/invoices/{id}/adjustments`.

## Out of Scope

- **«Cambiar condiciones a futuro»** (`schema-change`). Bloqueado por una pregunta abierta:
  hoy sólo se puede partir en un período que ya tenga cuota emitida, así que el «desde el
  próximo período» que promete la UI no se puede cumplir. Entra cuando respondan.
