# inicio

## Purpose

Darle al propietario, apenas entra, una lectura honesta de su mes: cuánto cobró y cuánto
falta, qué tan grande es su cartera, qué va a facturar el mes que viene, y qué cosas
concretas están esperando una acción suya.

## ADDED Requirements

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

La pantalla SHALL destacar las situaciones que esperan una decisión suya: pagos cargados
por el inquilino sin resolver, cuotas sin confirmar y cuotas vencidas sin pago. Cada aviso
SHALL decir de qué propiedad se trata, por cuánto, y desde cuándo, y SHALL llevar a donde
se resuelve. Cuando no haya nada pendiente, la sección SHALL decirlo en vez de desaparecer
sin explicación.

#### Scenario: Un inquilino cargó un comprobante

- **WHEN** una cuota tiene un pago esperando confirmación
- **THEN** el aviso nombra al inquilino y la propiedad, dice el monto y desde cuándo espera
- **AND** ofrece ir a revisarlo

#### Scenario: Una cuota está sin confirmar

- **WHEN** una cuota del mes no fue confirmada por el propietario
- **THEN** el aviso explica que hasta confirmarla no se le puede registrar un pago

#### Scenario: Hay cuotas vencidas

- **WHEN** una o más cuotas están vencidas sin pago
- **THEN** el aviso las agrupa, dice el total adeudado y hace cuánto vencieron

#### Scenario: No hay nada pendiente

- **WHEN** ninguna cuota requiere acción
- **THEN** la pantalla lo dice explícitamente

#### Scenario: Falta la fecha del comprobante

- **WHEN** un pago no trae la fecha en que se cargó
- **THEN** el aviso se muestra igual, sin la parte que habla de cuándo

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
