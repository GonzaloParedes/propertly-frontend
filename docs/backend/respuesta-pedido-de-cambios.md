# Respuesta al pedido de cambios al backend

**Fecha:** 17/09/2026 · **De:** desarrollo de `propertly-backend`
**Responde a:** `docs/backend/pedido-de-cambios-api.md` (06/09, revisado 16/09 y 17/09)
**Verificado contra:** `propertly-backend@mvp` en `936fc3c`, leyendo el código fuente y los
documentos de `specs/`. Cada veredicto de abajo se chequeó contra el `.java` o el `.sql`
correspondiente, no contra memoria.

## Sobre el documento de ustedes

Verifiqué las 21 afirmaciones técnicas del pedido y **no encontré ninguna incorrecta**. Los
campos que faltan faltan, los filtros son los que describen, y el normalizador de teléfono
rompe exactamente como dice P1-10. Donde abajo agrego algo, es información que no tenían
desde afuera, no una corrección.

Las estimaciones son gruesas, para un desarrollador, e incluyen migración y tests bajo el
gate de cobertura del 100% que rige el repo.

---

## 1 · «Contra su propio spec»: tres de las cuatro ya están hechas

Las miramos esta semana, antes de recibir el pedido. **Todavía no están commiteadas**, así que
`origin/mvp` sigue en `936fc3c` y ustedes no las ven. Ese es el primer paso de todo lo que
sigue.

| | Estado |
|---|---|
| **S-1** · el enlace vence a fin de mes | ⏸ Decisión de producto pendiente |
| **S-2** · el portal se cierra al terminar el contrato | ✅ Hecho |
| **S-3** · la fecha de fin cae un día tarde | ✅ Hecho, con migración `V2` |
| **S-4** · el autocompletado devuelve referencias irresolubles | ✅ Hecho |

### S-2 — hecho

Sacado el filtro de `ContractService.getForTenantAccess`. Resuelve para los cuatro estados, no
sólo ACTIVE/TERMINATED/EXPIRED: incluimos **SUPERSEDED**, que ustedes no mencionaron pero
importa igual, porque sin eso una renegociación le borraba al inquilino todo el historial
anterior al corte.

### S-3 — hecho

`minusDays(1)` al derivar `endDate`, más un ajuste que no se podía ver desde afuera:
`applySchemaChange` usaba el `endDate` del predecesor como cota exclusiva para calcular el
plazo del sucesor, así que el `minusDays(1)` solo le comía un mes a cada renegociación.

Va con una migración `V2` que corrige las filas existentes. **Ninguna cuota ni importe
cambia**: `endDate` se lee como cota exclusiva contra períodos clavados al día 1, así que las
dos convenciones generan exactamente los mismos períodos. Lo único que se mueve es la fecha que
ustedes muestran y el día de expiración del contrato.

### S-4 — hecho

Normalización de la fuente antes de llamar a `/v1/place` (`openstreetmap`→`osm`,
`openaddresses`→`oa`, `geonames`→`gn`, `whosonfirst`→`wof`), hecha **a la entrada de `resolve`
y no al emitir la sugerencia**, para que las referencias que el front ya tenga guardadas o
cacheadas sigan resolviendo.

Además agregamos `layers=address` al autocompletado, que resuelve la segunda mitad de lo que
reportaron: ya no van a venir localidades con `street: null` y `number: null`. La contrapartida
es que van a ver menos sugerencias por consulta, porque desaparecen las capas gruesas.

**Pueden sacar la lista fija de diez direcciones** del alta de propiedad en cuanto esto esté
pusheado.

### S-1 — sigue abierta, y es decisión de producto

El commit de Lucas (`8b36a3a`) fue deliberado; el spec dice lo contrario y nadie lo actualizó.
Hay que elegir cuál vale. Dos datos para esa decisión:

- **Si se saca el vencimiento, el token pasa a ser determinístico.**
  `generateTenantAccessToken` no setea `issuedAt`, así que sin `exp` el JWT queda byte a byte
  idéntico siempre. Con eso el «mismo link» que pide FR-3/AC-3 se cumple solo — hoy no se
  cumple: cada reenvío emite un token distinto.
- **Hoy el mail de acceso mensual es el único aviso que recibe el inquilino.** Si el token se
  vuelve durable, ese aviso accidental desaparece. O sea que **S-1 y P0-6 hay que decidirlas
  juntas**, o el inquilino queda peor que ahora.

---

## 2 · P0

### P0-1 · Enlace de acceso del inquilino — *agregar, partido en dos*

- **`GET`** — **~0,5 día.** `issueTenantAccess` ya arma la URL; se trata de devolverla en vez de
  sólo mandarla por mail. El QR lo generan ustedes, coincidimos.
- **`POST` (regenerar) y `DELETE` (revocar)** — **~2 días**, y contradicen el diseño actual. El
  token es un JWT stateless sin almacenamiento: revocar exige guardar algo por contrato (una
  versión o un nonce) y validarlo en cada request. Además el spec del portal puso la revocación
  explícitamente fuera de alcance.

**Recomendación:** hacer el `GET` ahora y **sacar «se puede revocar y regenerar» del texto** del
detalle de inquilino para el MVP. Es una promesa que hoy no tiene nada detrás y que cuesta más
que las otras seis cosas de esta lista juntas.

### P0-2 · Proyecciones (`PreInvoice`) — *está a medias, se reutiliza* · ~1 día

Confirmado: `PreInvoice` no aparece en ningún DTO de respuesta ni en ningún controller. Es un
DTO más un endpoint, no un modelo nuevo.

**Tienen una respuesta gratis a la pregunta que hacen.** Para un contrato ICL/IPC sin valor
publicado, la `PreInvoice` **simplemente no existe**: `generateReactive` sólo escribe períodos
ya ciertos, nunca una fila especulativa. Así que «no viene la `PreInvoice`» ya es la semántica
real del sistema — no hace falta `amount: null` ni ningún centinela. Ausencia significa «a
definir según ICL».

### P0-3 · Próxima actualización e historial — *está a medias* · ~0,5 día el campo, ~1 día el endpoint

Tienen razón en que no se puede calcular desde el front, y por un motivo más fuerte del que
dan: el `endDate` del sucesor se hereda del predecesor, así que después de una renegociación la
fórmula `startDate + incrementFrequencyMonths` no da. El backend ya calcula esa fecha
(`IndexIncrementBehavior.certaintyBoundaryExclusive`); se trata de exponerla.

### P0-4 · Marcas de tiempo — *agregar* · ~1 día

Encontramos por qué faltan, y no fue olvido: el plan de `invoice-payment-separation` dice
textual *«no separate timestamp column needed»*, porque para **ordenar** alcanza el id
monotónico. Se resolvió el orden y nadie pensó en **mostrar** la fecha. El pedido es legítimo.

Haríamos sólo `Payment.submittedAt` y `Contract.documentUploadedAt`. `createdAt`/`updatedAt` en
todas las entidades es bastante más caro y no hace falta para ninguna de las tres líneas de
texto que citan.

### P0-5 · Filtros de `GET /invoices` — *agregar* · ~1,5 días con los conteos

Confirmado, incluido el `400` cuando se mandan `contractId` y `tenantId` juntos.

**Coincidimos en que va segundo en prioridad.** Traer ~500 objetos anidados para pintar cinco
chips es hoy el problema más caro que tienen contra producción.

### P0-6 · Recordatorios y configuración — *agregar, y es el más grande* · ~1 semana

Su corrección del 16/09 es correcta y la confirmamos: **no falta la configurabilidad, falta
todo el canal**. `EmailService` manda tres mails y ninguno pertenece al ciclo de cobranza.

Esto es un feature, no un endpoint: entidad de preferencias, job nuevo, plantilla nueva y CRUD.
**Lo dividiríamos en dos:**

1. El aviso de «cuota confirmada, se puede pagar» más el recordatorio de vencimiento, con
   valores fijos del sistema — **~3 días**.
2. La preferencia editable por propietario — **~2 días**.

Con la primera mitad la pantalla muestra los valores como informativos y deja de mentir, que es
la salida que ustedes mismos proponen. Recuerden la dependencia con S-1.

### P0-7 · Contrato en `PropertyResponse` — *agregar, lo más barato de la lista* · ~0,5 día

Confirmado: `PropertyResponse` trae `tenant` y nada del contrato. Ya existe
`existsByPropertyIdAndStatus`; falta el `findBy` equivalente.

**Coincidimos en que va en el podio**: media jornada que destraba la pantalla más grande que
les falta.

---

## 3 · P1

| | Veredicto | Estimación |
|---|---|---|
| **P1-1** código postal (+ lat/long) | Agregar | ~0,5 día |
| **P1-2** moneda del contrato | Agregar | ~0,5 día |
| **P1-3** cuatro categorías nuevas | Agregar | **~2 h** |
| **P1-4** depósito / garantía | Agregar | ~0,5 día |
| **P1-5** comisión | Agregar | ~0,5 día |
| **P1-6** punitorios (sólo guardarlos) | Agregar | ~0,5 día |
| **P1-7** renovación y rescisión | Agregar | ~0,5 día |
| **P1-8** `dueDay` 1–10 | **Ampliable a 1–28** | ~1 h |
| **P1-9** motivo de rechazo | Agregar | ~0,5 día |
| **P1-10** normalizador de teléfono | **Bug confirmado** | ~0,5 día |

Tres aclaraciones que cambian algo:

**P1-3 no es sólo editar el enum.** Los enums se persisten como STRING **con CHECK constraint en
la base**: `properties_category_check` lista los cuatro valores actuales. Agregar `OFFICE`,
`GARAGE`, `LAND` y `OTHER` necesita una migración Flyway que recree esa constraint. Sigue siendo
chico, pero si alguien sólo toca el Java la app arranca y explota al guardar.

**P1-8: el rango es deliberado, el número 10 no.** El spec `configurable-invoice-due-date` dice,
en los constraints impuestos por el stakeholder: *«deliberately bounded so that it is valid in
every calendar month with no shortening/clamping needed for shorter months»*. Lo intencional es
que no haya que clampear en febrero — y **1–28 satisface ese criterio exactamente igual que
1–10**. No hay nada en ningún documento que defienda el 10 sobre el 28. Lo ampliaríamos: es la
decisión que respeta la intención escrita.

**P1-10 verificado, y ya ensució datos.** La aritmética es la que describen: el regex es greedy,
`\d{2,4}` toma `0114`, `\d{6,8}` toma `4552210`, y compone `+549` + `0114` + `4552210` =
`+54901144552210`. Confirmamos también lo del separador único: `11 4455-2210` falla porque el
segundo grupo no admite el guion.

Lo que no está en su documento: **hay números ya guardados deformados**. Al arreglar el
normalizador hay que decidir qué se hace con ellos, y no se pueden reconstruir automáticamente
con certeza. Cuanto antes se arregle, menos filas hay que limpiar.

---

## 4 · P2

### P2-1 · Copropiedad — *fuera del MVP* · ~3-4 días

Su diseño es correcto: `PropertyOwner` como dato del inmueble y no como `User` es exactamente
el paralelo de `Tenant`. Pero no bloquea ninguna pantalla del camino crítico. Sacaríamos la
sección de `OwnersField` del formulario por ahora.

### P2-2 · Varios inquilinos y garantes — *fuera del MVP, con fuerza* · ~1-2 semanas

Coincidimos en que es el más caro, y hay algo que lo agrava: el portal del inquilino resuelve
el contrato desde un token que codifica `(contractId, tenantEmail)`. Pasar a N:N obliga a
redefinir qué significa ese token cuando hay dos titulares. Tocar eso mientras el portal
todavía no se construyó es pedir problemas.

### P2-3 · Archivar vs. borrar — *agregar* · ~2 días

Es el mejor análisis del documento: verificaron `cascade`/`orphanRemoval` antes de pedir nada y
llegaron a la conclusión correcta — no hay riesgo de pérdida de datos, el `409` protege. El
pedido real (que el `409` sea discriminable y que exista `Archivar`) es el correcto.

---

## 5 · Las siete preguntas de diseño

### 1 · `schema-change` cuelga de la cuota

El corte es `splitStartDate = invoice.getDueDate()` — **la fecha de vencimiento, no el primero
del período**. Manden **la cuota del primer período que quieren bajo las condiciones nuevas**;
el backend normaliza con `withDayOfMonth(1)` para decidir qué cuotas borra, así que lo que
importa es el mes. Si no hay ninguna cuota generada, la acción no se puede disparar: el endpoint
cuelga de un `Invoice` que tiene que existir.

**Encontramos algo que conviene que sepan.** Como el corte es el `dueDate`, **todo contrato
sucesor arranca a mitad de mes** (el día 5 si `dueDay` es 5). Eso hace que `termMonths` no
coincida con la cantidad de cuotas que realmente se facturan: para un corte el 05/08/2026 sobre
un contrato que termina el 31/12/2026, `termMonths` da 4 y se generan 5 cuotas. Es preexistente
y no rompe la facturación —las 5 cuotas son las correctas—, pero **el `termMonths` que muestren
en pantalla va a estar un mes corto en todo contrato renegociado**. Lo tratamos aparte.

### 2 · Importe final vs. ajuste

Calculen el delta en el front y mándenlo como `FIXED_AMOUNT`. La carrera que les preocupa es
teórica acá: los ajustes **sólo se aceptan mientras la cuota no está confirmada**, y una cuota
sin confirmar no admite pagos, así que no hay nadie más moviéndole el total. El único escenario
de conflicto es el mismo propietario en dos pestañas.

### 3 · Comprobante obligatorio también del lado del propietario

Es deliberado y reciente. El plan de `invoice-payment-separation`, decisión D-11: *«nothing in
the new model creates a Payment without proof of payment»*, y FR-23 pide «exactly one uploaded
receipt file». **El caso del efectivo simplemente no se consideró** — no es una omisión del
código, es un hueco del spec.

De paso: el spec viejo `payment-receipts` todavía dice que se puede *borrar* el comprobante de
un pago. Eso ya no es posible (columnas `NOT NULL`). Es una contradicción código-vs-spec más,
menor, pero ahí está.

**Respuesta para la pantalla:** que el propietario suba una foto del recibo que él mismo firma.
Es defendible y no requiere backend. La otra opción —comprobante opcional cuando
`submittedByTenant = false`— es ~1 día, pero cambia un invariante que se decidió hace poco a
propósito, así que la pediríamos explícitamente.

### 4 · `Property.tenant` y `Contract.tenant`

**Están leyendo el campo correcto.** `Property.tenant` no se sincroniza con nada: lo escribe
sólo `PropertyService` desde `PropertyRequest.tenantId`, y su **único** uso lector en todo
`src/main` es llenar `PropertyResponse.tenant`. No participa de ninguna lógica de negocio y
nada impide que difieran. Es decoración heredada; ignórenlo, como están haciendo.

### 5 · `Payment` sin monto

Deliberado para el MVP. `Payment` tiene `invoice`, `status`, `submittedByTenant` y los cuatro
`receipt*`; nada más. El pago parcial no se puede representar y **agregarlo después no es
barato**: obliga a decidir cuándo una cuota pasa a `PAID` con pagos parciales acumulados, que
es lógica nueva en el motor de estados. Si producto cree que va a entrar, conviene decirlo ahora.

### 6 · La fecha de fin

Resuelta como S-3. ✅

### 7 · `UserUpdateRequest` es reemplazo total

Confirmado, los cuatro campos son `@NotBlank`. Es un `PUT` y se comporta como tal. Manden
siempre el objeto completo.

---

## 6 · Orden propuesto

El podio de ustedes era bueno pero quedó desactualizado: **S-4 ya está hecho**, así que se
libera el primer puesto.

1. **Commitear y pushear lo que ya está** (S-2, S-3, S-4). Cero desarrollo; destraba el alta de
   propiedad.
2. **P0-7** — ~0,5 día, destraba la pantalla más grande.
3. **P0-5** — ~1,5 días, el problema más caro contra producción.
4. **P1-10** — ~0,5 día; es un bug que guarda datos corruptos y empeora con el tiempo.
5. **P0-2 y P0-3** — ~2,5 días juntos, es el mismo tipo de trabajo.
6. **P1-1 a P1-9** — ~4 días en bloque; todos son columna + migración + DTO, y hacerlos juntos
   ahorra migraciones sueltas.
7. **Decidir S-1 junto con P0-6**, y después construir P0-6.

**Lo que sacaríamos del prototipo:** P2-1, P2-2, y el «revocar y regenerar» de P0-1.

**Lo que necesitamos de ustedes para avanzar:** la decisión de **S-1** (token durable o corto) y
la de la **pregunta 3** (foto del recibo o comprobante opcional). Las dos bloquean código.

---

## 7 · Cómo van a enterarse de cada cambio

Para que no tengan que volver a leer `.java` para saber qué cambió:

- Cada ítem que se implemente va a quedar registrado en `specs/<slug>/` del repo del backend,
  con sus criterios de aceptación. Los que son un campo más van agrupados, no uno por columna.
- Los cambios de contrato de la API —campos nuevos, filtros nuevos, validaciones que se
  aflojan— los vamos a anunciar explícitamente además de que aparezcan en
  `/v3/api-docs`. Que hayan tenido que leer el código fuente para escribir este pedido es, en
  buena medida, la causa de que esta conversación haya hecho falta.
- Cuando algo cambie una respuesta que ya consumen (por ejemplo `endDate`, que se corre un día
  con S-3), va avisado antes del deploy, no después.

---

## 8 · Respuesta del front · lo que decidimos

Escrito el 17/09/2026 sobre este mismo archivo, para que las decisiones queden pegadas a las
preguntas y no en un tercer documento.

### S-1 · El token pasa a ser durable, pero no antes que P0-6

**Decisión: vale FR-6.** El enlace dura lo que dura el contrato y el vencimiento mensual se
revierte. El spec queda como está; el código se alinea con él.

Con una condición, que sale de lo que ustedes mismos señalaron: **no soltarlo antes de la
primera mitad de P0-6**. Hoy el mail mensual de acceso es el único aviso que recibe el
inquilino. Si el token se vuelve durable sin que exista el aviso de «cuota confirmada, se puede
pagar», el inquilino queda peor que ahora: sin link nuevo y sin ningún ping. Los dos cambios
viajan juntos. Eso sube P0-6 del último lugar al medio y es el único cambio que le hacemos a su
orden.

Asumimos con los ojos abiertos lo que esto implica sumado a S-2 y a la revocación fuera de
alcance: un enlace que no vence, que sigue funcionando con el contrato terminado y que no se
puede dar de baja. Si ese mail se reenvía, quien lo reciba ve el historial de cuotas de ese
contrato indefinidamente. Para el MVP lo aceptamos —es información del propio inquilino y el
daño es acotado— y si más adelante entra la revocación, se revisa.

Gracias por el dato del token determinístico: que sin `exp` el JWT sea idéntico siempre hace que
FR-3/AC-3 («el mismo link») se cumpla solo. No lo habíamos visto.

### Pregunta 3 · Foto del recibo

Vamos por su recomendación. El diálogo «Registrar pago» va a pedir una foto del recibo que firma
el propietario, y el invariante de que todo pago tiene respaldo queda intacto. **No les pedimos
el comprobante opcional**: no vale la pena tocar un invariante que se decidió hace poco a
propósito para ahorrarnos una foto.

### Pregunta 5 · Pagos parciales — fuera del MVP, pero probables

Respuesta de producto: **no entra en el MVP**. Pero no es que no vaya a pasar —pagar una parte y
el resto a los días es común acá—, así que lo damos por probable más adelante.

No les pedimos nada ahora. Sí les pedimos que, si en el camino aparece una decisión que lo
vuelva imposible o mucho más caro de agregar, la marquen antes de cerrarla, en vez de que nos
enteremos cuando ya no se pueda.

### P0-1 · Aceptado: sacamos «revocar y regenerar»

Tienen razón y sale del detalle de inquilino. Nos quedamos con el `GET`, que es el que destraba
«Copiar enlace», y el QR lo generamos nosotros.

### Las otras cuatro preguntas

- **1 · `schema-change`.** Entendido: mandamos la cuota del primer período bajo las condiciones
  nuevas. Y gracias por el hallazgo del `termMonths` corto en contratos renegociados: el detalle
  de contrato está por construirse, así que ahí vamos a mostrar fechas y no «X meses». Nos
  avisan cuando lo reporten aparte.
- **2 · Delta en el front.** De acuerdo, y el argumento cierra: los ajustes sólo se aceptan sin
  confirmar y una cuota sin confirmar no admite pagos, así que no hay nadie más moviendo el
  total. Lo calculamos nosotros y lo mandamos como `FIXED_AMOUNT`.
- **4 · `Property.tenant`.** Confirmado de los dos lados: lo verificamos en nuestro código y no
  lo leemos en ningún lado. Queda como regla escrita para cuando construyamos Propiedades.
- **7 · `UserUpdateRequest`.** Mandamos siempre el objeto completo.

### Un pedido concreto sobre el push de S-3

Su sección 7 ya promete avisar antes del deploy cuando cambie una respuesta que consumimos, y
`endDate` es justamente el caso. Lo anclamos: **avísennos el día que pushean S-3**.

El asistente de alta de contrato calcula y muestra la fecha de fin por su cuenta
(`CreationWizard.tsx:220`) y hoy **replica a propósito la convención vieja** —hay un comentario
que lo explica: mostrábamos `startDate + termMonths` sin restar el día para no prometer una
fecha distinta de la que ustedes iban a guardar—. En cuanto S-3 esté en `origin/mvp`, esa
decisión se da vuelta y nuestro asistente pasa a mostrar un día más que lo guardado. Es una
línea de cambio, pero hay que hacerla el mismo día, ni antes ni después.

Lo mismo, con menos urgencia, para S-4: en cuanto esté pusheado sacamos la lista fija de diez
direcciones y conectamos el autocompletado real.

### Sobre el orden

De acuerdo con el suyo, con el único cambio de P0-6 que explicamos arriba. Y con el punto 1
—commitear y pushear lo que ya está— no hace falta que nos convenzan: es lo único que hoy nos
bloquea dos cosas que ya están escritas de nuestro lado.
