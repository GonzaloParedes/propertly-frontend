# Spec Delta

## MODIFIED Requirements

### Requirement: Finalizar el contrato

El propietario SHALL poder dar por terminado un contrato vigente indicando desde cuándo.
La pantalla SHALL advertir antes que las cuotas futuras impagas dejan de existir, y SHALL
ofrecerse sólo sobre un contrato vigente. Si el contrato tiene un cambio de condiciones
programado, la advertencia SHALL decir también que ese cambio se descarta.

#### Scenario: Finalizar con fecha

- **WHEN** el propietario finaliza el contrato indicando la fecha
- **THEN** el contrato queda terminado y la pantalla lo refleja

#### Scenario: Advertencia antes de finalizar

- **WHEN** el propietario abre la acción de finalizar
- **THEN** la pantalla explica que las cuotas futuras impagas se eliminan
- **AND** no hace nada hasta que lo confirme

#### Scenario: Finalizar con un cambio programado

- **WHEN** el propietario abre la acción de finalizar sobre un contrato con un cambio programado
- **THEN** la advertencia dice además que el cambio programado se descarta
- **AND** al confirmar, el detalle ya no muestra el aviso del cambio programado

#### Scenario: Contrato que ya terminó

- **WHEN** el contrato no está vigente
- **THEN** la acción de finalizar no se ofrece

#### Scenario: El backend rechaza la fecha

- **WHEN** el backend rechaza la terminación
- **THEN** la pantalla explica el motivo y el contrato sigue vigente
