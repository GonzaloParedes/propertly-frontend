# Diseño

## Context

Propiedades necesita tres cosas que no vienen en la misma respuesta: la propiedad, su
contrato vigente y la situación de cobranza de ese contrato. Hasta la rama
`codex/frontend-integration-lots` eso obligaba a traerse `/properties`, `/contracts` e
`/invoices` enteros y cruzarlos en el cliente — que es lo que hoy hace Inquilinos y lo
que el pedido al backend describía como «tres listas completas para pintar una lista».

`PropertyResponse.activeContract` resuelve dos tercios: trae `id`, `currentRent` y
`status` del contrato vigente, así que `/contracts` deja de hacer falta.

## Goals / Non-Goals

**Goals**

- Que la pantalla se arme con dos llamadas, no tres.
- Que la lógica de estado y filtrado viva en un módulo testeable, como en Cobranzas y
  Contratos.
- Que `/prototipo` siga navegable sin sesión.

**Non-Goals**

- El selector de período. Propiedades muestra la situación de hoy, no un mes elegido.
- Editar la propiedad. El botón «Editar» queda como está hasta su propio cambio.
- Restaurar una propiedad archivada. Existe el endpoint, pero no hay pantalla que las
  liste; entra con su propio cambio.

## Decisions

### De dónde sale el estado de cobranza

El chip necesita saber si el contrato vigente tiene cuotas vencidas o pagos esperando
confirmación. Tres opciones:

1. **Traer todas las cuotas del propietario** (`GET /invoices` sin filtro) y agrupar
   por contrato. Es lo que hace Inquilinos hoy, y es lo que el pedido señaló que no
   escala: una cartera con dos años de historia son cientos de objetos anidados.
2. **Una llamada por contrato** (`GET /invoices?contractId=`). N llamadas para N
   propiedades.
3. **Acotar por período** (`GET /invoices?periodFrom=`), que ahora se puede.

**Elegida: la 3.** El estado que la pantalla muestra depende sólo de las cuotas que
todavía importan: una vencida sin pagar o un pago sin confirmar. Acotando desde el
primer día del mes anterior alcanza para las dos, y el conjunto pasa de «toda la
historia» a «dos cuotas por contrato».

El riesgo conocido: una cuota vencida hace más de dos meses queda fuera de la ventana y
la propiedad se muestra «Al día» estando en deuda. Se mitiga usando una ventana de doce
meses, que sigue siendo un orden de magnitud menos que traerlo todo y cubre cualquier
mora realista. Si aparece un caso más viejo, la pantalla de Cobranzas —que sí es la de
la deuda— lo muestra igual.

### `activeContract` ausente no es «sin alquilar»

Contra un backend viejo el campo viene ausente para todas las propiedades, y la
pantalla diría que ninguna está alquilada — un dato falso, no un dato faltante. Para
distinguirlo, si **ninguna** propiedad trae `activeContract` y existe al menos un
contrato vigente, la pantalla omite los chips de estado en vez de afirmar que están
todas libres. Es la regla de «lo que el backend no da, no se dibuja» aplicada a una
respuesta incompleta.

### Módulo aparte, como Cobranzas y Contratos

`src/lib/propiedades.ts` expone `buildFilasPropiedad`, `filtrarPropiedades`,
`contarFacetas` y `resumenPropiedades`. El componente queda con el renderizado. Es el
molde que ya siguen `cobranzas.ts` y `contratos.ts`, y lo que permite testear el
estado y las facetas sin montar la pantalla.

## Risks / Trade-offs

- **Depende del deploy.** Contra el build viejo la pantalla funciona pero sin chips de
  estado. Es degradación visible y explicada, no una pantalla rota.
- **La ventana de doce meses es una heurística.** Queda anotada en el código para que
  no parezca un número arbitrario.

## Migration Plan

No hay datos que migrar. `/prototipo` conserva sus arrays: la vista lee de la sesión o
de la demo según el modo, igual que las otras tres vistas ya conectadas.
