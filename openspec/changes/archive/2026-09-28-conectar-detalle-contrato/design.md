# Diseño

## Context

El detalle de contrato es la pantalla con más acciones de la app y la que más botones
muertos tiene: cuatro de sus cinco no hacen nada. Es también la primera que maneja
archivos en los dos sentidos —subir y bajar— y la primera con una acción destructiva de
verdad: finalizar un contrato borra las cuotas futuras impagas.

## Goals / Non-Goals

**Goals**

- Que ningún botón visible quede sin efecto: o funciona, o se retira.
- Que las fechas de la línea de tiempo salgan del backend y no de aritmética nuestra.
- Que lo que el contrato ya guarda y nunca se mostró —depósito, comisión, punitorios—
  aparezca, porque es parte de lo que el propietario pactó.

**Non-Goals**

- «Cambiar condiciones». Son dos flujos con sus propias decisiones; van en otro cambio.
- Editar los datos del contrato. `PUT /contracts/{id}` existe pero no hay pantalla de
  edición diseñada.
- Mostrar las cuotas del contrato acá. Eso es Cobranzas, que ya las tiene con sus acciones.

## Decisions

### La próxima actualización se pide, no se calcula

`nextIncrementDate` viene en la respuesta. Calcularla como `startDate +
incrementFrequencyMonths` daría lo mismo sólo mientras el contrato no haya tenido una
renegociación — y el backend ya soporta ese corte. Después de un `schema-change`, el
contrato sucesor arranca a mitad de mes y hereda el fin del anterior: la aritmética
ingenua se despega.

Esto vale también para `nextIncrementRent`, que sólo viene cuando es calculable. Para un
contrato por índice sin valor publicado no viene, y ahí la pantalla muestra la fecha sin
monto — el mismo criterio que ya aplica Inicio con las proyecciones.

### El plazo se dice en fechas, no en meses

El backend reportó que `termMonths` queda un mes corto en todo contrato renegociado: el
corte del `schema-change` es el día de vencimiento, así que el sucesor arranca a mitad de
mes y la cuenta de meses no cierra con las cuotas que realmente se facturan. La
facturación es correcta; el número del plazo no.

Así que el detalle dice «del 01/03/2025 al 28/02/2028», no «36 meses». Es el dato que el
propietario reconoce de su contrato en papel, y es el que no puede estar mal.

### La vigencia del enlace no se afirma

El prototipo decía «Activo hasta que finalice este contrato». Hoy es falso: el token vence
a fin de mes (S-1, pendiente del backend). Escribir la vigencia real —«vence el 30/09»—
tampoco sirve: el `GET` devuelve sólo `{url}`, sin fecha, así que habría que decodificar el
token para saberlo, y eso es leer el reloj de otro.

Se retira la frase. El enlace se copia y ya; cuando S-1 se resuelva y el enlace sea
durable, se puede volver a afirmar la vigencia con verdad.

### Finalizar advierte lo que se lleva puesto

`POST /contracts/{id}/terminate` elimina las cuotas futuras impagas posteriores a la fecha
de corte. El propietario tiene que saberlo antes, no después: el diálogo lo dice
explícitamente, y el botón sólo aparece sobre un contrato vigente.

No se intenta enumerar cuántas cuotas se van a borrar: habría que traer las cuotas del
contrato y replicar el criterio del backend sobre cuáles caen, y errarle sería peor que no
decirlo.

### El historial se carga aparte

`GET /contracts/{id}/rent-increments` es una consulta más. Va en su propio estado: es la
tarjeta menos crítica de la pantalla, y su fallo no debería tapar el alquiler vigente ni el
documento. Mismo criterio que la proyección en Inicio.

### Los archivos usan lo que ya existe

`apiPostForm` y `apiGetBlob` ya están en `api.ts` para exactamente esto. La descarga se
resuelve con un enlace temporal sobre el blob, que es lo que ya hace Cobranzas para los
comprobantes.

## Risks / Trade-offs

- **`documentSizeBytes` puede venir sin `documentUploadedAt`** contra un build viejo. La
  línea del archivo omite la fecha, como ya hace Cobranzas con los comprobantes.
- **Finalizar es irreversible desde la UI.** No hay endpoint para revertirlo. De ahí la
  advertencia explícita y la confirmación.

## Migration Plan

`/prototipo` conserva su detalle de ejemplo. La fila de Contratos deja de rendirse sin
link: hasta ahora no llevaba a ningún lado porque el detalle era de mentira, y esa razón
desaparece con este cambio.
