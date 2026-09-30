# ajuste-de-cuota Specification

## Purpose
Dejar que el propietario cobre por una cuota algo distinto del alquiler base —un descuento
pactado, un recargo por expensas— sin salirse de la app, y que ese número sea el mismo que
ve el inquilino.

## Requirements

### Requirement: Cuándo se puede ajustar

El sistema SHALL permitir ajustar una cuota sólo mientras no esté confirmada. Sobre una
cuota confirmada SHALL NOT ofrecer la acción, y SHALL explicar por qué si el propietario
busca ajustarla.

#### Scenario: Cuota sin confirmar

- **WHEN** el propietario abre una cuota que todavía no confirmó
- **THEN** puede ajustar su importe

#### Scenario: Cuota ya confirmada

- **WHEN** la cuota está confirmada
- **THEN** la acción de ajustar no se ofrece
- **AND** la pantalla explica que confirmar cerró el importe

#### Scenario: Se confirma mientras estaba ajustando

- **WHEN** el guardado del ajuste es rechazado porque la cuota quedó confirmada
- **THEN** la pantalla lo explica y no deja creer que el ajuste se guardó

### Requirement: Ajustar por importe final

El propietario SHALL indicar el importe final que quiere cobrar, no la diferencia. El
sistema SHALL calcular esa diferencia contra el total vigente y guardarla, eligiendo solo si
corresponde un descuento o un recargo. Cada ajuste SHALL llevar un nombre que explique de
qué se trata.

#### Scenario: Cobrar menos

- **WHEN** el propietario fija un importe final menor al total vigente
- **THEN** se guarda un descuento por la diferencia

#### Scenario: Cobrar más

- **WHEN** el propietario fija un importe final mayor al total vigente
- **THEN** se guarda un recargo por la diferencia

#### Scenario: Mismo importe

- **WHEN** el importe final coincide con el total vigente
- **THEN** el sistema no guarda nada y lo dice

#### Scenario: El motivo es obligatorio

- **WHEN** el propietario no escribe un nombre para el ajuste
- **THEN** el sistema no deja guardar

#### Scenario: Importe inválido

- **WHEN** el importe final es cero o negativo
- **THEN** el sistema no deja guardar

#### Scenario: La pantalla muestra el efecto antes de guardar

- **WHEN** el propietario escribe el importe final
- **THEN** ve la diferencia que se va a aplicar y si es descuento o recargo

### Requirement: Ver los ajustes de una cuota

La pantalla SHALL listar los ajustes ya cargados con su nombre, si suman o restan, y cuánto
representan. SHALL mostrar el importe base y el total resultante por separado, para que se
entienda de dónde sale el número.

#### Scenario: Cuota con ajustes

- **WHEN** la cuota tiene un descuento y un recargo
- **THEN** los dos se listan con su nombre y su efecto
- **AND** se ve el importe base y el total

#### Scenario: Cuota sin ajustes

- **WHEN** la cuota no tiene ninguno
- **THEN** la pantalla lo dice y su total coincide con el importe base

#### Scenario: Ajuste porcentual

- **WHEN** un ajuste está expresado como porcentaje
- **THEN** se muestra el porcentaje y cuánto representa sobre esa cuota

### Requirement: Editar y quitar un ajuste

El propietario SHALL poder cambiar o quitar un ajuste mientras la cuota no esté confirmada.
Quitar SHALL confirmarse antes, y el total SHALL recalcularse en los dos casos.

#### Scenario: Cambiar un ajuste

- **WHEN** el propietario corrige el importe de un ajuste
- **THEN** el total de la cuota se recalcula

#### Scenario: Quitar un ajuste

- **WHEN** el propietario quita un ajuste y lo confirma
- **THEN** deja de figurar y el total vuelve a reflejarlo

#### Scenario: Quitar el último ajuste

- **WHEN** se quita el único ajuste de la cuota
- **THEN** el total vuelve a ser el importe base

#### Scenario: Falla al quitar

- **WHEN** quitar falla
- **THEN** la pantalla lo avisa y el ajuste sigue ahí

### Requirement: Errores y estado

La pantalla SHALL avisar cuando una operación falle, conservando lo que el propietario había
escrito, y SHALL reflejar el total nuevo sin necesidad de recargar.

#### Scenario: Falla al guardar

- **WHEN** el guardado falla por un error del servidor
- **THEN** la pantalla lo avisa y el diálogo conserva lo escrito

#### Scenario: El total se actualiza en la lista

- **WHEN** el ajuste queda guardado
- **THEN** la fila de esa cuota muestra el total nuevo
