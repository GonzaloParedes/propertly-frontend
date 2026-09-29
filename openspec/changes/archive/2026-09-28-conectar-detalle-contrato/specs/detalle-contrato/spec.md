# detalle-contrato

## Purpose

Darle al propietario la vista completa de un contrato —cuánto cobra hoy, cuándo sube,
bajo qué condiciones se firmó y qué documento lo respalda— y las acciones que sólo se
hacen desde ahí: compartirle el acceso al inquilino, guardar el contrato firmado y darlo
por terminado.

## ADDED Requirements

### Requirement: Datos del contrato

La pantalla SHALL mostrar el alquiler vigente, el estado del contrato, su día de
vencimiento, cuándo empezó y cuándo termina. Las fechas SHALL ser las que el backend
guarda, sin recalcularse.

#### Scenario: Contrato vigente

- **WHEN** el propietario abre un contrato activo
- **THEN** ve la propiedad, el inquilino, el alquiler vigente y hasta cuándo rige

#### Scenario: Contrato terminado antes de tiempo

- **WHEN** el contrato terminó antes de su fin previsto
- **THEN** la pantalla muestra la fecha en que efectivamente terminó, además de la prevista

#### Scenario: Contrato reemplazado por una renegociación

- **WHEN** el contrato fue reemplazado por otro
- **THEN** la pantalla lo indica y permite ir al contrato que lo sucedió

### Requirement: Próxima actualización del alquiler

La pantalla SHALL mostrar cuándo se aplica el próximo aumento usando el cálculo del
backend. SHALL NOT derivar esa fecha de la frecuencia y el inicio del contrato. Cuando el
importe futuro todavía depende de un índice sin publicar, SHALL mostrar la fecha sin
inventar el monto.

#### Scenario: Aumento por porcentaje fijo

- **WHEN** el contrato sube por un porcentaje y el backend informa la próxima fecha y el próximo importe
- **THEN** la pantalla muestra ambos

#### Scenario: Aumento por índice sin valor publicado

- **WHEN** el backend informa la fecha pero no el importe
- **THEN** la pantalla muestra la fecha y aclara que el monto se define según el índice

#### Scenario: Contrato sin próxima actualización

- **WHEN** el backend no informa una próxima actualización
- **THEN** la línea de tiempo omite ese hito en vez de mostrarlo vacío

### Requirement: Condiciones comerciales

La pantalla SHALL mostrar las condiciones pactadas que el contrato guarda: moneda,
depósito, comisión, punitorios por mora, renovación automática y preaviso de rescisión.
SHALL omitir las que no se cargaron, en vez de mostrarlas en cero o como «no».

#### Scenario: Contrato con condiciones cargadas

- **WHEN** el contrato tiene depósito, comisión y punitorios
- **THEN** cada condición aparece con su valor y, cuando corresponde, quién la paga

#### Scenario: Contrato sin condiciones cargadas

- **WHEN** ninguna condición comercial fue cargada
- **THEN** la pantalla no muestra la sección, en vez de una lista de campos vacíos

#### Scenario: Importes en otra moneda

- **WHEN** el contrato está pactado en dólares
- **THEN** los importes se muestran en esa moneda

### Requirement: Historial de aumentos

La pantalla SHALL mostrar los aumentos ya aplicados, con cuándo se aplicó cada uno y con
qué alquiler quedó. Para los aumentos por índice SHALL indicar el período del índice usado.

#### Scenario: Contrato con aumentos aplicados

- **WHEN** el contrato tuvo dos aumentos
- **THEN** ambos aparecen con su fecha y el alquiler resultante

#### Scenario: Contrato sin aumentos todavía

- **WHEN** el contrato aún no tuvo ningún aumento
- **THEN** la pantalla lo dice en vez de mostrar una lista vacía

### Requirement: Acceso del inquilino

El propietario SHALL poder obtener el enlace de acceso del inquilino para compartirlo por
el canal que quiera, sin reenviar el correo. La pantalla SHALL NOT afirmar una vigencia del
enlace que no pueda sostener.

#### Scenario: Copiar el enlace

- **WHEN** el propietario pide el enlace
- **THEN** el sistema lo obtiene y queda copiado
- **AND** la pantalla confirma que se copió

#### Scenario: No se pudo obtener

- **WHEN** la consulta del enlace falla
- **THEN** la pantalla lo avisa y no deja creer que se copió algo

#### Scenario: Reenviar el correo sigue siendo otra acción

- **WHEN** el propietario prefiere que le llegue por correo al inquilino
- **THEN** puede pedir el reenvío, distinguible de copiar el enlace

### Requirement: Documento firmado

El propietario SHALL poder adjuntar, descargar y quitar el documento del contrato. La
pantalla SHALL mostrar el nombre del archivo, su tamaño y cuándo se cargó.

#### Scenario: Contrato con documento

- **WHEN** el contrato tiene un documento adjunto
- **THEN** la pantalla lo nombra con su tamaño y fecha de carga, y permite descargarlo

#### Scenario: Contrato sin documento

- **WHEN** el contrato no tiene documento
- **THEN** la pantalla ofrece adjuntarlo

#### Scenario: Adjuntar reemplaza el anterior

- **WHEN** el propietario adjunta un documento sobre uno existente
- **THEN** la pantalla aclara que reemplaza al anterior antes de hacerlo

#### Scenario: Quitar el documento

- **WHEN** el propietario quita el documento
- **THEN** la pantalla vuelve a ofrecer adjuntar uno

#### Scenario: Falla la carga

- **WHEN** adjuntar falla
- **THEN** la pantalla lo avisa y conserva el documento anterior si lo había

### Requirement: Finalizar el contrato

El propietario SHALL poder dar por terminado un contrato vigente indicando desde cuándo.
La pantalla SHALL advertir antes que las cuotas futuras impagas dejan de existir, y SHALL
ofrecerse sólo sobre un contrato vigente.

#### Scenario: Finalizar con fecha

- **WHEN** el propietario finaliza el contrato indicando la fecha
- **THEN** el contrato queda terminado y la pantalla lo refleja

#### Scenario: Advertencia antes de finalizar

- **WHEN** el propietario abre la acción de finalizar
- **THEN** la pantalla explica que las cuotas futuras impagas se eliminan
- **AND** no hace nada hasta que lo confirme

#### Scenario: Contrato que ya terminó

- **WHEN** el contrato no está vigente
- **THEN** la acción de finalizar no se ofrece

#### Scenario: El backend rechaza la fecha

- **WHEN** el backend rechaza la terminación
- **THEN** la pantalla explica el motivo y el contrato sigue vigente

### Requirement: Carga y error

La pantalla SHALL indicar mientras carga y avisar si el contrato no se pudo obtener.

#### Scenario: Cargando

- **WHEN** el contrato todavía no llegó
- **THEN** la pantalla lo indica

#### Scenario: La carga falla

- **WHEN** la consulta del contrato falla
- **THEN** la pantalla avisa que no se pudo cargar y permite volver a la lista

#### Scenario: El historial falla sin voltear la pantalla

- **WHEN** el historial de aumentos no se puede obtener pero el contrato sí
- **THEN** el resto del detalle se muestra igual
