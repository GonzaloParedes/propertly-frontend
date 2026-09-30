# Diseño

## Context

Inicio es un resumen de cuatro cosas que viven en recursos distintos: cuotas del mes,
proyecciones del mes siguiente, propiedades y contratos. Es la primera pantalla que
necesita las cuatro a la vez, y la única donde un número mal calculado no se nota —no hay
una fila contra la cual contrastarlo.

De ahí que la regla que más pesa acá sea la que ya está en el sistema de UI: la UI no
proyecta montos. Los tres estados del dinero se leen; el cuarto —lo proyectado— se pide.

## Goals / Non-Goals

**Goals**

- Que ningún número de la pantalla se calcule con una regla que el backend no use.
- Que el bloque de avisos diga cosas accionables y desaparezca cuando no hay ninguna.
- Que un dato faltante degrade el bloque que lo usa, no la pantalla entera.

**Non-Goals**

- Selector de período. Inicio es «este mes»; el historial es Cobranzas.
- Resolver los avisos desde acá. Cada uno lleva a Cobranzas, que es donde están las
  acciones y sus diálogos.
- Gráficos de evolución. La barra existente es proporción, no serie temporal.

## Decisions

### Cuatro llamadas en paralelo, ninguna derivada de otra

`/invoices?period=<mes>`, `/pre-invoices?period=<mes+1>`, `/properties` y `/contracts`.
Ninguna necesita el resultado de otra, así que la demora es la de la más lenta.

Las cuotas se acotan al período corriente, no a una ventana: Inicio habla del mes, y un
total que incluyera meses viejos contradiría su propio encabezado. Esto es distinto de
Propiedades, que usa doce meses porque ahí lo que importa es si hay algo pendiente sin
importar de cuándo.

### Lo proyectado se pide, no se estima

`GET /pre-invoices` devuelve sólo los períodos que el backend ya determinó. Para un
contrato por índice sin valor publicado la fila **no existe** —confirmado por el backend
el 17/09/2026: `generateReactive` nunca escribe una proyección especulativa—.

Así que la cuenta es: sumar las proyecciones del mes siguiente, y contar los contratos
vigentes que no tienen una. Ese conteo es lo que la pantalla dice como «a definir según el
índice». No hay que interpretar un `amount: null` porque no existe: la ausencia **es** el
dato.

El caso que conviene no perder de vista es el de una cartera enteramente por índice, donde
no hay nada que sumar. Mostrar «$ 0» ahí sería el peor resultado posible —parece que no va
a cobrar nada—, así que en ese caso no se muestra total.

### Los avisos salen de las mismas cuotas, no de una consulta aparte

Las tres situaciones —pago esperando, cuota sin confirmar, cuota vencida— se derivan de
las cuotas del mes que ya se trajeron. Cobranzas usa exactamente los mismos criterios
(`cobranzas.ts`), así que la derivación se apoya en ese módulo en vez de reimplementarla:
si mañana cambia qué cuenta como «vencida», tiene que cambiar en un solo lugar.

Las vencidas se agrupan en un aviso con el total, y las otras dos se listan por cuota. Es
lo que hace el prototipo y la razón se sostiene: una cuota sin confirmar pide una acción
puntual sobre esa cuota, mientras que tres cuotas vencidas son un solo problema de cobro.

### Un bloque sin dato se degrada solo

Si `/pre-invoices` falla o no existe —contra un build viejo— la tarjeta de proyección no
se muestra y el resto de la pantalla sí. Un resumen de cobranza correcto vale más que una
pantalla entera caída por el bloque que menos se mira.

Las otras tres llamadas sí son necesarias: sin cuotas no hay resumen ni avisos, que son la
razón de ser de la pantalla.

## Risks / Trade-offs

- **`period` es una fecha ISO completa**, no un mes. Ya está documentado en el tipo, pero
  es el error fácil de cometer acá porque la pantalla razona en meses.
- **La proyección depende de que el job del backend haya corrido.** Si las pre-cuotas del
  mes siguiente todavía no se generaron, la pantalla va a decir que todos los contratos
  están a definir. Es correcto según el contrato de la API —ausencia es indeterminado— pero
  puede sorprender.

## Migration Plan

`/prototipo` conserva sus datos de ejemplo, como las otras vistas. Los valores fijos del
panel pasan a un objeto de demo con la forma del dato real, para que la ruta siga siendo
navegable sin sesión.
