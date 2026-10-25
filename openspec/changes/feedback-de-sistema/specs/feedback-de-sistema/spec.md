# Spec Delta

## Purpose

Darle a toda la app un mismo lenguaje para decir «estoy trabajando», «salió bien» y «no
salió», de modo que el usuario nunca tenga que deducir si una acción terminó ni si se guardó.

## ADDED Requirements

### Requirement: Indicador de espera con identidad de Alquia

La app SHALL usar un único indicador de espera en todas sus pantallas: un anillo que gira, en
los colores de la marca, sin otro dibujo. En un botón el anillo SHALL ir junto a un texto
visible que diga qué se está haciendo («Guardando…»). En la carga de una pantalla o bloque el
anillo SHALL ir sin texto a la vista, y un rótulo oculto SHALL nombrar lo que se espera para
la tecnología asistiva. Con movimiento
reducido activado, el indicador SHALL seguir moviéndose, más lento, porque es la única
señal de que la app sigue trabajando.

#### Scenario: El botón ocupado lleva texto

- **WHEN** un botón está esperando al servidor
- **THEN** junto al anillo aparece un texto como «Guardando…»

#### Scenario: La carga de pantalla no muestra texto

- **WHEN** una pantalla está cargando
- **THEN** se ve sólo el anillo, grande y proporcionado a la pantalla
- **AND** un rótulo oculto como «Cargando sus contratos…» queda disponible para el lector de pantalla

#### Scenario: Movimiento reducido

- **WHEN** el usuario tiene activada la preferencia de movimiento reducido
- **THEN** el anillo gira más lento en vez de detenerse

#### Scenario: Lector de pantalla

- **WHEN** un lector de pantalla recorre una zona que está cargando
- **THEN** anuncia el texto de lo que se espera y no el dibujo del anillo

### Requirement: Carga de una pantalla o bloque

Mientras una pantalla, un detalle o un bloque espera sus datos, la app SHALL mostrar el
indicador de espera con un rótulo que nombre lo que se está trayendo, en el lugar donde va a
aparecer el contenido. Si los datos llegan rápido, el indicador SHALL NOT aparecer, para no
producir un parpadeo. Una carga que falla SHALL reemplazar el indicador por el aviso de error
de esa pantalla, en el mismo lugar, y no por un toast.

#### Scenario: Carga lenta

- **WHEN** el listado de contratos tarda en llegar
- **THEN** en el lugar del listado aparece el anillo, con «Cargando sus contratos…» como rótulo oculto

#### Scenario: Carga rápida

- **WHEN** los datos llegan en menos de un instante
- **THEN** el contenido aparece directamente, sin mostrar el indicador

#### Scenario: La carga falla

- **WHEN** la consulta de una pantalla falla
- **THEN** el indicador se reemplaza por el aviso de que no se pudo cargar, en el mismo lugar
- **AND** no aparece un toast de error

#### Scenario: Sesión del panel

- **WHEN** el propietario entra a `/dashboard` y la sesión todavía se está verificando
- **THEN** ve el indicador de espera centrado y no una pantalla en blanco

#### Scenario: Portal del inquilino

- **WHEN** el inquilino abre su enlace y las cuotas todavía no llegaron
- **THEN** ve el indicador de espera

### Requirement: Botón ocupado

Todo botón que dispara una acción que espera al servidor SHALL, mientras espera, mostrar el
indicador de espera junto a un rótulo en gerundio («Guardando…», «Archivando…»), quedar
deshabilitado e informarse como ocupado a la tecnología asistiva. El botón SHALL NOT moverse
de lugar al cambiar de rótulo. Mientras la acción está en curso, el botón de cancelar o
cerrar del mismo diálogo SHALL quedar deshabilitado.

#### Scenario: Guardar en un diálogo

- **WHEN** el propietario toca «Guardar» en un diálogo de edición
- **THEN** el botón muestra el anillo y «Guardando…», y no responde a otro toque
- **AND** «Cancelar» queda deshabilitado hasta que termine

#### Scenario: Doble toque

- **WHEN** el usuario toca dos veces seguidas un botón de guardar
- **THEN** la acción se envía una sola vez

#### Scenario: Pantallas de acceso

- **WHEN** el usuario envía el formulario de ingreso, registro, olvido o restablecimiento de contraseña
- **THEN** el botón de envío muestra el anillo con su rótulo en gerundio

#### Scenario: Acción sin diálogo

- **WHEN** el propietario toca «Descargar», «Copiar enlace» o «Ver comprobante» y la respuesta tarda
- **THEN** ese botón muestra el anillo hasta que termine

### Requirement: Toast de éxito

Cuando una acción que modifica datos o produce un efecto que no se ve en pantalla termina
bien, la app SHALL confirmarlo con un toast de éxito: ícono de éxito más una frase corta, en
tratamiento de usted, sin exclamaciones ni emojis, que nombre qué quedó hecho. El toast
SHALL aparecer después de que el diálogo o asistente se cierra, y SHALL NOT aparecer cuando
el éxito ya se muestra como una pantalla propia.

#### Scenario: Alta desde el asistente

- **WHEN** el propietario termina el asistente de propiedad, inquilino o contrato
- **THEN** vuelve al listado y ve un toast como «Propiedad agregada.»

#### Scenario: Edición en un diálogo

- **WHEN** el propietario guarda los datos de un inquilino, una propiedad, su cuenta o los recordatorios
- **THEN** el diálogo se cierra y aparece un toast que nombra lo guardado

#### Scenario: Acciones de Cobranzas

- **WHEN** el propietario confirma un importe, guarda o quita un ajuste, registra, confirma o rechaza un pago
- **THEN** aparece un toast que nombra la acción y la cuota, como «Pago confirmado. La cuota de agosto quedó pagada.»

#### Scenario: Acciones del contrato

- **WHEN** el propietario finaliza un contrato, programa un cambio de condiciones, adjunta o quita el documento
- **THEN** aparece un toast que lo confirma

#### Scenario: Archivar

- **WHEN** el propietario archiva una propiedad o un inquilino
- **THEN** vuelve al listado y ve un toast que lo confirma

#### Scenario: Enlace del inquilino

- **WHEN** el propietario copia el enlace o pide reenviarlo por correo
- **THEN** ve un toast «Enlace copiado.» o «Le reenviamos el enlace por correo al inquilino.»
- **AND** ese mensaje de éxito no se muestra con estilo ni anuncio de error

#### Scenario: Comprobante del inquilino

- **WHEN** el inquilino sube un comprobante desde su portal
- **THEN** ve un toast que confirma que lo recibió y que el propietario tiene que confirmarlo

#### Scenario: El éxito ya tiene pantalla propia

- **WHEN** el usuario termina el registro, pide el correo de recuperación o restablece su contraseña
- **THEN** ve la pantalla de éxito que ya existe y no un toast adicional

#### Scenario: Prototipo

- **WHEN** el usuario completa una acción en `/prototipo`, donde no se llama al servidor
- **THEN** igual ve el toast de éxito

### Requirement: Toast de error sólo para acciones sin lugar propio

Cuando falla una acción que no tiene un diálogo, asistente o formulario abierto donde mostrar
el error —descargar o quitar el documento, adjuntarlo, ver un comprobante, copiar o reenviar
el enlace— la app SHALL avisarlo con un toast de error: ícono de error más una frase que diga
qué no se pudo hacer y qué puede hacer el usuario. Cuando falla una acción dentro de un
diálogo, asistente o formulario abierto, el error SHALL mostrarse dentro de él, el
contenedor SHALL seguir abierto conservando lo escrito, y SHALL NOT dispararse un toast.

#### Scenario: Falla al descargar

- **WHEN** falla la descarga del documento del contrato
- **THEN** aparece un toast de error «No pudimos descargar el documento. Inténtelo de nuevo más tarde.»

#### Scenario: Falla al copiar el enlace

- **WHEN** falla la obtención del enlace del inquilino
- **THEN** aparece un toast de error y el botón no da a entender que se copió algo

#### Scenario: Falla dentro de un diálogo

- **WHEN** el guardado de un diálogo de edición falla
- **THEN** el diálogo sigue abierto con lo escrito y el motivo visible dentro de él
- **AND** no aparece un toast

#### Scenario: Falla en el asistente

- **WHEN** el guardado final de un asistente falla
- **THEN** el asistente sigue abierto en su último paso con el motivo visible
- **AND** no aparece un toast

### Requirement: Comportamiento del toast

Los toasts SHALL aparecer abajo a la derecha en escritorio y abajo, a lo ancho, en celular,
sin tapar la acción principal de un pie fijo. Un toast de éxito SHALL desaparecer solo después
de un tiempo suficiente para leerlo con calma; un toast de error SHALL quedarse hasta que el
usuario lo cierre. Todo toast SHALL tener un botón para cerrarlo, SHALL pausar su cierre
mientras el puntero o el foco están sobre él, SHALL anunciarse por lector de pantalla sin
robar el foco —el de éxito con cortesía, el de error con prioridad— y SHALL comunicar el tipo
con ícono y palabra, no sólo con color. Si se acumulan, SHALL verse como máximo tres, y el
más nuevo SHALL quedar más cerca del borde.

#### Scenario: Éxito se va solo

- **WHEN** aparece un toast de éxito y el usuario no hace nada
- **THEN** desaparece solo pasados unos segundos

#### Scenario: Error se queda

- **WHEN** aparece un toast de error
- **THEN** sigue visible hasta que el usuario lo cierra

#### Scenario: Pausa al leer

- **WHEN** el usuario pasa el puntero o el foco por un toast de éxito
- **THEN** el toast no se cierra mientras siga ahí

#### Scenario: No roba el foco

- **WHEN** aparece un toast
- **THEN** el foco del teclado sigue donde estaba y el lector de pantalla anuncia el mensaje

#### Scenario: Varios seguidos

- **WHEN** se disparan cuatro toasts seguidos
- **THEN** se ven los tres más recientes

#### Scenario: Sobrevive a la navegación

- **WHEN** una acción termina y la app cambia de pantalla
- **THEN** el toast sigue visible en la pantalla nueva

#### Scenario: Celular

- **WHEN** el usuario está en un teléfono de 390 px de ancho
- **THEN** el toast ocupa el ancho disponible abajo, con su botón de cerrar de al menos 48 px

### Requirement: Una sola confirmación por acción

Cada acción SHALL confirmarse por un solo canal. Las confirmaciones sueltas que hoy existen
en pantalla —el aviso de «guardado» de Configuración, el rótulo «Copiado» del botón del
enlace, el aviso del reenvío del enlace dentro de la tarjeta del contrato y el error de una
acción de Cobranzas mostrado fuera de su diálogo— SHALL reemplazarse por el toast
correspondiente.

#### Scenario: Configuración

- **WHEN** el propietario guarda los recordatorios
- **THEN** ve el toast de éxito y no además un aviso fijo en la tarjeta

#### Scenario: Copiar enlace

- **WHEN** el propietario copia el enlace del inquilino
- **THEN** ve el toast de éxito y el botón vuelve a decir «Copiar enlace»
