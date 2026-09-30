# portal-inquilino Specification

## Purpose
Darle al inquilino, sin cuenta ni contraseña, una forma de ver sus cuotas y subir el
comprobante de pago desde el enlace que recibe por correo — la mitad del sistema que
existe del lado del propietario y todavía no tiene pantalla.

## Requirements

### Requirement: Autenticación mediante enlace

El sistema SHALL autenticar al inquilino canjeando el token de la URL por una sesión,
sin pedirle registro ni contraseña. Una vez establecida, la sesión SHALL persistir entre
visitas sin que el inquilino tenga que volver a abrir el enlace.

#### Scenario: Primer acceso con el enlace

- **WHEN** el inquilino abre el enlace del correo con un token válido
- **THEN** queda autenticado y ve sus cuotas

#### Scenario: Visita posterior sin el token en la URL

- **WHEN** el inquilino vuelve a `/tenant-portal` en otra visita, sin `?token=`
- **THEN** la sesión de la visita anterior lo sigue reconociendo

#### Scenario: Token inválido o de otro tipo

- **WHEN** el token no es válido
- **THEN** el sistema muestra que el enlace no funciona, sin detalles técnicos
- **AND** no revela si el problema es el token, el contrato o el inquilino

### Requirement: Alcance de la sesión

La sesión del inquilino SHALL estar limitada al contrato de su enlace. SHALL NOT exponer
ni permitir ninguna acción sobre otro contrato, otra propiedad o los datos del
propietario.

#### Scenario: Sólo su contrato

- **WHEN** el inquilino está autenticado
- **THEN** sólo ve las cuotas del contrato al que corresponde su enlace

### Requirement: Acceso tras la finalización del contrato

Cuando el contrato del inquilino ya no esté vigente, el sistema SHALL seguir mostrando su
historial de cuotas y pagos. SHALL NOT permitir cargar comprobantes nuevos.

#### Scenario: Contrato terminado, se puede consultar

- **WHEN** el inquilino entra con un contrato que ya terminó
- **THEN** ve su historial completo de cuotas y pagos

#### Scenario: Contrato terminado, no se puede pagar

- **WHEN** el inquilino intenta subir un comprobante sobre un contrato que no está vigente
- **THEN** el sistema lo rechaza y explica que el contrato ya no está activo

### Requirement: Listado de cuotas

El portal SHALL mostrar todas las cuotas del contrato, cada una con su período, fecha de
vencimiento, importe y estado. SHALL ordenarlas de forma que las que requieren atención
—vencidas, por vencer— aparezcan antes que las ya resueltas.

#### Scenario: Cuotas de distintos estados

- **WHEN** el inquilino tiene cuotas vencidas, por vencer y pagadas
- **THEN** ve las tres categorías, cada una identificada con su estado

#### Scenario: Todavía no hay cuotas

- **WHEN** el contrato no tiene cuotas generadas todavía
- **THEN** el portal lo dice en vez de mostrar una lista vacía sin explicación

### Requirement: Cuota sin confirmar

Cuando una cuota no esté confirmada, el portal SHALL mostrar su importe junto con la
aclaración de que el propietario todavía no lo cerró y puede cambiar. SHALL NOT ofrecer
la carga de un comprobante sobre esa cuota.

#### Scenario: Ver una cuota sin confirmar

- **WHEN** una cuota del inquilino no está confirmada
- **THEN** ve el período, el vencimiento y el importe
- **AND** una aclaración de que el importe puede cambiar
- **AND** no hay forma de subir un comprobante para esa cuota

### Requirement: Subir un comprobante

Sobre una cuota confirmada sin pago activo, el inquilino SHALL poder subir un archivo como
comprobante de pago. Al subirlo, la cuota SHALL quedar marcada como esperando la
confirmación del propietario, y el inquilino SHALL ver ese estado reflejado de inmediato.

#### Scenario: Subir el comprobante

- **WHEN** el inquilino sube un archivo sobre una cuota confirmada y sin pago activo
- **THEN** el pago queda registrado como esperando confirmación
- **AND** la cuota lo refleja sin que el inquilino tenga que recargar

#### Scenario: Ya hay un pago esperando confirmación

- **WHEN** la cuota ya tiene un pago sin resolver
- **THEN** el portal no ofrece subir otro, y muestra el que está pendiente

#### Scenario: El pago anterior fue rechazado

- **WHEN** el propietario rechazó el comprobante anterior de esa cuota
- **THEN** el inquilino puede subir uno nuevo

#### Scenario: Falla la carga

- **WHEN** la subida del archivo falla
- **THEN** el portal lo avisa y la cuota conserva su estado anterior

### Requirement: Ver el propio comprobante

El inquilino SHALL poder ver o descargar el comprobante que él mismo cargó, en cualquier
estado en que esté.

#### Scenario: Ver el comprobante de un pago pendiente

- **WHEN** el inquilino tiene un pago esperando confirmación
- **THEN** puede volver a ver el archivo que subió

#### Scenario: Ver el comprobante de un pago confirmado

- **WHEN** el pago del inquilino ya fue confirmado
- **THEN** puede seguir viendo el comprobante como respaldo

### Requirement: Estado del pago cargado

El portal SHALL mostrar si el pago cargado está esperando confirmación, fue confirmado o
fue rechazado. Cuando el propietario haya dejado un motivo de rechazo, el portal SHALL
mostrárselo al inquilino.

#### Scenario: Pago esperando confirmación

- **WHEN** el inquilino cargó un comprobante y el propietario no lo resolvió todavía
- **THEN** la cuota lo muestra como esperando confirmación

#### Scenario: Pago rechazado con motivo

- **WHEN** el propietario rechazó el pago y dejó un motivo
- **THEN** el inquilino ve que fue rechazado y por qué

#### Scenario: Pago rechazado sin motivo

- **WHEN** el propietario rechazó el pago sin escribir un motivo
- **THEN** el inquilino ve que fue rechazado, sin inventar una razón

### Requirement: Carga y error

El portal SHALL indicar mientras las cuotas están cargando, y SHALL avisar si no se
pueden obtener, sin mostrar una lista vacía como si el inquilino no tuviera cuotas.

#### Scenario: Cargando

- **WHEN** las cuotas todavía no llegaron
- **THEN** el portal lo indica

#### Scenario: La carga falla

- **WHEN** la consulta de las cuotas falla
- **THEN** el portal avisa que no se pudieron cargar y no da a entender que no hay ninguna
