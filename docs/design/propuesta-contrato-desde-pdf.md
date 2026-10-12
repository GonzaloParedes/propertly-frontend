# Propuesta · Cargar un contrato desde el PDF

**Estado: implementada contra el backend** (cambio `contract-pdf-import`; ver
«Cargar un contrato desde el PDF» en `docs/design/sistema-ui.md`). El prototipo
con la lectura simulada sigue en `/prototipo` → Contratos → Nuevo contrato
(`ContractFromPdfDemo`), para las revisiones de diseño. Lo que sigue es la
propuesta original, con las decisiones que la implementación respetó y una
que cambió: **R5**.

## El problema

Quien ya tiene contratos firmados —el caso típico de un propietario que llega a
Alquia con su cartera armada— tiene que pasar cada uno a mano por los 6 pasos del
asistente, con el papel al lado. Es el momento de mayor fricción y pasa justo al
principio, cuando todavía no vio nada del valor de la app.

## La propuesta en una línea

Antes del primer paso del contrato se elige **cómo** cargarlo: subir el PDF
firmado o cargarlo a mano (lo de hoy, sin cambios). Si sube el PDF, lo leemos,
completamos los datos y **el propietario los revisa antes de que se guarde nada**.

## El recorrido

| Pantalla | Qué pasa |
|---|---|
| 0 · ¿Cómo quiere cargarlo? | Dos tarjetas de opción: «Subir el contrato firmado» / «Cargarlo a mano». Sin barra de progreso: todavía no empezó ningún recorrido. |
| 1 · Suba el contrato | **Sólo PDF, un archivo = un contrato.** Zona para arrastrar o botón «Elegir el archivo». Muestra nombre, tamaño y páginas, con «Cambiar». Avisa que el PDF queda guardado en el contrato. |
| 1 · Leyendo… | Espera con la lista de lo que se está buscando (partes, propiedad, alquiler y fechas, actualización). «Cancelar» vuelve a la carga. |
| 1 · No se pudo leer | Dos salidas: probar con otro archivo o seguir a mano. Nunca un callejón. |
| 2 · Revise lo que encontramos | El documento a la izquierda, los datos a la derecha. «Crear contrato» se habilita cuando no queda nada por resolver. |

## Decisiones, y por qué

1. **El PDF es un atajo del asistente, no un asistente aparte.** Sale del mismo
   «Nuevo contrato» y guarda lo mismo (`ContractRequest`). Si la lectura falla, la
   salida es la carga a mano, no un error.
2. **La revisión es un resumen, no un formulario.** Cada dato se ve como valor
   leído, igual que el paso «Revise que esté todo bien» de hoy. Los controles
   aparecen sólo al tocar «Corregir». Respeta «Rechazado: formularios largos con
   todos los campos a la vista». (Se probó una versión compacta —lo seguro en
   filas de una línea, sólo lo dudoso abierto— y se descartó el 07/10/2026: se
   prefiere ver cada dato con su fuente y sus acciones a la vista.)
3. **Tres estados por dato, siempre con ícono + palabra** (regla de daltonismo):
   - *Sin marca + «Cláusula X»*: el contrato lo dice tal cual.
   - *«Revisar»*: la lectura tuvo que **interpretar** (ej.: «del 1 al 10 de cada
     mes» → vence el 10; «un mes de alquiler» → depósito de $ 450.000). Se dice
     qué decía el contrato y qué se dedujo. Se resuelve con «Está bien así» o
     corrigiéndolo.
   - *«Falta completar»*: el contrato no lo trae y el backend lo exige (correo y
     teléfono del inquilino, casi nunca están en un contrato).
4. **Nada se guarda sin mirada humana en lo dudoso.** «Crear contrato» queda
   deshabilitado mientras haya algo por resolver, y el pie dice cuántos quedan:
   un botón apagado sin motivo no se entiende.
5. **Cada dato muestra de dónde salió.** «Ver en el contrato» resalta el fragmento
   en el documento (escritorio) o lo cita debajo del dato (celular, < 900 px, donde
   no entra el documento al lado). Es lo que deja verificar sin releer las 6
   páginas, y lo que hace confiable a la lectura.
6. **Propiedad e inquilino se cruzan con lo ya cargado.** Si la dirección coincide
   con una propiedad suya, se usa esa; si no, se ofrece crearla. Lo mismo con el
   inquilino por CUIT. Evita duplicados, que es el error más probable de una carga
   masiva.
7. **Trae datos que el asistente manual no pide.** Depósito, comisión, punitorios,
   renovación: `ContractRequest` ya los acepta y el contrato los dice. Van en un
   grupo aparte («También figura en el contrato») para no mezclarlos con lo
   obligatorio.
8. **El PDF queda adjunto al contrato.** Ya existe `POST /contracts/{id}/document`:
   es gratis y es lo que el propietario espera.
9. **Sin la estética de IA.** Ni destellos, ni «✨ magia», ni la palabra
   «inteligencia artificial» en la interfaz: se dice qué se hace («lo leemos») y
   se muestra el resultado. Al público de 60+ le importa que ande, no cómo.

## Un problema que este flujo destapa (y que ya existe a mano)

Un contrato que **ya está en curso** empezó en el pasado. Al crearlo, el backend
genera todas las cuotas desde `startDate` y marca vencidas las anteriores a hoy
(`ContractController.create` → `generateDueInvoicesForContract`). Para el
contrato de ejemplo (inicio 01/03/2025) son **19 cuotas vencidas** el día uno, que
aparecerían en Inicio y en Cobranzas como deuda del inquilino, y le dispararían
avisos de vencida.

El backend **no falla** con un contrato hacia atrás: lo crea, aplica los
aumentos que ya correspondían y arma todas las cuotas. El problema es que todas
nacen como deuda. Le pasa hoy también a la carga manual, pero con el PDF el caso
típico pasa a ser justamente éste.

**Decidido (07/10/2026):** antes de crear, el propietario dice explícitamente si
esas cuotas quedan **cobradas** (sin deuda ni avisos) o **como deuda** (vencidas,
con avisos). No se elige por él. **Esto necesita backend**: hoy un pago exige
comprobante (regla de dominio 1), así que no hay forma de dar por cobradas 19
cuotas de una.

## Lo que necesita del backend (a acordar como spec funcional)

Sin rutas ni formatos: sólo las reglas, para que el backend decida cómo.

- **R1 · Lectura.** Dado un PDF, devolver los datos del contrato con, por cada
  uno, el fragmento de origen (texto y ubicación en la página) y si se leyó tal
  cual o se dedujo.
- **R2 · Nada se persiste en la lectura.** Leer no crea propiedad, inquilino ni
  contrato. Lo que se crea, se crea al confirmar, con el alta que ya existe.
- **R3 · Cruce con lo cargado.** Indicar si la dirección o el CUIT coinciden con
  una propiedad o un inquilino del propietario.
- **R4 · Cuotas anteriores al alta.** Poder crear un contrato en curso sin que las
  cuotas ya transcurridas queden como deuda (ver arriba).
- **R5 · Privacidad.** ~~El documento sólo se usa para la lectura y para quedar
  adjunto; no se retiene en ningún otro lado ni se usa para otra cosa.~~
  **Reemplazada (10/10/2026).** El backend guarda completos los datos de las
  lecturas que terminan en un contrato (también el PDF, que queda adjunto), para
  poder armar más adelante un modelo propio; la anonimización se hace al
  entrenar. Si el propietario sale sin crear el contrato, o la lectura queda sin
  terminar 30 días, se borra todo: el archivo, su nombre y lo leído. El aviso de
  privacidad y los términos tienen que decirlo.

## Preguntas abiertas

1. **Sólo PDF, decidido (07/10/2026).** Las fotos quedan afuera: con varias fotos
   no hay forma limpia de saber dónde termina un contrato y empieza otro, y un
   PDF es más fácil de leer para el modelo. Quien lo tenga en papel lo escanea
   como PDF.
2. **¿Varios contratos a la vez?** Más adelante, y como varios PDFs —uno por
   contrato—, cada uno con su propia revisión. Encaja con la decisión 1.
3. **Cuotas anteriores, del lado del backend**: decidido que el propietario elige
   (ver arriba); falta cómo lo modela el backend — dar por pagadas sin
   comprobante, u otra forma.
4. **¿Qué pasa con el alquiler actual?** En un contrato por índice en curso, el
   alquiler de hoy no es el inicial. El backend lo recalcula solo desde el
   histórico del índice (`applyDueIncrements` en el alta); habría que confirmar
   que coincide con lo que el propietario cobra de verdad, y si no, cómo corregirlo.
5. **Contratos que no encajan**: en dólares, con escalonado pactado (montos
   distintos por año) o con dos inquilinos. ¿Se avisan y se mandan a la carga a
   mano, o se cargan con lo que se pueda?

## Cuánto cuesta leer un contrato

Estimación del 07/10/2026 para un contrato de 6 páginas. Cada página de PDF entra
como texto **e** imagen: ~1.500–3.000 tokens de texto más los de la imagen, así
que se calcula ~25.000 tokens de entrada y ~3.000 de salida (los datos más el
razonamiento).

| Modelo | Entrada / salida por millón | Por contrato |
|---|---|---|
| Claude Opus 5.5 | US$ 4 / 20 | ~US$ 0,16 |
| Claude Sonnet 5.5 | US$ 2 / 10 | ~US$ 0,08 |
| Claude Haiku 4.5 | US$ 1 / 5 | ~US$ 0,04 |
| GPT-5 mini (OpenAI) | US$ 0,25 / 2 | ~US$ 0,01–0,02 |

Es un costo por contrato y por única vez (al darlo de alta), no por mes. Lo que
decide el modelo es la calidad de la lectura —una cuota mal leída cuesta mucho
más que la diferencia de centavos—: conviene medirlo con 10–20 contratos reales,
empezando por Sonnet 5.5. El número real se saca con `count_tokens` sobre un PDF
de verdad.

Dato útil para el diseño: la API de Claude devuelve **citas con número de página**
sobre el PDF, que es exactamente lo que necesita «de dónde salió cada dato». Esas
citas no se pueden pedir junto con la salida estructurada en la misma llamada;
hay que resolverlo en el diseño de la API (dos pasos, o el JSON con el texto
citado adentro).

## Qué es maqueta en el prototipo

- La lectura: tarda ~4 s y devuelve siempre el contrato de ejemplo, sea cual sea
  el PDF. Un archivo con «ilegible» en el nombre muestra la pantalla de falla.
- La vista del documento es HTML que imita la primera página; la real sería el
  PDF con los mismos resaltados.
- «Crear contrato» no guarda nada (igual que el resto de `/prototipo`).
- La pantalla de elección sólo aparece en `/prototipo` (`demo`): fuera de ahí el
  asistente sigue igual que siempre.
