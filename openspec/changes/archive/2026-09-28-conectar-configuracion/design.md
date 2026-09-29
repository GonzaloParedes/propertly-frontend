# Diseño

## Context

Configuración es chica pero es la única pantalla donde el propietario **escribe** sobre sí
mismo y sobre cómo se comporta el sistema con sus inquilinos. También es la que más tiempo
prometió algo falso, así que lo que diga su texto importa tanto como lo que guarde.

## Goals / Non-Goals

**Goals**

- Que el texto describa los cuatro avisos que el backend realmente manda, ni más ni menos.
- Que la edición de datos reutilice las validaciones que ya existen, en vez de repetirlas.
- Que nada de la pantalla afirme una preferencia que no exista.

**Non-Goals**

- Cambiar el correo. `UserUpdateRequest` no lo incluye: se cambia por otro camino que no
  existe todavía.
- Borrar la cuenta. `DELETE /users/me` existe, pero una acción irreversible sobre todo el
  historial merece su propia discusión de producto.
- Elegir qué avisos se mandan uno por uno. El backend tiene un interruptor general y los
  días; no hay un flag por ocasión.

## Decisions

### El texto nombra el aviso de cuota confirmada

El prototipo describía sólo los recordatorios de vencimiento. Pero de los cuatro avisos que
el backend manda, el de **cuota confirmada** es el que más le importa al inquilino: es el
que le dice que ya puede pagar, y sin él se entera sólo si entra al portal.

Además no depende de las preferencias: `notifyConfirmation` sale igual. Así que el texto lo
nombra aparte de los tres configurables, para no dar a entender que apagando los
recordatorios se apaga también ese.

### «Moneda operativa» se retira

No existe como preferencia del usuario. `currency` es un campo del contrato (P1-2), y dos
contratos del mismo propietario pueden estar en monedas distintas. Mostrarlo en la cuenta
sugiere una configuración global que no hay y que contradiría el modelo.

### La edición de datos es un reemplazo total, y se nota

`UserUpdateRequest` tiene cuatro campos `@NotBlank`: cambiar sólo el teléfono obliga a
reenviar nombre, apellido y CUIT. Confirmado por el backend (pregunta 7).

Eso define el formulario: se abre con los cuatro campos cargados y se manda entero. No se
intenta un envío parcial ni se calcula qué cambió — sería trabajo extra para llegar al mismo
`PUT`.

### Las validaciones se reutilizan, no se reescriben

`cuit.ts` valida el dígito verificador y `telefono.ts` rechaza el cero de la característica
—el que el normalizador del backend guarda deformado (P1-10)—. Las dos ya se usan en el
registro y en el alta de inquilino. Acá se usan las mismas: si el criterio cambia, cambia en
un lugar.

### Los límites se aplican antes de enviar

El backend acota los días a 0–30. El formulario usa un contador con ese techo, como ya hace
el día de vencimiento del asistente: ofrecer un valor que termina en un 400 al guardar es
peor que no ofrecerlo.

### Al guardar, la sesión se actualiza

`PUT /users/me` devuelve el usuario. Como el nombre alimenta el saludo de Inicio y la barra
lateral, guardar tiene que refrescar la sesión; si no, el propietario cambia su nombre y
sigue viendo el viejo hasta recargar.

## Risks / Trade-offs

- **Los recordatorios dependen del job nocturno.** Un cambio guardado a las 10 de la mañana
  recién se aplica esa noche. La pantalla no lo aclara: decirlo sería exponer una
  implementación del backend, y el efecto práctico para el propietario es nulo.

## Migration Plan

`/prototipo` conserva sus valores de ejemplo y sus formularios no guardan, como el resto de
la demo.
