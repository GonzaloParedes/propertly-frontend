# inicio Specification

## Purpose
Darle al propietario, apenas entra, una lectura honesta de su mes: cuánto cobró y cuánto
falta, qué tan grande es su cartera, qué va a facturar el mes que viene, y qué cosas
concretas están esperando una acción suya.

## Requirements

### Requirement: Cobranza del mes corriente

La pantalla SHALL mostrar, para el período corriente, cuánto está cobrado, cuánto por
vencer y cuánto vencido, junto con el total emitido. Los montos SHALL salir de las cuotas
del propietario y nunca calcularse sobre un período distinto del que la pantalla nombra.

#### Scenario: Cartera con cuotas en los tres estados

- **WHEN** el mes tiene una cuota pagada, una por vencer y una vencida
- **THEN** cada monto se muestra bajo su estado
- **AND** el total emitido es la suma de los tres

#### Scenario: Un pago esperando confirmación todavía no está cobrado

- **WHEN** una cuota tiene un pago cargado por el inquilino sin resolver
- **THEN** su monto no cuenta como cobrado
- **AND** la pantalla lo refleja donde la cuota corresponda por su vencimiento

#### Scenario: Mes sin cuotas emitidas

- **WHEN** el período corriente no tiene ninguna cuota
- **THEN** la pantalla lo dice en vez de mostrar ceros

#### Scenario: La proporción acompaña a los montos

- **WHEN** se muestran los tres montos
- **THEN** la barra los representa en proporción
- **AND** su descripción accesible dice los mismos valores que el texto

### Requirement: Tamaño de la cartera

La pantalla SHALL indicar cuántas propiedades tiene el propietario, distinguiendo las que
tienen contrato vigente de las que no.

#### Scenario: Cartera mixta

- **WHEN** el propietario tiene cinco propiedades y cuatro con contrato vigente
- **THEN** la pantalla dice cinco propiedades, cuatro con contrato y una sin alquilar

#### Scenario: Cartera vacía

- **WHEN** el propietario no cargó ninguna propiedad
- **THEN** la pantalla lo dice y ofrece cargar la primera

### Requirement: Proyección del mes siguiente

La pantalla SHALL mostrar lo proyectado para el mes siguiente sumando únicamente los
períodos que el sistema ya puede determinar. Un contrato cuyo importe todavía depende de
un índice sin publicar SHALL contarse aparte y nombrarse como pendiente de definir; su
monto SHALL NOT estimarse ni incluirse en el total.

#### Scenario: Todos los contratos son determinables

- **WHEN** todos los contratos vigentes tienen su proyección para el mes siguiente
- **THEN** la pantalla muestra la suma y no menciona contratos a definir

#### Scenario: Un contrato por índice sin valor publicado

- **WHEN** un contrato vigente no tiene proyección para ese mes
- **THEN** la pantalla suma sólo los demás
- **AND** aclara que ese contrato queda a definir según el índice

#### Scenario: Ningún contrato es determinable todavía

- **WHEN** ninguno de los contratos vigentes tiene proyección para ese mes
- **THEN** la pantalla no muestra un total
- **AND** explica que los importes dependen de índices sin publicar

### Requirement: Lo que requiere acción del propietario

The screen SHALL highlight the situations waiting for the owner's decision: payments uploaded by the tenant and not yet resolved, unconfirmed invoices, overdue invoices without payment, and contract drafts. Each invoice notice SHALL say which property it is about, for how much, and since when, and SHALL lead to where it is resolved. Each draft notice SHALL show the draft's label and when it was last edited, and SHALL offer "Continuar" and "Descartar" as specified by `contract-drafts`. When nothing is pending, invoices and drafts included, the section SHALL say so instead of disappearing without explanation.

#### Scenario: Un inquilino cargó un comprobante

- **WHEN** an invoice has a payment awaiting confirmation
- **THEN** the notice names the tenant and the property, and says the amount and how long it has been waiting
- **AND** it offers to go review it

#### Scenario: Una cuota está sin confirmar

- **WHEN** an invoice of the month was not confirmed by the owner
- **THEN** the notice explains that no payment can be recorded until it is confirmed

#### Scenario: Hay cuotas vencidas

- **WHEN** one or more invoices are overdue without payment
- **THEN** the notice groups them and states the total owed and how long ago they fell due

#### Scenario: Hay un contrato en borrador

- **WHEN** the owner has a contract draft labeled "Lavalle 950 · Pérez", last edited three days ago
- **THEN** the section shows a notice with that label and "editado hace 3 días", with "Continuar" and "Descartar"

#### Scenario: Sólo hay borradores pendientes

- **WHEN** no invoice requires action and the owner has one draft
- **THEN** the section shows the draft's notice and does not say that nothing is pending

#### Scenario: No hay nada pendiente

- **WHEN** no invoice requires action and the owner has no drafts
- **THEN** the screen says so explicitly

#### Scenario: Falta la fecha del comprobante

- **WHEN** a payment does not include the date it was uploaded
- **THEN** the notice is shown anyway, without the part about when

### Requirement: Contratos vigentes

La pantalla SHALL listar los contratos vigentes con su propiedad, su inquilino, su
alquiler actual y cuándo terminan.

#### Scenario: El propietario tiene contratos vigentes

- **WHEN** hay contratos con estado vigente
- **THEN** cada uno aparece con propiedad, inquilino, alquiler actual y fecha de fin

#### Scenario: Un contrato terminado no figura

- **WHEN** un contrato está finalizado, vencido o reemplazado
- **THEN** no aparece en esta lista

#### Scenario: Todavía no hay contratos

- **WHEN** el propietario no tiene ningún contrato vigente
- **THEN** la pantalla lo dice y ofrece crear el primero

### Requirement: Carga y error

La pantalla SHALL indicar mientras carga y SHALL avisar si los datos no se pudieron
obtener, sin presentar un panel en cero como si fuera el estado real de la cartera.

#### Scenario: Cargando

- **WHEN** los datos todavía no llegaron
- **THEN** la pantalla lo indica

#### Scenario: La carga falla

- **WHEN** alguna de las consultas falla
- **THEN** la pantalla avisa que no se pudo cargar el panel
- **AND** no muestra montos en cero
