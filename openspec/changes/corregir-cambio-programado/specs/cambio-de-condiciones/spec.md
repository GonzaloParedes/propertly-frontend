# Spec Delta

## MODIFIED Requirements

### Requirement: Programar el cambio

El sistema SHALL permitir programar nuevas condiciones sobre un contrato vigente indicando el mes desde el que rigen, el alquiler, el día de vencimiento y la actualización. El mes SHALL ser posterior al mes corriente y no posterior al último mes del contrato. Sobre un contrato no vigente la acción SHALL NOT ofrecerse. Sobre un contrato que ya tiene un cambio programado, programar uno nuevo SHALL NOT ofrecerse; en su lugar se ofrecen editar y cancelar el programado.

#### Scenario: Contrato vigente sin cambio programado

- **WHEN** el propietario abre el detalle de un contrato vigente
- **THEN** puede elegir «Cambiar condiciones desde el próximo período»

#### Scenario: Contrato con cambio ya programado

- **WHEN** el contrato ya tiene un sucesor programado
- **THEN** «Cambiar condiciones» no se ofrece, se muestra el cambio programado y junto a él las acciones «Editar» y «Cancelar cambio»

#### Scenario: Mes fuera de rango

- **WHEN** el propietario elige el mes corriente, uno pasado o uno posterior al fin del contrato
- **THEN** no puede confirmar y ve por qué

### Requirement: Errores del backend

El sistema SHALL mostrar el motivo cuando el backend rechaza programar, editar o cancelar el cambio —fecha inválida, cuota paga desde ese mes, cambio ya programado, cambio que ya no está programado— y SHALL conservar lo que el propietario escribió. Cuando el motivo es que el cambio ya no está programado (entró en vigencia o se canceló desde otra pestaña), el sistema SHALL además volver a cargar el detalle para mostrar el estado real.

#### Scenario: Cuota paga desde el mes elegido

- **WHEN** el backend rechaza porque hay una cuota paga desde ese mes
- **THEN** el diálogo sigue abierto, con los datos cargados y el motivo visible

#### Scenario: El cambio ya no está programado

- **WHEN** el propietario confirma una edición o una cancelación y el backend responde que ese cambio ya no está programado
- **THEN** ve que el cambio ya entró en vigencia o fue cancelado, y el detalle se actualiza con el estado real del contrato

## ADDED Requirements

### Requirement: Editar el cambio programado

El sistema SHALL permitir editar un cambio programado mientras no haya entrado en vigencia. La edición SHALL usar el mismo formulario que programar, precargado con las condiciones del cambio programado —mes, alquiler, día de vencimiento y actualización—, con las mismas validaciones y el mismo rango de meses. Confirmar SHALL reemplazar el cambio programado por el nuevo en una sola operación: si el backend rechaza, el cambio programado anterior SHALL seguir intacto.

#### Scenario: Abrir la edición

- **WHEN** el propietario elige «Editar» en el aviso del cambio programado
- **THEN** se abre el formulario con el mes, el alquiler, el vencimiento y la actualización del cambio programado, no los del contrato vigente

#### Scenario: Corregir el alquiler

- **WHEN** el propietario cambia el alquiler y confirma
- **THEN** el aviso muestra el alquiler corregido y el contrato vigente sigue intacto

#### Scenario: Mover el mes

- **WHEN** el propietario elige otro mes dentro del rango y confirma
- **THEN** el aviso muestra el cambio programado desde el mes nuevo

#### Scenario: El reemplazo falla

- **WHEN** el backend rechaza la edición
- **THEN** el diálogo sigue abierto con lo escrito y el motivo visible, y el aviso sigue mostrando el cambio programado anterior

### Requirement: Cancelar el cambio programado

El sistema SHALL permitir cancelar un cambio programado mientras no haya entrado en vigencia. Antes de cancelar SHALL pedir confirmación, diciendo que el contrato sigue con sus condiciones actuales. Después de cancelar, el contrato SHALL quedar como si el cambio nunca se hubiera programado: sin aviso de cambio programado y con «Cambiar condiciones» disponible otra vez.

#### Scenario: Confirmar la cancelación

- **WHEN** el propietario elige «Cancelar cambio» y lo confirma
- **THEN** el aviso desaparece, el contrato sigue con sus condiciones actuales y vuelve a ofrecerse «Cambiar condiciones»

#### Scenario: Arrepentirse

- **WHEN** el propietario elige «Cancelar cambio» y cierra la confirmación sin aceptar
- **THEN** no se envía nada y el cambio sigue programado

#### Scenario: La cancelación falla

- **WHEN** el backend rechaza la cancelación por un motivo distinto de que el cambio ya no está programado
- **THEN** la confirmación muestra el motivo y el cambio sigue programado
