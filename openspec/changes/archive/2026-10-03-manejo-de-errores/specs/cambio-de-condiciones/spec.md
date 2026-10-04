# Spec Delta

## MODIFIED Requirements

### Requirement: Errores del backend

El sistema SHALL mostrar el motivo cuando el backend rechaza el cambio —fecha inválida, cuota paga desde ese mes, cambio ya programado— distinguiéndolo por su identificador estable y no por el status, ya que estos motivos no comparten un único status (algunos llegan como 409 y otros como 400), y SHALL conservar lo que el propietario escribió.

#### Scenario: Cuota paga desde el mes elegido

- **WHEN** el backend rechaza porque hay una cuota paga desde ese mes
- **THEN** el diálogo sigue abierto, con los datos cargados y el motivo visible
