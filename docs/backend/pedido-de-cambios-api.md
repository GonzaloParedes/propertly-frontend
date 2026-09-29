# Pedido de cambios al backend

**Fecha:** 06/09/2026 · **Para:** desarrollo de `propertly-backend`
**Verificado contra:** `http://localhost:8080/v3/api-docs` (instancia de dev, en línea) y
`propertly-backend@mvp` en `936fc3c`. Nada de lo que sigue sale de memoria ni de
conversaciones previas: cada afirmación se chequeó contra el spec o contra el `.java`.

**Revisado el 16/09/2026.** `origin/mvp` sigue en `936fc3c`, del 26/08: el backend no se movió
en tres semanas y no llegó ninguno de los pedidos de abajo. Esa segunda vuelta leyó el código
fuente además del spec, y de ahí salió la sección «Contra su propio spec» — no son pedidos
nuestros, son cuatro lugares donde el código contradice documentos del propio repo.

**Contestado el 17/09/2026.** El backend respondió ítem por ítem, con veredicto y estimación:
está en `docs/backend/respuesta-pedido-de-cambios.md`, con nuestras decisiones al final
(sección 8). Este documento sigue siendo el pedido; el estado de cada cosa se lee allá. Lo más
importante: **S-2, S-3 y S-4 ya están implementados**, pero sin commitear, así que `origin/mvp`
todavía no los tiene y nosotros todavía no los vemos.

## De qué se trata

Estamos bajando el prototipo de Alquia a la app real. El prototipo vive en
`localhost:3000/prototipo` (código: `src/components/dashboard/OwnerWorkspace.tsx` y
`CreationWizard.tsx`) y define seis pantallas: Inicio, Propiedades, Contratos, Cobranzas,
Inquilinos y Configuración, más tres detalles (propiedad, contrato, inquilino).

La regla que seguimos es la que ya está anotada en `docs/design/sistema-ui.md`: **lo que el
backend modela, manda el backend** — el front se adapta aunque su forma nos parezca más
cómoda. Este documento es la otra mitad: **lo que el backend no modela y las pantallas
necesitan**. No inventamos una versión paralela en el front.

Está ordenado por impacto, no por tamaño:

- **P0** — hay pantallas del prototipo que hoy no se pueden construir. Sin esto, o se recorta
  la pantalla o se muestra un dato inventado.
- **P1** — campos del dominio que faltan. Son agregados simples, casi todos una columna.
- **P2** — cambios estructurales. No son un campo más; conviene discutirlos aparte.
- **Preguntas** — casos donde no sabemos si lo que vemos es una decisión o una omisión.
  No pedimos nada todavía: queremos la respuesta antes de escribir el código.

---

## Qué esperamos de esta lectura

No es una lista para implementar de arriba abajo. Es el insumo para que vos decidas, ítem por
ítem, cuál de estas cuatro cosas es:

1. **Ya está y no lo vimos** — decinos dónde y lo usamos.
2. **Está a medias y se reutiliza** — la entidad existe pero no sale por la API, o sale
   incompleta. Varios de los P0 son esto, y lo marcamos cuando lo detectamos: `PreInvoice` y
   `ContractRentIncrement` ya se generan y se guardan, `resolve` ya trae el código postal.
   Suele ser un DTO y un endpoint, no un modelo nuevo.
3. **Hay que agregarlo** — con tu estimación, aunque sea gruesa.
4. **No va en el MVP** — perfecto, sacamos la sección de la pantalla en vez de dejarla muerta.
   Preferimos eso a que quede prometida y sin backend.

Las **preguntas de diseño** del final son distintas: ahí no pedimos código, pedimos una
respuesta. Son siete y cada una define cómo escribimos el front; si las contestás mal o no las
contestás, escribimos código que hay que tirar.

### El orden, ya acordado (17/09/2026)

Acordado con el backend sobre su propuesta. Nuestro único cambio fue subir P0-6, por la
dependencia con S-1 que se explica abajo.

1. **Commitear y pushear S-2, S-3 y S-4**, que ya están escritos. Cero desarrollo, y nos
   destraba el autocompletado de direcciones.
2. **P0-7** (~0,5 día) — destraba la pantalla de Propiedades entera.
3. **P0-5** (~1,5 días) — el problema más caro en producción.
4. **P1-10** (~0,5 día) — guarda teléfonos deformados; cada día que pasa son más filas que
   limpiar.
5. **P0-2 y P0-3** (~2,5 días) — las dos proyecciones juntas, es el mismo tipo de trabajo.
6. **S-1 + la primera mitad de P0-6** (~3 días) — van juntas: si el token se vuelve durable sin
   que exista el aviso de «cuota confirmada», desaparece el único aviso que hoy recibe el
   inquilino.
7. **P1-1 a P1-9** (~4 días en bloque) — todos son columna, migración y DTO; juntos ahorran
   migraciones sueltas.
8. **P2-3** (~2 días) y la segunda mitad de P0-6.

Fuera del MVP, decidido: **P2-1** (copropiedad), **P2-2** (varios inquilinos y garantes), el
«revocar y regenerar» de **P0-1** —nos quedamos sólo con el `GET`— y los pagos parciales
(pregunta 5). Las secciones de la UI que los prometían se retiran en vez de quedar muertas.

---

## Lo que ya está resuelto

Para no volver sobre lo mismo. Contra la lista vieja de `sistema-ui.md`, esto ya llegó y lo
damos por cerrado:

| Pedido anterior | Estado hoy |
|---|---|
| `Tenant.phone` | ✅ `Tenant.phoneNumber`, `@NotBlank @ValidPhoneNumber`, y viaja en `TenantRequest`/`TenantResponse` |
| Día de vencimiento del pago | ✅ `Contract.dueDay`, en `ContractRequest`, `ContractResponse` y `SchemaChangeRequest` |
| `Property.propertyType` | ✅ parcial — existe `PropertyCategory`, pero le faltan valores (ver P1-3) |
| Teléfono del propietario | ✅ `User.phoneNumber` en `UserResponse` y `UserUpdateRequest` |
| Autocompletado de direcciones | ✅ `GET /address-lookup/autocomplete` y `GET /address-lookup/resolve` |

Esos cambios rompieron llamadas del front, y eso fue **tarea nuestra**, no pedido. Estado al
07/09/2026:

- `POST /tenants` sin `phoneNumber` y `POST /auth/register` sin `phoneNumber` daban 400.
  **Ya está arreglado**: los dos formularios piden el teléfono y lo mandan. Verificado contra
  esta misma instancia — el registro pasó de 400 a 200.
- `POST /properties` sin `category` también da 400, pero **no había nada roto**: hoy no lo
  llama nadie. El alta de propiedad todavía no guarda contra el backend. La categoría entra
  cuando la implementemos, ofreciendo sólo las cuatro que existen (ver P1-3).
- **Ya no dependemos de `GET /auth/me`.** El ítem 20 de su propio `CODE_REVIEW.md` propone
  borrarlo por ser el único endpoint que no devuelve JSON y por ser redundante con
  `/users/me`. El 16/09/2026 movimos la verificación de sesión del front a `GET /users/me`:
  pueden eliminarlo cuando quieran, no rompe nada nuestro.

---

## P0 · Bloquean pantallas enteras

### P0-1 · No hay forma de obtener el enlace de acceso del inquilino

**Dónde:** detalle de contrato, tarjeta «Inquilino y acceso de pago» (botón **Copiar
enlace**); detalle de inquilino, tarjeta «Acceso de pago» (botón **Administrar**, con el texto
«Se puede revocar y regenerar cuando quiera»).

**Hoy:** el enlace se genera dentro de `ContractService` y sale únicamente por mail
(`EmailService.sendTenantAccessEmail(email, firstName, accessUrl)`, con el QR adjunto). La API
expone `POST /contracts/{id}/tenant-access/resend`, que **reenvía** el mail; no hay ningún
endpoint que **devuelva** el enlace, ni que lo revoque, ni que lo regenere.

**Por qué importa:** el propietario que quiere pasarle el enlace al inquilino por WhatsApp no
tiene cómo. Reenviar el mail no es lo mismo: no puede ver lo que se mandó, ni confirmarlo, ni
compartirlo por otro canal. Y la promesa «se puede revocar y regenerar» no tiene endpoint
detrás.

**Lo que pedimos:**

```
GET    /contracts/{id}/tenant-access      -> { url, expiresAt?, revoked: boolean }
POST   /contracts/{id}/tenant-access      -> regenera (invalida el token anterior) -> { url, ... }
DELETE /contracts/{id}/tenant-access      -> revoca sin emitir uno nuevo, 204
```

Si devolver la URL completa incomoda, alcanza con el token y armamos la URL nosotros. El QR lo
podemos generar en el front si nos dan el enlace; no hace falta que lo sirvan.

---

### P0-2 · Las proyecciones (`PreInvoice`) no salen por la API

**Dónde:** Inicio, tarjeta **PROYECTADO · SEPTIEMBRE** («$ 1.451.986 · más 1 contrato a definir
según ICL»). También el estado «Proyectada», que es uno de los cuatro estados del dinero que ya
tenemos definidos en el sistema de diseño.

**Hoy:** `PreInvoice` existe como entidad (`pre_invoices`, con `contract`, `period`, `amount`) y
la genera `PreInvoiceService`, pero **ningún DTO de respuesta la incluye y ningún controller la
expone**. Grepeado: `PreInvoice` sólo aparece en `ContractController` para dispararle la
generación, nunca para devolverla.

**Por qué importa:** el prototipo distingue cuatro estados del dinero —Proyectada, A vencer,
Vencida, Pagada— y la API sólo puede alimentar tres. La tarjeta de proyección de Inicio no
tiene de dónde sacar el número. Calcularlo en el front está explícitamente prohibido por
nuestro propio sistema de diseño (y sería peor: duplicaríamos la lógica de índices).

**Lo que pedimos:** un `GET /pre-invoices?contractId=&from=&to=` (o embeberlas en
`ContractResponse` acotadas a los próximos N períodos), devolviendo `{ contractId, period,
amount }`. Necesitamos poder distinguir el caso «período todavía incierto por índice»: para un
contrato ICL/IPC sin valor publicado, o no viene la `PreInvoice` o viene con `amount: null`
—cualquiera de las dos nos sirve, pero tiene que ser distinguible de un monto real, porque en
pantalla eso se muestra como «a definir según ICL» y no como un número.

---

### P0-3 · El historial y la próxima actualización de alquiler no salen por la API

**Dónde:** detalle de contrato, línea de tiempo: «Próxima actualización · 01/09/2026 · sube 8 %
cada 3 meses».

**Hoy:** `ContractRentIncrement` (`contract_rent_increments`) es el historial append-only de
aumentos, con `periodNumber`, `appliedAt`, `sourceValue`, `resultingRent` y la ventana del
índice. `ContractService` lo usa internamente para resolver `getCurrentRent`, pero no hay DTO
ni endpoint que lo devuelva. `ContractResponse` da `currentRent` (bien, eso lo usamos) y los
parámetros de la fórmula, pero no **cuándo** se aplica la próxima ni **qué pasó** con las
anteriores.

**Por qué importa:** la fecha de la próxima actualización se puede calcular desde `startDate` +
`incrementFrequencyMonths`, pero sólo si nadie hizo un `schema-change` en el medio, y el
backend ya soporta esos cambios. Recalcularlo en el front nos garantiza mostrar una fecha
distinta de la que el backend va a usar.

**Lo que pedimos, en orden de preferencia:**

1. Un campo `nextIncrementDate` (y, si se puede, `nextIncrementRent` cuando es calculable) en
   `ContractResponse`. Con esto solo se destraba la línea de tiempo.
2. Además, `GET /contracts/{id}/rent-increments` con el historial. Lo queremos para la vista de
   contrato, pero no bloquea el prototipo.

---

### P0-4 · Ningún recurso tiene marca de tiempo

**Dónde:** varias pantallas escriben una fecha literal que hoy no existe en la API.

| Pantalla | Texto | Dato que falta |
|---|---|---|
| Inicio, aviso de pago a confirmar | «Subió el comprobante el 18/08/2026» | `Payment.submittedAt` |
| Diálogo «Revisar pago» | «Imagen · 1,8 MB · subido el 18/08/2026» | ídem |
| Detalle de contrato, documento firmado | «PDF · 2,4 MB · cargado el 01/03/2025» | `Contract.documentUploadedAt` |

**Hoy:** `Payment` tiene `status`, `submittedByTenant` y los cuatro campos `receipt*`; ninguna
fecha. `Contract` tiene los cuatro campos `document*`; ninguna fecha. Tampoco hay
`createdAt`/`updatedAt` en ninguna entidad.

**Por qué importa:** «hace 9 días» y «subió el comprobante el 18/08» es la información que hace
accionable un aviso. Sin fecha, el aviso dice sólo que algo pasó, no cuándo, y el propietario
no puede priorizar. El tamaño del archivo ya nos lo dan (`receiptSizeBytes`,
`documentSizeBytes`), así que falta la mitad de esa línea de texto.

**Lo que pedimos:** `submittedAt` en `PaymentResponse` (y, si es barato, `resolvedAt` para
cuando se confirma o rechaza), y `documentUploadedAt` en `ContractResponse`. Instantes UTC en
ISO-8601 está perfecto.

---

### P0-5 · `GET /invoices` no se puede acotar

**Dónde:** todas las pantallas de dinero. Hoy Inquilinos ya lo sufre: `OwnerWorkspace` llama a
`AlquiaBackendClient.invoices.list()` sin parámetros para armar el chip de estado de cada
inquilino.

**Hoy:** el filtro es `contractId` **o** `tenantId` **o** nada (los dos juntos dan 400). Sin
parámetros devuelve **todas las cuotas del propietario desde siempre**, cada una con sus
ajustes y su historial de pagos embebidos. Un contrato de 36 meses son 36 cuotas; una cartera
de 20 contratos con dos años de historia son ~500 objetos anidados para pintar cinco chips.

**Por qué importa:** no es sólo performance. La pantalla de Cobranzas es «las cuotas de agosto»
y sus filtros son Todas / Vencidas / A vencer / Pagadas con el conteo de cada uno. Sin filtro
por período no hay forma de pedir «este mes» sin traerse todo y descartar en el cliente.

**Lo que pedimos** en `GET /invoices`:

- `period=2026-08` (o `from`/`to`) — filtro por período.
- `status=DUE` (repetible o separado por comas) — filtro por estado.
- Poder combinar `contractId`/`tenantId` con los anteriores, en vez del 400 actual.

Si además pudieran devolver los conteos por estado del conjunto filtrado, nos ahorramos una
segunda llamada para pintar los chips. No es bloqueante.

---

### P0-6 · La pantalla de Configuración no tiene backend

**Dónde:** Configuración, tarjeta «Recordatorios de pago»: «Antes del vencimiento: 7 días · El
día del vencimiento: Activo · Después del vencimiento: 3 días», con su botón **Editar
recordatorios**. Y el dato «Moneda operativa» en la tarjeta Cuenta.

**Hoy:** no existe. `EmailService` sabe mandar tres mails —registro, reset de contraseña y
acceso del inquilino— y ninguno es un recordatorio de vencimiento. El único `@Scheduled` de la
app es `ContractLifecycleJob`, que genera y vence cuotas; no notifica a nadie.

**Por qué importa:** la pantalla promete que «los inquilinos reciben recordatorios por correo
cuando una cuota está por vencer o se encuentra vencida». Hoy eso es falso. O se construye, o
sacamos la pantalla del prototipo — y preferimos construirla, porque es una de las razones por
las que un propietario usaría el producto en vez de una planilla.

**Confirmado el 16/09/2026, y es más grande de lo que parecía:** no es que falten los
recordatorios configurables — es que **el inquilino no recibe ningún aviso de ninguna cuota**.
Ni cuando se emite, ni cuando vence. Se entera sólo si entra al portal por su cuenta. El único
mail que le llega cerca de la emisión es el de acceso, que se reemite cuando se generan las
cuotas del mes y no menciona la cuota; funciona como aviso por accidente, no por diseño.

**Lo que pedimos:**

1. Los recordatorios en sí: un job que mande mail al inquilino N días antes del vencimiento, el
   día del vencimiento y N días después. Y, antes que eso, el aviso de que la cuota del mes
   quedó confirmada y se puede pagar.
2. Un lugar donde guardar esa preferencia por propietario, y `GET`/`PUT` para leerla y
   escribirla. Algo del orden de `{ daysBefore: 7, onDueDate: true, daysAfter: 3, enabled: true }`.

Si el punto 2 es mucho para ahora, arrancamos con valores fijos del sistema y la pantalla los
muestra como informativos, sin botón de editar. Decidan ustedes y nos adaptamos.

---

### P0-7 · La lista de propiedades no puede decir en qué estado está cada una

**Dónde:** Propiedades. Cada fila muestra un chip de estado —Al día / A vencer / Vencida / Pago
a confirmar / Sin alquilar— y los filtros «Con contrato» y «Sin alquilar» cuentan sobre eso.

**Hoy:** `PropertyResponse` trae `tenant` pero **no** trae el contrato. Para saber si una
propiedad está alquilada hay que traerse `GET /contracts` entero y cruzar por `property.id`; y
para el chip de estado, además, todas las cuotas de ese contrato. Son tres listas completas
para pintar una lista de propiedades.

**Lo que pedimos:** `activeContractId` (o un `activeContract` reducido con `id`, `currentRent` y
`status`) en `PropertyResponse`. Con eso la pantalla se arma con dos llamadas en vez de tres, y
la fila sabe si tiene contrato sin adivinarlo desde `tenant`.

---

## Contra su propio spec

Los cuatro que siguen no son pedidos nuestros: son lugares donde el código contradice un
documento del repo de ustedes. Van aparte porque casi no hace falta decidir nada de producto
para resolverlos — sólo decidir cuál de los dos vale, el código o el papel.

**Estado al 17/09/2026:** tres de los cuatro ya están implementados en el working tree del
backend, sin commitear. S-1 era la única que necesitaba una decisión de producto y ya está
tomada. El detalle de cada uno, en `respuesta-pedido-de-cambios.md`.

### S-1 · El enlace del inquilino vence a fin de mes

> **Decidido el 17/09/2026: vale FR-6, el token pasa a ser durable.** Se implementa junto con la
> primera mitad de P0-6 y no antes — hoy el mail mensual de acceso es el único aviso que recibe
> el inquilino, y volver el token durable sin poner el aviso de cuota lo dejaría peor que ahora.

**El código:** `JwtService.generateTenantAccessToken` firma el token con
`.expiration(endOfCurrentMonth())`. Lo agregó el commit `8b36a3a` («More restrictive JWT for
Tenant», 25/08/2026); no hay spec en `specs/` que acompañe ese cambio.

**El spec:** `specs/tenant-portal/spec.md`, FR-6 — la credencial *«MUST remain valid for
repeated use for the life of the Contract, without expiring after a fixed time or after a
single use»*. AC-4 pide explícitamente que abrir el mismo link el mes siguiente vuelva a
autenticar. Y §6 «Out of Scope» lista la expiración de la credencial como fuera de alcance,
*«durable by design (FR-6)»*.

**El agujero, además de la contradicción:** el mecanismo que repone el token es
`InvoiceService.generateDueInvoicesForContract`, que llama a `issueTenantAccess` **sólo si ese
mes generó cuotas** (`if (generated)`). Un contrato por índice cuya cuota no se puede generar
porque el valor todavía no se publicó no dispara la reposición, y el inquilino queda sin
acceso hasta que el índice llegue. Es justo el caso que `PreInvoiceService.generateReactive`
está diseñado para manejar.

**Lo que pedimos:** que el token valga mientras el contrato esté vigente, como dice FR-6. Si
prefieren mantener un vencimiento corto por seguridad, necesitamos entonces el `expiresAt` de
P0-1 y una reposición que no dependa de que se haya generado una cuota.

---

### S-2 · El portal se cierra el día que termina el contrato

> **Hecho, sin pushear.** Resuelto para los cuatro estados, no sólo ACTIVE/TERMINATED/EXPIRED:
> también SUPERSEDED, que no habíamos pedido y que importaba igual — sin eso una renegociación
> le borraba al inquilino todo el historial anterior al corte.

**El código:** `ContractService.getForTenantAccess` filtra `status == ACTIVE` (agregado por el
mismo commit `8b36a3a`). No afecta sólo al alta de sesión: `TenantAuthFilter` lo llama en cada
request a `/tenant/*`, así que una sesión ya abierta también deja de funcionar.

**El spec:** US-8 del mismo documento — *«As a tenant, I want my portal access to keep working
after my contract ends, so I can still look back at my payment history, even though I can no
longer submit new receipts»*. FR-16 y AC-14 lo repiten.

**Por qué el filtro sobra:** la protección de escritura ya vive en otro lado.
`PaymentService.submitByTenant` rechaza por su cuenta cualquier comprobante sobre un contrato
que no esté ACTIVE, que es exactamente FR-17. Sacar el filtro del camino de lectura deja al
inquilino mirando sin poder tocar, que es lo que el spec pide.

**Lo que pedimos:** sacar ese `.filter(...)` de `getForTenantAccess`. Del lado del producto ya
lo decidimos: el inquilino conserva acceso de lectura a su historial. Si prefieren acotarlo a
unos meses después del fin, nos sirve igual; lo que no queremos es que se corte el mismo día.

---

### S-3 · La fecha de fin del contrato cae un día tarde

> **Hecho, sin pushear, con migración V2** que corrige las filas existentes. No cambia ninguna
> cuota ni ningún importe. Incluye un arreglo que no podíamos ver desde afuera: el plazo del
> contrato sucesor se calculaba con el `endDate` del predecesor como cota exclusiva, así que el
> `minusDays(1)` solo le comía un mes a cada renegociación.
>
> **Ojo de nuestro lado:** el día que esto se pushee hay que cambiar `fechaDeFin` en
> `CreationWizard.tsx`, que hoy replica a propósito la convención vieja.

Esto estaba como pregunta 6 en la versión anterior. Al leer el código dejó de ser una duda.

**El código:** `ContractService.applyTerms` hace `contract.setEndDate(req.startDate()
.plusMonths(req.termMonths()))`, sin restar un día. Un contrato que arranca el 01/09/2026 a 36
meses queda con fin el **01/09/2029**; en papel ese contrato termina el 31/08/2029.

**Lo que lo vuelve un reporte y no una pregunta:** el mismo archivo usa la convención correcta
en otros dos lugares. `applySchemaChange` cierra el contrato predecesor con
`predecessor.setActualEndDate(splitStartDate.minusDays(1))` — el anterior termina el día antes
de que empiece el nuevo—, y el cálculo de períodos hace `YearMonth.from(effectiveDate
.minusDays(1))`. O sea que el criterio ya está adoptado y falta justo donde se define la fecha
de fin del contrato.

**Se propaga:** el contrato sucesor hereda el `endDate` del predecesor
(`successor.setEndDate(predecessor.getEndDate())`), así que el día de más viaja por toda la
cadena de renegociaciones.

**Lo que pedimos:** `minusDays(1)` al calcular `endDate`. Somos conscientes de que toca datos
ya generados; si eso complica, díganlo y vemos, pero el front hoy muestra la fecha de ustedes
para no prometer una distinta de la que queda guardada.

---

### S-4 · El autocompletado de direcciones devuelve referencias que su propio `resolve` rechaza

> **Hecho y verificado el 28/09/2026** contra la rama corriendo local. Falta el deploy.

> **Hecho, sin pushear.** La normalización de la fuente se hace a la entrada, así que las
> referencias ya cacheadas siguen resolviendo. Además sumaron `layers=address` al
> autocompletado, que resuelve la otra mitad: ya no vuelven localidades sin calle ni número. En
> cuanto esté pusheado sacamos la lista fija de diez direcciones.

**Qué pasa:** `GET /address-lookup/autocomplete` devuelve sugerencias cuyo `reference` es el
`gid` de Pelias con el nombre largo de la fuente —`openstreetmap:address:node/10958295153`—,
y `GET /address-lookup/resolve` con ese mismo valor responde **404 Address not found**.

**Por qué:** `PeliasAddressLookupProvider.resolve` se lo pasa tal cual a `/v1/place`, y Pelias
sólo acepta las fuentes abreviadas. El error que devuelve, pidiéndoselo directo al contenedor,
es: *«openstreetmap is invalid. It must be one of these values - [osm, oa, gn, wof,
whosonfirst]»*.

**Verificado el 17/09/2026** contra la instancia de dev, logueado como `dev1@alquia.local`:
buscando «Avenida Santa Fe 1000» vuelven cinco sugerencias, todas `openstreetmap:address:...`,
y las cinco dan 404 al resolverlas. Las únicas que resuelven son las `whosonfirst:locality:…`
—porque «whosonfirst» sí está en la lista—, pero esas son localidades: devuelven `street: null`
y `number: null`, y `PropertyRequest` exige los dos `@NotBlank`. O sea que **hoy el
autocompletado no puede producir ninguna dirección cargable**.

**Lo que pedimos:** mapear el nombre de la fuente a su abreviatura antes de llamar a `/v1/place`
(`openstreetmap`→`osm`, `openaddresses`→`oa`, `geonames`→`gn`, `whosonfirst`→`wof`), o guardar
el gid abreviado en la sugerencia. Mientras tanto el alta de propiedad del front elige de una
lista fija de direcciones: guarda contra el backend, pero sólo las diez que tiene escritas.

---

## P1 · Campos del dominio que faltan

Todos estos son campos que el formulario de alta ya pide y que hoy no tienen dónde guardarse.
`ContractForm` y `PropertyForm` no se pueden guardar completos hasta que existan.

### P1-1 · Código postal

`Address` tiene `street`, `number`, `floorUnit`, `city`, `province`. No tiene `postalCode`.

Lo llamativo: `ResolvedAddressResponse` —lo que devuelve **su propio** `/address-lookup/resolve`—
sí trae `postalCode`, más `latitude` y `longitude`. O sea que el backend ya resuelve el código
postal y después lo tira. Pedimos `postalCode` en `Address` (y en `PropertyRequest`/
`PropertyResponse`). Si guardan también lat/long, mejor: nos habilita el mapa más adelante.

### P1-2 · Moneda del contrato

Hoy todos los importes son `BigDecimal` sin moneda. `ContractForm` ofrece ARS y USD, y en el
mercado argentino el alquiler en dólares es común (sobre todo en comercial). Pedimos
`currency` (`ARS` | `USD`) en `Contract`, y que viaje en `ContractRequest`/`ContractResponse`;
las cuotas heredan la del contrato.

### P1-3 · Faltan categorías de propiedad

`PropertyCategory` tiene cuatro valores: `PH`, `HOUSE`, `APARTMENT`, `COMMERCIAL_PREMISES`.
Nuestra lista de tipos (`PROPERTY_TYPES` en `src/lib/mock-data.ts`, salida del relevamiento de
producto) tiene ocho: Departamento, Casa, PH, Local comercial, **Oficina**, **Cochera**,
**Terreno / Lote**, **Otro**.

Pedimos agregar `OFFICE`, `GARAGE`, `LAND` y `OTHER`. Cochera y oficina no son casos raros: son
dos de los alquileres más frecuentes después de la vivienda, y hoy hay que cargarlos como
«local comercial», que es mentira.

### P1-4 · Depósito / garantía

Ni monto ni tipo. `ContractForm` pide los dos, y el tipo es una lista cerrada
(`DEPOSIT_TYPES`): depósito en efectivo, seguro de caución, garantía propietaria, aval
bancario, otro. Pedimos `depositAmount` (`BigDecimal`) y `depositType` (enum) en `Contract`.

### P1-5 · Comisión

Porcentaje y quién la paga (propietario / inquilino / compartida). Es el dato que le importa a
la cuenta de inmobiliaria —`User.realEstateAgency`, que ya existe—, así que no es opcional para
ese segmento. Pedimos `commissionPercent` (`BigDecimal`) y `commissionPayer` (enum
`LANDLORD` | `TENANT` | `SPLIT`).

### P1-6 · Punitorios por mora

Tipo (porcentaje o monto fijo), valor y días de gracia. Es la única parte del contrato que se
traduce en plata cobrable y que hoy no se puede cargar: una cuota vencida hoy queda vencida sin
recargo, y el propietario tiene que calcularlo aparte. Pedimos `lateFeeType`
(`PERCENTAGE` | `FIXED_AMOUNT`), `lateFeeValue` y `lateFeeGraceDays` en `Contract`.

Nota: si se implementa el cálculo automático del punitorio, encaja natural como un
`InvoiceAdjustment` de tipo `SURCHARGE` sobre la cuota vencida — el mecanismo ya existe. Pero
eso es una decisión suya; nosotros sólo necesitamos poder guardar y mostrar las condiciones.

### P1-7 · Renovación y rescisión

Tres campos sueltos de las condiciones del contrato: `autoRenewal` (booleano), 
`terminationNoticeMonths` (meses de preaviso) y `earlyTerminationPenalty` (monto de la multa
por rescisión anticipada, nulo si no hay). Son informativos: no queremos que el backend actúe
sobre ellos, sólo que los guarde y los devuelva para mostrarlos en el detalle de contrato.

### P1-8 · `dueDay` está limitado a 1–10

> **Resuelto el 28/09/2026** en `codex/frontend-integration-lots` (`263576d`): el rango es 1–28
> en `ContractRequest` y en `SchemaChangeRequest`. Efectivamente era el número y no el
> criterio: 28 cumple la intención escrita en el spec —que valga en todos los meses sin
> clampear— igual que 10. Del lado nuestro el paso del asistente pasó de tres chips a un
> contador 1–28 con los tres días habituales como atajo.

`ContractRequest.dueDay` valida `@Min(1) @Max(10)`. Nuestro formulario dice «día del mes, entre
1 y 31» y el prototipo asume el día 1.

¿Es una decisión de negocio deliberada? Si lo es, la respetamos y lo aclaramos en la UI. Si no,
pedimos ampliarlo a 1–28 (más allá de 28 se rompe en febrero, así que 28 es el techo sano).
Preferimos preguntar antes de escribir un validador en el front que contradiga al de ustedes.

### P1-9 · Motivo de rechazo del pago

`POST /payments/{id}/reject` no lleva body. El diálogo del prototipo dice: «Si el comprobante
no corresponde, puede rechazarlo; el inquilino podrá cargar uno nuevo». El inquilino recibe un
rechazo sin saber por qué, y va a volver a subir lo mismo. Pedimos un `{ reason?: string }`
opcional en el body, guardado en el `Payment` y devuelto en `PaymentResponse`.

### P1-10 · `PhoneNumberNormalizer` guarda mal los números con el 0 de la característica

> **Cerrado el 29/09/2026, y bien resuelto — no fue un parche del patrón.** Reescribieron
> `PhoneNumberNormalizer` entero: en vez de un regex que dejaba pasar el 0 y el 15, ahora prueba
> combinaciones (código de país, marcador `9`, `0` de característica, `15` del celular) hasta
> encontrar un número nacional de exactamente 10 dígitos. Verificado en vivo:
> `0221155667788` → `+5492215667788` (0 y 15 afuera, como corresponde). Y de paso se resolvió
> lo del separador único: `11 4477-8899` (espacio y guión juntos) también guarda bien ahora.
>
> Sacamos el parche del cliente (`src/lib/telefono.ts` rechazaba cualquier 0 inicial) y lo
> reemplazamos por un puerto del mismo algoritmo, para no volver a tener dos validaciones que
> puedan divergir. `soloDigitosTelefono` sigue mandando sólo dígitos —no porque el backend lo
> exija ya, sino porque es más simple y el normalizador lo resuelve igual.

Este no es un campo que falte: es un dato que se guarda corrupto, y lo encontramos al conectar
el teléfono.

**Qué pasa:** `01144552210` **pasa** `@ValidPhoneNumber` —el patrón acepta el 0 dentro del
`\d{2,4}` de la característica— y `PhoneNumberNormalizer` lo guarda como `+54901144552210`.
Son 14 dígitos: no es el teléfono de nadie. Nadie se entera hasta que un mail o un WhatsApp no
llega.

**Verificado el 07/09/2026** contra esta instancia: registro con `"phoneNumber": "01144552210"`
→ `200`, y `GET /users/me` devuelve `"phoneNumber": "+54901144552210"`.

**Mientras tanto lo tapamos nosotros:** `src/lib/telefono.ts` rechaza el 0 inicial antes de
enviar, con un mensaje que dice qué sacar. Pero es un parche del lado del cliente: cualquier
otro consumidor de la API —el portal del inquilino, una app futura, un curl— sigue pudiendo
guardar el número mal.

**Lo que pedimos:** que el normalizador saque el `0` inicial de la característica y el `15` del
celular antes de componer el `+549`, o que el patrón los rechace explícitamente. Cualquiera de
las dos: lo que no puede pasar es que entre y quede guardado deformado.

De paso, un detalle del mismo patrón que nos obligó a mandar siempre en dígitos: admite **un
solo separador**, entre característica y número. `11 4455-2210` —la forma en que se escribe un
teléfono en Argentina— lo rechaza aunque el número esté bien. No es urgente porque lo
resolvemos mandando dígitos, pero si algún día alguien pega a la API a mano, se va a tropezar.

---

## P2 · Cambios estructurales

Estos no son una columna más. Los ponemos separados porque cambian el modelo y probablemente
haya que discutirlos antes de estimarlos.

### P2-1 · Copropiedad: propietarios con porcentaje de tenencia

**Lo que dice el backend hoy:** no hay entidad propietario. Textual del `CLAUDE.md` de
`controller/`: *«There is no separate "owner" resource — a user who owns tenants/properties is
just a `User`»*. `Property.user` es el dueño de la cuenta, y es uno solo.

**Lo que necesita el producto:** un inmueble con dos o más titulares, cada uno con su
porcentaje. Está construido en el front (`src/components/forms/OwnersField.tsx`, con validación
de que los porcentajes sumen 100) y hoy no tiene dónde persistirse. El caso real que lo motivó:
un inmueble heredado entre hermanos, donde la liquidación se reparte 60/40.

**Lo que proponemos:** una entidad `PropertyOwner` (`propertyId`, nombre, contacto,
`ownershipPercent`) colgando de `Property`, distinta de `User`. No es un usuario del sistema
—no tiene login— es un dato del inmueble, igual que `Tenant` es un dato sin cuenta. Si esto
queda fuera del MVP, díganlo y sacamos la sección del formulario en vez de dejarla muerta.

### P2-2 · Varios inquilinos por contrato, y garantes

**Hoy:** `Contract.tenant` es `@ManyToOne ... optional = false`. Uno solo. Y `Tenant` no tiene
ningún flag ni relación que distinga a un garante.

**Lo que necesita el producto:** una pareja que alquila junta firma los dos, y prácticamente
todo contrato de alquiler en Argentina tiene garante. El front ya lo modela
(`src/components/forms/TenantsField.tsx`, con el badge «Garante»).

**Lo que proponemos:** pasar `Contract.tenant` a una relación N a N con un rol
(`TENANT` | `GUARANTOR`), manteniendo un titular principal —el que recibe el enlace de acceso y
los avisos— para no romper el portal del inquilino, que hoy resuelve el contrato desde el
token. Somos conscientes de que es el cambio más caro de la lista.

### P2-3 · Archivar vs. borrar

**Hoy:** `DELETE /properties/{id}` y `DELETE /tenants/{id}` hacen `repository.delete(...)`:
borrado físico.

**Lo que hace la UI:** el detalle de propiedad ofrece **Archivar**, no «Eliminar». La intención
es sacarla de las listas conservando su historia — contratos vencidos, cuotas cobradas, plata
que entró.

**Lo que verificamos antes de pedir nada:** no hay `cascade` ni `orphanRemoval` en ninguna
entidad, y `Contract.property`/`Contract.tenant` son `nullable = false`. Así que borrar una
propiedad con contratos **no** se lleva el historial puesto: falla por integridad referencial y
`ApiExceptionHandler` la convierte en un `409 {"message": "Request violates a data constraint"}`.
No hay riesgo de pérdida de datos, y eso está bien resuelto.

**Lo que sí falta:** con ese 409 el front no puede decirle nada útil al propietario. El mensaje
es genérico para todas las violaciones de constraint —sirve igual para un CUIT duplicado que
para esto—, así que no podemos distinguir «tiene contratos» de cualquier otra cosa. Y sobre
todo: el botón de la pantalla dice **Archivar**, no «Eliminar», y esa acción no existe.

**Lo que pedimos:** borrado lógico (`archivedAt`, excluido de los listados por defecto) para
propiedad e inquilino, que es lo que la UI promete. Y, aparte de eso, que el 409 traiga un
código o un mensaje discriminable para poder responder «no se puede eliminar: tiene 2 contratos
asociados» en vez de «violación de restricción».

---

## Preguntas de diseño

No pedimos cambios acá. Necesitamos entender la intención antes de escribir el front, porque
las dos lecturas posibles llevan a código distinto.

**Las siete están contestadas** desde el 17/09/2026, en la sección 5 de
`respuesta-pedido-de-cambios.md`. Se dejan acá como estaban, porque la respuesta se lee contra
la pregunta. Lo que quedó decidido: el `schema-change` se dispara con la cuota del primer
período bajo las condiciones nuevas; el delta lo calcula el front; el pago en efectivo se
registra con una foto del recibo que firma el propietario; `Property.tenant` es decoración
heredada y se ignora; los pagos parciales no entran en el MVP; y `PUT /users/me` se manda
siempre completo.

**1 · `schema-change` cuelga de la cuota, no del contrato.**

> **Cerrado el 28/09/2026, y con una consecuencia para el front.** La intención original era
> cortar en una cuota existente, no programar a futuro. En los hechos permite partir desde
> cualquier cuota impaga anterior y rehacer desde ahí, así que tampoco es «siempre desde el
> mes corriente»: es un corte retroactivo.
>
> De paso se corrigió un bug que encontramos probándolo (`bf385ee`): cortar sobre una cuota
> ya paga generaba **dos cuotas del mismo período** —una paga en el predecesor y otra
> pendiente en el sucesor—. Ahora devuelve 400 y no crea nada.
>
> **Para «cambiar condiciones a futuro» hace falta un endpoint nuevo.** El backend va a
> construirlo ligado al contrato, con un `effectiveFrom`. No alcanza con sumarle el campo al
> actual: hoy crear el sucesor supersede al predecesor en el acto, y para programar octubre
> desde septiembre hay que mantener vigente el contrato actual hasta octubre y activar el
> sucesor en el job de ese período — si no, septiembre queda sin contrato con el que cobrar.
>
> `POST /invoices/{id}/schema-change` queda como operación heredada e inmediata. **El front
> no construye la pantalla nueva sobre ese endpoint**, por recomendación de ellos y porque su
> `{id}` es el de una cuota que la propia llamada puede borrar. La pregunta original —qué cuota
> mandarle a ese endpoint para «el próximo período»— quedó sin objeto: el endpoint nuevo cuelga
> del contrato, no de una cuota.
>
> **Forma del endpoint nuevo (anunciada, todavía no disponible).**
> `POST /contracts/{contractId}/schema-change`. Recibe las condiciones nuevas y un
> `effectiveFrom` que es el primer día del mes:
>
> ```json
> {
>   "effectiveFrom": "2026-10-01",
>   "rentBaseline": 700000,
>   "dueDay": 5,
>   "incrementMethod": "FIXED_PERCENTAGE",
>   "incrementFrequencyMonths": 6,
>   "incrementValue": 10
> }
> ```
>
> El cambio queda **programado**: el contrato actual y sus cuotas impagas siguen vigentes
> hasta septiembre; en octubre se activa el contrato nuevo y se factura octubre con los
> términos nuevos. La pantalla conserva el texto «Cambiar condiciones desde el próximo
> período». **Disponible desde el commit `c791aeb`
> (28/09/2026) y ya conectado en el front.** Devuelve el `ContractResponse` del sucesor con
> `status: SCHEDULED`; el vigente lo apunta con `successorContractId`. 400 si la fecha no es
> primer día de mes, no es de un mes futuro o pasa del fin del contrato; si ya hay un
> sucesor programado; o si hay una cuota paga desde `effectiveFrom`.

**2 · «Modificar solo la próxima cuota» pide un importe final, no un ajuste.** El diálogo pide
«Importe final de la próxima cuota: $ 520.000» más un motivo. La API tiene
`POST /invoices/{id}/adjustments`, que toma un delta (`kind` + `valueType` + `value`). Podemos
calcular el delta en el front —`importeDeseado − total`— y mandarlo como `FIXED_AMOUNT`, pero
eso pone la aritmética del lado equivocado: si el total cambia entre que se abre el diálogo y se
guarda, el resultado no es el que el usuario vio en pantalla. ¿Prefieren que lo calculemos
nosotros, o agregan una forma de fijar el total?

**3 · Un pago exige comprobante, también del lado del propietario.** `POST /payments` requiere
el `file` (y `Payment.receipt*` es `nullable = false`). Lo entendemos y no lo discutimos. Pero
la pantalla de Cobranzas tiene «Registrar pago» para una cuota vencida, y el caso típico es un
alquiler cobrado en efectivo, sin comprobante que subir. ¿Qué esperan que haga el propietario
ahí? Las opciones que vemos: que suba una foto del recibo que él mismo firma (defendible), o
que el comprobante sea opcional cuando `submittedByTenant = false`. Nos adaptamos a lo que
decidan, pero la pantalla necesita una respuesta.

**4 · `Property.tenant` y `Contract.tenant` conviven.** Una propiedad apunta a un inquilino
directamente, y además el contrato apunta a un inquilino. ¿Se mantienen sincronizados? ¿Cuál
manda si difieren? Hoy el front usa el del contrato y el de la propiedad lo ignora; queremos
confirmar que eso es correcto y no estamos leyendo el campo equivocado.

**5 · `Payment` no tiene monto.** Un pago es «este comprobante corresponde a esta cuota», sin
importe propio, así que un pago parcial no se puede representar. ¿Es deliberado para el MVP?
Lo preguntamos porque «pagó $ 300.000 de los $ 520.000» aparece seguido, y si en algún momento
entra al alcance, es más barato saberlo antes.

**6 · La fecha de fin.** Era una pregunta; dejó de serlo al leer el código. Pasó a **S-3**,
en «Contra su propio spec».

**7 · `UserUpdateRequest` es un reemplazo total.** Sus cuatro campos son `@NotBlank`, así que un
`PUT /users/me` para cambiar sólo el teléfono tiene que reenviar nombre, apellido y CUIT. Está
bien si es la intención (es un `PUT`, después de todo); lo confirmamos para mandar siempre el
objeto completo y no descubrirlo con un 400.

---

## Anexo · Qué pantalla depende de qué

Para dimensionar: si un ítem no llega, esto es lo que queda a medias.

| Pantalla | Estado | Endpoints | Qué falta |
|---|---|---|---|
| Inicio | Sin conectar | `/invoices`, `/contracts`, `/properties` | P0-2 la proyección · P0-4 las fechas de los avisos · P0-5 acotar cuotas |
| Propiedades | Sin conectar | `/properties`, `/contracts`, `/invoices` | P0-7 el contrato en la fila, sin el cual el chip de estado pide traerse tres listas enteras |
| Contratos | ✅ 07/09/2026 | `/contracts` | Anda completa. La fila no lleva al detalle porque el detalle sigue con datos de ejemplo |
| Detalle de propiedad | Sin conectar | `/properties/{id}`, `PUT /properties/{id}` | P0-7 el contrato vinculado · P2-3 el botón dice **Archivar** y esa acción no existe, hoy `DELETE` borra de verdad · P1-1 código postal |
| Detalle de contrato | Sin conectar | `/contracts/{id}`, `/document`, `/terminate` | P0-1 el enlace · P0-3 próxima actualización · P0-4 fecha del documento · P1-4 a P1-7 condiciones · **preguntas 1 y 2**, que bloquean el diálogo «Cambiar condiciones» — sin saber qué cuota mandarle al `schema-change`, el contrato se parte en la fecha equivocada |
| Cobranzas | ✅ 07/09/2026 | `/invoices`, `/payments` | Anda completa. Sin P0-5 no hay selector de período —se trae la historia entera y se ordena por vencimiento—; P0-4 deja el comprobante sin fecha; pregunta 3 sigue abierta |
| Inquilinos | ✅ | `/tenants`, `/contracts`, `/invoices` | Anda. Sin P0-5 se trae todas las cuotas de la cartera para pintar un chip por inquilino: no escala |
| Detalle de inquilino | ✅ parcial | ídem | P0-1: el botón «Administrar» del acceso no tiene endpoint detrás |
| Configuración | Media pantalla | `GET`/`PUT /users/me` | La tarjeta Cuenta ya anda (desde el 16/09/2026 sale de la sesión) y «Editar datos» se puede construir con `PUT /users/me` — ver pregunta 7, es reemplazo total. Lo bloqueado es la tarjeta de recordatorios (P0-6) y el dato «Moneda operativa», que no existe en ninguna entidad (P1-2 pide la del contrato, no una del usuario) |
| Alta de inquilino | ✅ 07/09/2026 | `POST /tenants` | Anda completa |
| Alta de contrato | ✅ 07/09/2026 | `POST /contracts` | Anda completa. P1-2 y P1-4 a P1-8 son campos de `ContractForm`, que se retira — no bloquean el asistente |
| Alta de propiedad | ✅ 17/09/2026 | `POST /properties` | Guarda, con un paso de tipo que ofrece sólo las cuatro categorías que existen. Sigue eligiendo la dirección de una lista fija por S-4, y pierde el código postal (P1-1) |
| Portal del inquilino | Sin construir | `/tenant/invoices`, `/tenant/payments` | El cliente HTTP ya está listo; la pantalla no existe. S-1 y S-2 deciden cuánto dura el acceso que esa pantalla usa · P0-4 deja su historial sin fechas · P1-9 hace que un rechazo le llegue sin motivo, y va a volver a subir lo mismo |
