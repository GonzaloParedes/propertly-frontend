# Sistema de UI · Alquia

Decisiones de diseño de producto, con el porqué de cada una. Sirve para iterar el
prototipo sin re-discutir lo ya resuelto ni romper reglas que se tomaron por un
motivo concreto.

**Esto no reemplaza al manual de marca** (`docs/brand/manual/Manual_de_Marca_Alquia_v1.1.pdf`),
que manda sobre color, tipografía y logo. Acá está lo que el manual no cubre:
cómo se comportan los componentes de la app.

---

## Prototipo de referencia

| Archivo | Qué es |
|---|---|
| `src/app/prototipo` + `src/components/dashboard/` | **El prototipo vigente.** Corre en `localhost:3000/prototipo`. Es código real de la app: `OwnerWorkspace.tsx` (pantallas), `OwnerWorkspace.css` (estilos), `CreationWizard.tsx` (asistentes). Todo cambio de UI va acá. |
| `docs/prototypes/alquia-mvp.html` | **Congelado el 19/08/2026.** Fue el prototipo original en HTML autónomo; el port a React lo dejó atrás. Sirve como referencia de la dirección de diseño, **no** como fuente de verdad: no tiene el buscador de direcciones, la validación de CUIT, el panel de filtros ni el asistente de inquilino. |
| `docs/prototypes/maquetas-app.html` | Maquetas viejas. Fuente de **Claude Design Canvas** (usa `<x-dc>`, `<sc-if>`): no se ve bien en un navegador común, es normal. |

El modelo de datos del prototipo sale de `propertly-backend` rama **`origin/mvp`**,
no de `main` ni de `src/lib/types.ts`. Ver «Modelo de datos: qué manda y qué
se pide» al final.

---

## Las decisiones, y por qué

### 1 · Un paso por pantalla, no un formulario largo

Los datos se cargan con un **asistente a pantalla completa**, una pregunta por vez,
sin menú lateral que distraiga. El contrato son 6 pasos; la propiedad, 3.

*Por qué:* el público son propietarios de 25 años para arriba, muchos sin
costumbre de formularios densos. Doce campos juntos abruman; una pregunta grande
no. Se evaluaron también «frase editable» y «campos con vista previa al costado»,
y se eligió este.

### 2 · Barra de progreso, no puntitos

*Por qué:* el rótulo «Paso 3 de 6» ya dice **cuántos** son. Los puntitos repetían
esa misma información; la barra agrega otra distinta — **cuánto falta**. Además
los puntitos no escalan más allá de 5 o 6, y sugieren que se puede saltar a un
paso, cosa que no se puede.

### 3 · Cero `<select>` nativos

Reemplazados por **tarjetas de opción** (`.owner-wizard-option`), **chips**
(`.owner-chip`, `.owner-wizard-chips`) y **contadores** `+/−`
(`.owner-wizard-counter`).

*Por qué:* el desplegable nativo es el control que más envejece una interfaz, y en
móvil es el peor de todos. Una tarjeta se ve, se toca y muestra el detalle
(dirección, CUIT, superficie) sin abrir nada.

### 4 · Filas para objetos, tablas solo para lo tabular

- **`.owner-list` + `.owner-row`** → propiedades, contratos, inquilinos.
- **`.owner-table`** (dentro de `.owner-table-wrap`) → cuotas y cobranzas.

*Por qué:* una propiedad no son seis columnas comparables, es un objeto; forzarla
a tabla es lo que daba el aire de panel administrativo. Una cuota **sí** es
tabular: hay que comparar montos y fechas alineados fila contra fila.

*Salvo en celular:* el argumento de arriba depende de que haya ancho para
comparar. Por debajo de 620 px no lo hay y la tabla se apila — ver «El caso de la
tabla» en Comportamiento responsive.

### 5 · Las acciones de fila están siempre visibles

Deliberadamente **en contra** del patrón de moda de revelarlas al pasar el mouse.

*Por qué:* para alguien de 60 años una acción que aparece con el hover
directamente no existe; y en pantalla táctil no hay hover. Quedan visibles pero
calladas (`.owner-button--secondary`), y ganan énfasis al pasar por encima.

### 6 · Un solo mecanismo de contorno

Todo contorno se dibuja con **`box-shadow: inset`** y uno de tres tokens. Nunca
con `border`.

*Por qué:* la primera versión mezclaba cinco formas distintas (`border`,
`border-bottom`, `box-shadow`, y en dos casos nada) y nueve radios sueltos. Era
exactamente la causa de que los componentes «no parecieran de la misma familia».
Bonus técnico: `box-shadow` no ocupa espacio en el layout, así que un elemento no
se mueve un píxel al seleccionarse.

### 7 · El peso del botón lo fija el lugar, no la urgencia

Esta regla vive también como guardarraíl en CSS (`.owner-table .owner-button--quiet`,
`.owner-notices .owner-button--quiet`), que le devuelve el cuerpo a cualquier
`quiet` que se cuele donde no va.

| Lugar | Tono |
|---|---|
| Encabezado de página | 1 primario (crear). Un segundo va `secondary`. |
| Fila de tabla y aviso | **siempre** `secondary` |
| Destructivo | `danger` **con cuerpo** (fondo blanco + anillo rojo), nunca texto suelto al lado de un botón con cuerpo |
| `quiet` | sólo en pie de formulario junto a un primario (Cancelar, Atrás). **Nunca solo en una fila.** |

*Por qué:* la tentación es subirle el tono al botón de una cuota vencida. Pero la
urgencia ya la dicen la píldora de estado y la franja del aviso; repetirla en el
botón deja la pantalla sin jerarquía — si todo grita, nada resalta.

### 8 · Un solo estado «elegido»

Siempre: **anillo índigo + fondo índigo suave**. Vale para tarjetas, chips y
campos con foco.

*Por qué:* antes los chips usaban índigo sólido con texto blanco y las tarjetas
anillo con fondo suave. Eran dos idiomas distintos para decir lo mismo.

---

## Comportamiento responsive

La app se diseña de escritorio hacia abajo, pero **el celular no es el escritorio
angosto**: hay puntos donde un componente cambia de forma, no de tamaño. Todo eso
vive en `OwnerWorkspace.css`; no hay CSS responsive en los `.tsx`.

### Los cortes, y qué cambia en cada uno

| Corte | Qué pasa |
|---|---|
| **1200 px** | `--col-monto` y `--col-estado` se achican (140/156 → 124/140). Solo números. |
| **1080 px** | El contenido pierde padding; `.owner-detail-grid` pasa a una columna. |
| **900 px** | **El corte grande.** `.owner-nav` desaparece y aparecen `.owner-mobile-header` + `.owner-drawer`. `.owner-row` se apila (ícono a la izquierda ocupando dos filas, y monto y estado bajan debajo del texto). Los chips de filtro envuelven. El asistente pierde la barra de progreso. |
| **720 px** | `.owner-contract-summary` a una columna. |
| **620 px** | **El corte de celular.** Se achican los padding de tarjeta; los avisos, el `.owner-document` y los botones de encabezado se apilan; el diálogo pone sus acciones en columna; la tabla de cobranzas se apila. |

**No agregues cortes nuevos.** Cinco ya es mucho para una app de cinco pantallas;
un sexto valor garantiza que algo quede a mitad de camino entre dos. Si un
componente necesita otra cosa, entra en 900 (estructura) o en 620 (celular).

*Por qué 900 y no 768:* el menú lateral y las listas cambian en el **mismo**
punto. Separarlos dejaba un estado intermedio —menú ya oculto, filas todavía en
columnas— donde los textos se comprimían y las píldoras se dentaban.

### Las tres reglas de apilado

Cuando algo se apila en celular, se apila así. Son las tres que ya siguen
`.owner-row`, `.owner-notice`, `.owner-empty-callout`, `.owner-document` y la
tabla de cobranzas; un componente nuevo que no las siga se va a ver como de otra
app en el mismo teléfono.

1. **La acción va última y a lo ancho**, con `min-height:46px`. Es a lo que se
   entra a la pantalla; en escritorio puede vivir en una columna a la derecha,
   en un teléfono no hay tal columna y encogerla la esconde.
2. **El contenedor no se rompe en tarjetas sueltas.** `.owner-list` en celular
   sigue siendo un solo bloque blanco con divisores. Si un componente pasa a
   tarjetas separadas con `gap`, deja de pertenecer al conjunto.
3. **Un dato que perdió su encabezado necesita rótulo.** Sin `thead`,
   `10/08/2026` no dice qué fecha es: se le antepone «Vence » con `::before`.

### El caso de la tabla

Por debajo de 620 px la tabla de cobranzas **deja de ser tabla**. La regla 4
(«tablas solo para lo tabular») depende de que haya ancho para comparar columna
contra columna, y a 390 px no lo hay: la tabla pedía 790 px mínimos y quedaba con
scroll horizontal dentro de `.owner-table-wrap` — o sea que igual no se comparaba
nada, y encima la acción de cada cuota caía fuera de la pantalla.

Apilada conserva la única comparación que sobrevive a ese ancho —**monto y estado
en un mismo renglón**— y el resto pasa a lectura vertical. El `thead` se oculta
con `display:none` y no visualmente: en modo apilado no describe nada, y un
lector de pantalla que lo anunciara por celda sería ruido.

La ubicación de cada celda sale de `data-cell` (`propiedad`, `monto`,
`vencimiento`, `estado`, `accion`) en el `.tsx`, **no de `nth-child`**: si mañana
se agrega o se mueve una columna, con `nth-child` el layout de celular se
desarma en silencio y nadie se entera hasta abrirlo en un teléfono. Al agregar
una columna hay que darle su `data-cell` y su `grid-area` en el bloque de 620.

### Antes de dar por buena una pantalla en celular

Los tres errores que ya aparecieron, en orden de frecuencia:

- **Un contenedor con ancho mínimo dentro de uno con `overflow-x:auto`.** No
  rompe nada visible en escritorio y produce scroll horizontal en el teléfono.
- **`flex:1` compitiendo con un botón de ancho fijo.** Con ~130 px para cada uno,
  un texto sin espacios (el nombre de un PDF) se parte por los guiones en tres
  líneas. Es lo que le pasaba a `.owner-document`.
- **`align-items:center` heredado en un bloque que se volvió alto.** Deja el
  ícono o el botón flotando en el medio de su propia columna vacía. Al apilar, va
  `flex-start`.

Medida de referencia: **390 px** de ancho (iPhone 14/15). Si entra ahí, entra en
todo lo demás.

---

## Tokens

Los **colores** de abajo son reales: están en `src/app/globals.css` y se usan por
nombre en todo `OwnerWorkspace.css`.

> ⚠️ **Los tokens de radio, altura y anillo todavía no existen en el código.**
> `--r-sm`, `--r-md`, `--r-lg`, `--alto*` y `--ani-*` son el contrato al que se
> quiere llegar (ver Pendientes), no algo que se pueda usar hoy: buscarlos en el
> CSS y no encontrarlos es lo que lleva a inventar un valor nuevo al paso. Hasta
> que se creen, **copiar el valor literal del componente hermano más parecido**,
> no elegir uno propio. Lo que hay hoy:
>
> | | Contrato | En el código |
> |---|---|---|
> | Radios | 4 tokens | 7 literales: `10 · 11 · 14 · 16 · 18 · 20 · 999px` |
> | Alturas de control | 3 tokens | 9 literales, de `34px` a `64px` |
> | Anillos | 3 tokens | `box-shadow:inset` escrito a mano en cada regla |
> | Espaciado | **12 tokens, ya en el código** | 112 literales sin migrar (ver Espaciado) |
>
> Los `14px` (radio) y `999px` (píldora) concentran la mayoría de los usos: ante
> la duda, ésos.

```css
:root{
  /* marca — salen de docs/brand/color/alquia-tokens.css */
  --tinta:#1E1B2E;
  --indigo:#5B4BC4; --indigo-osc:#463AA0; --indigo-act:#3A3084; --indigo-suave:#E7E3F8;
  --lila:#A79AF0; --rosa:#DB4C8E;
  --superficie:#F6F5FC; --gris:#514D63; --blanco:#FFFFFF;
  --borde:#DEDAF0; --borde-campo:#C4BEE4; --divisor:#EDEBF7; --hover:#F1EFFA;
  --exito:#1E874B; --exito-bg:#E6F4EC;
  --adv:#B26A00;   --adv-bg:#F8EFDB;
  --error:#CE3F53; --error-bg:#FBE9EC;

  /* tipografía */
  --display:'Quicksand','Trebuchet MS','Segoe UI',sans-serif;   /* títulos y cifras */
  --ui:'Nunito Sans','Segoe UI',Arial,sans-serif;               /* interfaz y texto */

  /* radios — 5 pasos, ningún valor suelto */
  --r-sm:10px; --r-md:14px; --r-lg:20px; --r-full:999px;
  --r-mark:4px;   /* solo puntas de barra de gráfico */

  /* anillos — el único mecanismo de contorno */
  --ani-1:inset 0 0 0 1.5px var(--borde);        /* reposo   */
  --ani-2:inset 0 0 0 1.5px var(--borde-campo);  /* hover    */
  --ani-sel:inset 0 0 0 2px var(--indigo);       /* elegido  */

  /* alturas de control — tres, sin excepciones */
  --alto:52px; --alto-sm:40px; --alto-lg:58px;

  /* espaciado — los únicos que hoy existen de verdad en el código */
  --esp-2:2px;   --esp-6:6px;   --esp-8:8px;   --esp-10:10px;
  --esp-12:12px; --esp-14:14px; --esp-16:16px; --esp-18:18px;
  --esp-20:20px; --esp-26:26px; --esp-32:32px; --esp-44:44px;

  /* sombras */
  --sombra:0 1px 3px rgba(30,27,46,.03), 0 14px 34px -12px rgba(30,27,46,.13);
  --sombra-sm:0 1px 2px rgba(30,27,46,.04), 0 4px 12px -4px rgba(30,27,46,.07);
}
```

Reglas de uso:

- **Ningún radio ni altura nuevos.** No se escribe `12px` al paso: se reusa uno de
  los valores que ya están en uso (tabla de arriba). Sumar un octavo radio es
  exactamente cómo se llegó a los siete.
- **Ningún `border` que dibuje un contorno.** `border: 0` como reset está bien;
  `border-left` para la franja de severidad de `.owner-notice` es la única
  excepción, porque ahí el borde *es* el dato.
- Texto base **17px** y objetivos táctiles de **48px o más** (mandato del manual
  de marca, no negociable por estética).

---

## Espaciado

La única familia de tokens que **sí existe en el código** (`src/app/globals.css`).
Sirve de modelo para las otras tres.

La escala salió de contar los valores que el diseño ya usaba, no de imponer una
grilla de 4 u 8. Doce pasos:

```
2 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 26 · 32 · 44
```

Los nombres son el valor en px (`--esp-12` = `12px`) a propósito. Con nombres
abstractos («esp-3») la regla vigente de *copiar el literal del hermano más
parecido* sería imposible de seguir mientras radios y alturas sigan siendo
literales.

### Cómo se migró

`OwnerWorkspace.css` tenía **39 valores distintos en 289 declaraciones** de
`margin`/`padding`/`gap`. Se reemplazaron **177 por tokens sin mover un solo
píxel**: sólo se tocaron los literales que ya coincidían exacto con un paso. La
migración se verificó resolviendo cada `var()` de vuelta a px y comparando la
lista completa de (selector, propiedad, valor) contra el original.

*Por qué no se colapsó todo de una:* el diseño estaba aprobado visualmente.
Redondear los 112 restantes habría cambiado ~112 declaraciones de una pantalla
que ya se había dado por buena, sin forma de distinguir «esto siempre estuvo
mal» de «esto lo rompí en el refactor».

### Los 112 literales que quedan

Son **deuda deliberadamente visible**: si una declaración no usa token, todavía
no se revisó. No se resuelven en masa — se miran con la pantalla abierta.

| Grupo | Valores | Aprox. | Qué hacer |
|---|---|---|---|
| A 1px de un paso | `3 · 5 · 7 · 9 · 11 · 13 · 15 · 17 · 27` | ~68 | Ruido. Snap al paso vecino al revisar la pantalla. |
| A 2px de un paso | `21 · 22 · 23 · 24 · 28 · 30 · 34` | ~28 | Mirar antes: puede ser intencional. |
| No son espaciado | `36 · 38 · 48 · 54 · 56 · 68 · 80 · 96 · 238` | ~16 | **No forzar a la escala.** |

La última fila importa: `238px` es el ancho del menú lateral
(`.owner-content · margin`) y la mayoría del resto son gutters de página de
`.owner-content` por breakpoint. Son constantes de layout, no ritmo vertical.
Merecen tokens propios (`--ancho-menu`, `--gutter-*`), no un `--esp-*`.

---

## Reglas de accesibilidad que no se negocian

Salieron de medir, no de opinar. Están verificadas con números.

### El color semántico no toca el texto chico

El color vive en **íconos, franjas y cifras grandes**. Las palabras van en
`--tinta` o `--gris`.

*Por qué:* los colores semánticos del manual sobre su propio fondo suave **no
llegan a AA**:

| Combinación | Contraste | AA (4.5:1) |
|---|---|---|
| `--exito` sobre `--exito-bg` | 4.01:1 | ✗ |
| `--adv` sobre `--adv-bg` | 3.71:1 | ✗ |
| `--error` sobre `--error-bg` | 4.03:1 | ✗ |

La tabla WCAG del manual v1.1 validó esos colores **sobre blanco**, no sobre sus
propios tintes. **Pendiente:** llevar este hallazgo al manual.

### El estado nunca se comunica solo con color

Toda píldora lleva **ícono + palabra**.

*Por qué:* los semánticos no se distinguen entre sí bajo daltonismo —
advertencia contra éxito da ΔE 5.4 en protanopía, y error contra advertencia da
13.4 **incluso con visión normal** (piso recomendado: 15).

### Lo proyectado va en contorno, no en color tenue

En la cronología y en las píldoras, lo que todavía no ocurrió se dibuja con
**contorno y fondo transparente**, no con un relleno claro.

*Por qué:* el gris claro que se usaba antes daba 1.73:1 contra el blanco —
invisible para mucha gente. El contorno además dice «esto todavía no es real»
por la forma, que sobrevive al daltonismo y a la impresión en blanco y negro.

### Otras

- Foco visible en todo: anillo lila de 3px con separación de 2px (spec del manual).
- Se respeta `prefers-reduced-motion`.
- Un solo mundo visual: la app es clara por diseño, sin modo oscuro. Todos los
  colores se pintan explícitamente para que la página no herede el fondo del host.

---

## Reglas del dominio que la UI tiene que respetar

Fáciles de errarle si uno diseña sin leer el backend. Fuente:
`propertly-backend@origin/mvp`, ver el `CLAUDE.md` de cada paquete.

1. **Un pago exige comprobante.** Los campos `receipt*` de `Payment` son
   `non-nullable`. En la UI nunca dice «(opcional)».
2. **Una cuota tiene que estar confirmada antes de poder recibir un pago.**
   `Invoice.confirmed` es una acción explícita del propietario, y es un paso
   propio en Cobranzas.
3. **El pago que carga el inquilino necesita aprobación.** Arranca en
   `AWAITING_CONFIRMATION`; el que carga el propietario arranca `CONFIRMED`.
4. **En contratos por índice (ICL/IPC) el futuro es desconocido.** Las
   `PreInvoice` se generan reactivamente, recién cuando se publica cada valor. La
   UI **no proyecta montos** ahí: muestra «a definir según ICL». El total de la
   cartera lo dice explícito en vez de inventar un número redondo.

Los cuatro estados del dinero, y cómo se llaman de cara al usuario:

| Backend | En pantalla |
|---|---|
| `PreInvoice` (sin `Invoice` todavía) | Proyectada |
| `Invoice` · `PENDING` | A vencer |
| `Invoice` · `DUE` | Vencida |
| `Invoice` · `PAID` | Pagada |

Vocabulario (manual de marca, §8): *pago* no «transacción», *aviso* no
«notificación», *propiedad* no «unidad», *inquilino* no «locatario»,
*vencimiento* no «fecha límite». Tratamiento de **usted**, sin exclamaciones ni
emojis.

---

## Rechazado — no volver a proponer

Se probó y se descartó, con motivo:

- `<select>` nativos, asteriscos de campo obligatorio, `<fieldset>` con leyendas
  en mayúscula subrayadas.
- Formularios largos con todos los campos a la vista.
- Fecha como campo de texto con la ayuda «Formato: día/mes/año» al pie.
- Barra lateral oscura pesada.
- Todo dentro de tarjetas con borde de 1px.
- Todas las pantallas resueltas como tabla.
- Gráfico histórico de cobranza a 6 meses: los montos varían tan poco que salían
  seis barras casi iguales. Era decoración, no información.

---

## Modelo de datos: qué manda y qué se pide

**Decidido el 30/08/2026.** Antes esta sección decía «está sin decidir cuál gana».
Ya está decidido:

1. **Lo que el backend ya modela, manda el backend.** El front se adapta a su
   forma, aunque la nuestra parezca más cómoda.
2. **Lo que el backend no modela y el negocio necesita, se le pide al backend.**
   No se inventa una versión paralela en `types.ts`.

Fuente: `propertly-backend@origin/mvp`, `CLAUDE.md` de cada paquete. La rama
`main` del backend está muy atrás; para integrar, apuntar siempre a `mvp`.

### Glosario, porque los nombres confunden

| Backend | Qué es |
|---|---|
| `User` | **El propietario.** Email y contraseña propios; es dueño de sus `Tenant`, `Property` y `Contract`. |
| `User.realEstateAgency` | Booleano que marca las cuentas de **inmobiliaria** (el administrador). No hay entidad aparte: una inmobiliaria es un `User` con el flag en `true`. |
| `Tenant` | **El inquilino.** No es la cuenta cliente —nada que ver con el «tenant» de multi-tenancy— ni el administrador. No tiene contraseña: entra con un token ligado a un contrato (`POST /tenant-auth/session`) para ver sus cuotas y subir comprobantes. Es el «Enlace para comprobantes» del prototipo. |

### El front se adapta a esto

Lo que ya está modelado en el backend y hay que dejar de modelar distinto:

| Hoy en el front | Backend | Qué hacer |
|---|---|---|
| `startDate` + `endDate` sueltos | `startDate` + `termMonths`, `endDate` derivada | Pedir plazo en meses; no pedir fecha de fin |
| `AdjustmentFrequency` MENSUAL/TRIMESTRAL/… | `incrementFrequencyMonths` (entero) | Guardar meses. El enum no puede decir «cada 4 meses» y el prototipo lo ofrece |
| `IndexType` IPC/ICL/CUSTOM + `customIndexPercent` | `incrementMethod` FIXED_PERCENTAGE/FIXED_AMOUNT/INDEX + `incrementIndexName` | Separar **cómo** aumenta de **qué índice** usa. Son dos campos, no uno |
| `ContractStatus = "vigente"` | ACTIVE / TERMINATED / EXPIRED / **SUPERSEDED** | Cuatro estados. `SUPERSEDED` es el contrato reemplazado por un cambio de condiciones |
| Cambiar condiciones = editar el contrato | Parte el contrato en dos y los encadena (`predecessorContract` → `successorContractId`) | El diálogo «Cambiar condiciones» crea un contrato nuevo, no edita el viejo |
| Pago colgado del contrato | `Payment` cuelga de la **cuota** (`Invoice`), no del contrato | Para llegar a un pago hay que pasar por su cuota |
| — | `ContractRentAdjustment` es la fuente del alquiler actual | Nunca calcular el alquiler vigente en el front: leer `ContractResponse.currentRent` |

### Se le pide al backend

**Campos que faltan** (agregados simples):

- `Tenant.phone` — teléfono del inquilino.
- `Property.propertyType` — Departamento / Casa / PH / Local / Oficina / Cochera / Terreno.
- `Address.postalCode` — código postal.
- Depósito: monto y tipo.
- Comisión: porcentaje y quién la paga (propietario / inquilino / compartida).
- Punitorios: tipo, valor y días de gracia.
- Renovación automática y meses de preaviso.
- Penalidad por rescisión anticipada.
- Moneda del contrato (ARS / USD). Hoy los importes son `BigDecimal` sin moneda.
- Poder acotar `GET /invoices`. Hoy sin parámetros devuelve **todas** las cuotas
  del propietario desde siempre: un contrato de 36 meses son 36 cuotas, cada una
  con sus ajustes y pagos embebidos. La vista de inquilinos sólo necesita la
  situación corriente de cada contrato. Sirve un filtro por período o un
  «última cuota por contrato».

**Cambios estructurales** (no son un campo más, conviene discutirlos aparte):

- **Propietarios con porcentaje de tenencia.** Hoy el backend dice explícito que
  no existe entidad propietario: *«un `User` que tiene propiedades es un
  `User`»*. `OwnersField.tsx` modela copropiedad con porcentajes y no tiene
  dónde persistirse.
- **Varios inquilinos por contrato, con garantes.** El backend tiene
  `Contract.tenant`, uno solo, y `Tenant` no tiene flag de garante.

Mientras no estén, `PropertyForm` y `ContractForm` no se pueden guardar completos.

### Alta de contrato: gana el asistente

La UI de alta de contrato es la del **prototipo** (`CreationWizard`), no
`ContractForm` de `/dashboard/contratos/nuevo`.

*Por qué:* el asistente pide propiedad → inquilino → alquiler → fecha de inicio →
plazo en meses → método de actualización → frecuencia, que es **campo por campo
`ContractRequest`**. Quedó alineado con el backend sin que nadie lo planeara. El
paso de inquilino pide nombre / apellido / CUIT / correo, que es exactamente
`TenantRequest`. `ContractForm` pide veinte campos, la mayoría de los cuales
todavía no tienen dónde guardarse.

### Deuda del cliente HTTP

`src/lib/backend-client.ts` se portó desde la rama `mvp` **del front**, que quedó
vieja respecto del backend. Verificado el 30/08/2026 contra los controllers:

- `auth`, `users`, `tenants`, `properties`, `contracts`, `invoices` — coinciden.
- `payments` y `tenantPortal` — **desactualizados**. El commit `bb50542` del
  backend (16/08) rehízo el ciclo de pagos: `GET /payments` ahora exige
  `invoiceId`; `PUT /payments/{id}`, `POST /payments/{id}/status` y
  `DELETE /payments/{id}/receipt` ya no existen; adjuntar comprobante es
  `POST /payments` con `invoiceId` + archivo; `GET /tenant/payments` pasó a ser
  `GET /tenant/invoices`.
- `PaymentStatus` y `PaymentResponse` en `backend-types.ts` — **ya corregidos**
  el 30/08/2026, porque la vista de inquilinos lee los pagos embebidos en
  `InvoiceResponse` y no se podía escribir contra un tipo falso. `PaymentStatus`
  es `AWAITING_CONFIRMATION | CONFIRMED | REJECTED`, y `PaymentResponse` trae
  `invoiceId` y `submittedByTenant` en vez de `contractId`, `period`, `dueDate`
  y `amount`.

Falta corregir los **métodos** del grupo `payments` en `backend-client.ts`, que
siguen apuntando a endpoints muertos. Sus tests en `backend-client.test.ts`
verifican que el cliente pega donde dice pegar, no que el backend conteste: van
a seguir verdes contra endpoints que ya no existen. Corregirlo con Cobranzas.

---

## Pendientes

- [x] **Bug: el registro no podía funcionar.** `RegisterRequest` exige `taxId`
      (`@NotBlank @ValidTaxId`, y `User.taxId` es `nullable = false, unique`)
      y `/registro` no lo mandaba: devolvía 400 siempre. Resuelto el 30/08/2026
      agregando el campo al formulario. Ojo con el cruce: son **dos** CUIT
      distintos —el de `User`, que es el propietario dueño de la cuenta, y el
      de `Tenant`, que es el inquilino y ya lo pedía el asistente—. La
      validación con dígito verificador vive ahora en `src/lib/cuit.ts` y la
      usan los dos.
- [ ] Corregir los métodos de `payments` y `tenantPortal` en
      `backend-client.ts` (los tipos de `backend-types.ts` ya se corrigieron).
      Ver «Deuda del cliente HTTP».
- [ ] Pasar al backend la lista de campos y cambios estructurales pedidos.
- [x] Bajar el prototipo a componentes React (`OwnerWorkspace` +
      `CreationWizard`). Ojo: el port **aplanó espaciados por instancia** en
      una sola clase y perdió al menos un margen (los chips del paso «Plazo»
      quedaron pegados al contador). El HTML congelado tiene 11 márgenes
      inline que ninguna clase replica: revisarlos al portar lo que falta.
- [ ] Sumar al manual de marca la regla de contraste de los semánticos sobre su
      propio tinte.
- [ ] Crear los tokens de radio, altura y anillo, y reemplazar los literales.
      Hoy el documento promete un contrato que el CSS no tiene (ver Tokens).
      El espaciado ya se hizo así y sirve de molde: escala sacada de los valores
      reales, migración sólo de coincidencias exactas, verificada contra el
      original. Cero cambio visual y la deuda queda a la vista.
- [ ] Bajar los 112 literales de espaciado, pantalla por pantalla, a medida que
      se haga la revisión visual (ver Espaciado). Los grandes de `.owner-content`
      no van a `--esp-*`: piden `--ancho-menu` y `--gutter-*` propios.
- [ ] Revisión visual del prototipo en navegador — nunca se hizo; toda la
      verificación hasta ahora fue estática y de lógica. El apilado de cobranzas
      y de `.owner-document` en 620 px entra acá: se escribió sin poder abrirlo.

### Desviaciones conocidas del sistema

Detectadas y **no** corregidas todavía, porque tocan también el escritorio:

- `.owner-document > span` no recibe el recuadro blanco de 38 px que la regla sí
  le da a `.owner-contract-callout > span` y `.owner-empty-callout > svg`. El
  ícono del PDF sale sin marco mientras sus hermanos lo tienen; parece omisión al
  escribir el selector, no decisión.
- El botón «Descargar» de `.owner-document` es `tone="quiet"` y está **solo en
  una fila**, contra la regla 7. El guardarraíl de CSS cubre `.owner-table` y
  `.owner-notices`, pero no `.owner-document`, así que ahí el quiet pasa y queda
  como texto flotando.
