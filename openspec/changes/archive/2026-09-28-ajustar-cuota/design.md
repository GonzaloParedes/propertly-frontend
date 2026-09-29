# Diseño

## Context

El backend modela el ajuste como un **delta**: nombre, si suma o resta, si es monto fijo o
porcentaje, y el valor. La pantalla, en cambio, pregunta por el **importe final** que el
propietario quiere cobrar. Traducir entre las dos cosas es casi todo el trabajo de este
cambio.

Verificado contra la instancia el 28/09/2026: el porcentaje se aplica sobre el importe base
y los montos fijos se suman después. Con base $700.000, un descuento del 10 % deja $630.000,
y sumarle un recargo fijo de $30.000 da $660.000.

## Goals / Non-Goals

**Goals**

- Que el propietario piense en el número que va a cobrar, no en la diferencia.
- Que el total que ve él sea el mismo que ve el inquilino.
- Que la acción no aparezca donde el backend la va a rechazar.

**Non-Goals**

- `schema-change`. Fuera de alcance por una pregunta abierta.
- Ajustes recurrentes. El modelo es por cuota; repetirlo todos los meses no está pedido.
- Calcular punitorios automáticamente. El backend lo dejó anotado como algo que encajaría
  acá, pero es decisión suya y no nuestra.

## Decisions

### El delta se calcula en el front

Ya está respondido por el backend (pregunta 2): calculamos `importe deseado − total vigente`
y lo mandamos como monto fijo, con el signo puesto en `kind`.

La carrera que nos preocupaba no existe: los ajustes sólo se aceptan mientras la cuota no
está confirmada, y una cuota sin confirmar no admite pagos, así que nadie más le mueve el
total. El único escenario de conflicto es el mismo propietario en dos pestañas.

### Siempre monto fijo, aunque el backend acepte porcentaje

Un ajuste nuevo se guarda como `FIXED_AMOUNT`. El propietario escribió un importe final, y
un porcentaje calculado a partir de una diferencia sería un número arbitrario que además
volvería a aplicarse sobre el base si alguien lo edita.

Los porcentuales que ya existan —cargados por otra vía— se **muestran** como tales. Leer los
dos formatos y escribir uno solo es deliberado.

### El efecto se muestra antes de guardar

El diálogo dice, mientras se escribe, cuánta es la diferencia y si es descuento o recargo.
Es la única forma de que el propietario vea lo que realmente se va a guardar, dado que lo
que guarda no es lo que escribe.

### La acción sale de la fila de Cobranzas, no del detalle de contrato

En el prototipo estaba en «Cambiar condiciones», dentro del contrato. Pero el ajuste es de
**una cuota**, y las cuotas viven en Cobranzas, con su estado y su acción propia. Ponerlo
ahí evita que el propietario tenga que entrar al contrato para tocar el mes que ya está
mirando.

Cobranzas ya resuelve por fila cuál es la única acción que corresponde. Ajustar es una
acción más sobre la misma cuota, no la reemplaza: una cuota sin confirmar ofrece confirmar
**y** ajustar, en ese orden, porque confirmar es lo que la destraba para el cobro.

### Confirmar y ajustar son opuestos, y la pantalla lo dice

Confirmar cierra el importe: después no se puede ajustar. Eso ya estaba escrito en el
sistema de UI como regla del dominio, y acá se vuelve visible. El diálogo de ajuste lo
menciona para que el propietario entienda el orden: primero ajusta, después confirma.

## Risks / Trade-offs

- **El importe final se calcula sobre el total vigente, que incluye ajustes anteriores.** Si
  ya hay un descuento cargado y el propietario fija un importe final, el delta nuevo se suma
  a los que había. Es lo correcto, pero el diálogo tiene que mostrar el total de partida
  para que no sorprenda.
- **Dos pestañas pueden pisarse.** Sin control de concurrencia en la API, la última gana.
  Aceptado: es el mismo usuario y el efecto es visible al recargar.

## Migration Plan

`/prototipo` no ofrece la acción: sus cuotas son de ejemplo y guardar no haría nada.
