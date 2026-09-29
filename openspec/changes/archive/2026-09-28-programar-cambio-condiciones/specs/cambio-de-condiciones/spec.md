# cambio-de-condiciones

## Purpose

Dejar que el propietario acuerde con su inquilino nuevas condiciones para un mes futuro, y que hasta ese mes el contrato vigente y sus cuotas sigan intactos.

## ADDED Requirements

### Requirement: Programar el cambio

El sistema SHALL permitir programar nuevas condiciones sobre un contrato vigente indicando el mes desde el que rigen, el alquiler, el día de vencimiento y la actualización. El mes SHALL ser posterior al mes corriente y no posterior al último mes del contrato. Sobre un contrato no vigente, o que ya tiene un cambio programado, la acción SHALL NOT ofrecerse.

#### Scenario: Contrato vigente sin cambio programado

- **WHEN** el propietario abre el detalle de un contrato vigente
- **THEN** puede elegir «Cambiar condiciones desde el próximo período»

#### Scenario: Contrato con cambio ya programado

- **WHEN** el contrato ya tiene un sucesor programado
- **THEN** la acción no se ofrece y se muestra el cambio programado

#### Scenario: Mes fuera de rango

- **WHEN** el propietario elige el mes corriente, uno pasado o uno posterior al fin del contrato
- **THEN** no puede confirmar y ve por qué

### Requirement: Validación previa

El sistema SHALL validar antes de enviar: alquiler positivo, día de vencimiento entre 1 y 28, frecuencia de actualización positiva y, según el método, el valor o el índice. Sólo SHALL enviar el mes como primer día de mes.

#### Scenario: Día de vencimiento inválido

- **WHEN** el propietario escribe 31 como día de vencimiento
- **THEN** ve el error en el campo y no se envía nada

### Requirement: Qué queda intacto

El sistema SHALL explicar, antes de confirmar, que las cuotas anteriores al mes elegido —pagas o impagas— no cambian, y que las condiciones nuevas rigen desde ese mes.

#### Scenario: Resumen previo

- **WHEN** el propietario revisa el cambio antes de confirmar
- **THEN** ve el mes desde el que rige y que lo anterior no se toca

### Requirement: Errores del backend

El sistema SHALL mostrar el motivo cuando el backend rechaza el cambio con 400 —fecha inválida, cuota paga desde ese mes, cambio ya programado— y SHALL conservar lo que el propietario escribió.

#### Scenario: Cuota paga desde el mes elegido

- **WHEN** el backend rechaza porque hay una cuota paga desde ese mes
- **THEN** el diálogo sigue abierto, con los datos cargados y el motivo visible

### Requirement: Ver el cambio programado

El sistema SHALL mostrar en el detalle del contrato vigente el cambio programado: desde qué mes rige y sus condiciones. Un contrato programado SHALL NOT contarse como vigente ni como reemplazado en los listados y resúmenes.

#### Scenario: Después de programar

- **WHEN** el backend confirma el cambio
- **THEN** el detalle muestra «Desde octubre de 2026» con las condiciones nuevas, y el contrato sigue vigente

#### Scenario: Listado de contratos

- **WHEN** existe un contrato programado
- **THEN** aparece como «Programado» y no suma a «Vigentes»
