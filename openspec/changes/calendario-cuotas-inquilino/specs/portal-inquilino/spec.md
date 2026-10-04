# portal-inquilino

## MODIFIED Requirements

### Requirement: Alcance de la sesión

La sesión del inquilino SHALL estar limitada a la cadena de contratos efectivos unidos
por relaciones explícitas de predecesor/sucesor al contrato de su enlace. SHALL mostrar
el mismo historial desde el enlace original o uno sucesor. SHALL NOT incluir contratos
no relacionados, aunque tengan el mismo inquilino, propiedad o propietario.

#### Scenario: Sólo su contrato

- **WHEN** el inquilino está autenticado con un enlace cuyo contrato no tiene sucesores
- **THEN** sólo ve las cuotas de ese contrato

#### Scenario: Enlace original y enlace sucesor

- **WHEN** un cambio de condiciones activó un contrato sucesor
- **THEN** cualquiera de los dos enlaces muestra las cuotas del original y el sucesor
- **AND** no aparece un selector de contratos

#### Scenario: Otro contrato del mismo inquilino

- **WHEN** el inquilino tiene otro contrato sin vínculo con esa cadena
- **THEN** sus cuotas y comprobantes no aparecen ni se pueden modificar desde este enlace

### Requirement: Acceso tras la finalización del contrato

Cuando la cadena de contratos ya no tenga ninguno activo, el sistema SHALL seguir
mostrando el historial de cuotas y pagos. SHALL NOT ofrecer cargar comprobantes
nuevos. Que un contrato anterior esté `SUPERSEDED` no vuelve de sólo lectura a toda
la cadena mientras exista un sucesor activo.

#### Scenario: Contrato terminado, se puede consultar

- **WHEN** el inquilino entra con una cadena que ya no tiene contrato activo
- **THEN** ve el historial completo de cuotas y pagos de la cadena

#### Scenario: Contrato terminado, no se puede pagar

- **WHEN** el inquilino intenta subir un comprobante cuando la cadena ya no tiene
  contrato activo
- **THEN** el sistema lo rechaza y explica que el acuerdo ya no está activo

### Requirement: Listado de cuotas

El portal SHALL mostrar en un único calendario las cuotas del contrato original y sus
sucesores efectivos, sin selector de contratos, en una vista anual de 12 meses. Cada mes
con cuota SHALL comunicar su estado con texto —«Pagada», «Pago a confirmar», «Vencida» o
«A vencer»— y SHALL permitir abrir el detalle con período, vencimiento, importe y las
acciones que correspondan. La ubicación mensual SHALL usar `invoice.period`, no su fecha
de vencimiento. El portal SHALL permitir navegar entre los años cubiertos por la cadena
y los años con cuotas, incluyendo una elección directa de año.

El encabezado SHALL saludar con `tenant.firstName` y `tenant.lastName` recibidos en el
calendario. SHALL NOT solicitar ni mostrar un identificador, datos de contacto, fiscales,
del propietario o de la propiedad para ese fin.

#### Scenario: Saludo desde la sesión

- **WHEN** el calendario devuelve `tenant.firstName: "Lucía"` y
  `tenant.lastName: "Fernández"`
- **THEN** el encabezado muestra «Hola, Lucía Fernández»

#### Scenario: Contrato largo

- **WHEN** el contrato abarca varios años y el inquilino abre el portal
- **THEN** ve sólo los 12 meses del año seleccionado
- **AND** puede elegir otro año sin recorrer una lista de cuotas

#### Scenario: Cuotas de distintos estados

- **WHEN** un año contiene cuotas pagadas, a confirmar, vencidas y a vencer
- **THEN** cada mes comunica el estado que corresponde, también sin depender del color

#### Scenario: Todavía no hay cuotas

- **WHEN** el contrato no tiene cuotas generadas todavía
- **THEN** el portal muestra los 12 meses del año correspondiente y explica los meses
  interiores como «Sin cuota generada», sin presentar una lista vacía

#### Scenario: Abrir una cuota

- **WHEN** el inquilino selecciona un mes con cuota
- **THEN** ve su vencimiento, importe, ajustes y estado de pago
- **AND** puede usar las acciones actuales de comprobante que correspondan

#### Scenario: Vencimiento en otro mes

- **WHEN** `invoice.period` es junio y `dueDate` cae en julio
- **THEN** la cuota aparece en junio y su detalle informa el vencimiento de julio

#### Scenario: Más de una cuota del mismo período

- **WHEN** el backend devuelve dos cuotas para un mismo período
- **THEN** el mes indica que hay dos y el detalle permite consultar ambas

#### Scenario: Cambio de condiciones efectivo

- **WHEN** empieza el período de un sucesor ya activo
- **THEN** ese mes indica discretamente «Cambiaron las condiciones»
- **AND** la indicación no reemplaza el estado de la cuota ni inventa un importe

#### Scenario: Cambio programado aún no efectivo

- **WHEN** existe un sucesor programado pero aún no activado
- **THEN** el calendario sigue mostrando las cuotas y vigencia del contrato actual
- **AND** no presenta el cambio como si ya hubiera ocurrido

## ADDED Requirements

### Requirement: Meses sin cuota y límites del contrato

El portal SHALL obtener del backend los intervalos efectivos (`coverage`) de la cadena
de contratos del enlace. SHALL distinguir los meses anteriores al primer intervalo,
los meses cubiertos sin cuota, los huecos entre intervalos y los meses posteriores al
último. SHALL NOT inferir vigencia a partir de la primera o última cuota ni presentar
un mes sin cuota como deuda.

#### Scenario: Contrato que empieza en junio

- **WHEN** el contrato comienza en junio de 2025 y se consulta ese año
- **THEN** enero a mayo dicen «Antes del contrato» y no ofrecen detalle ni pago
- **AND** junio a diciembre muestran su cuota o «Sin cuota generada» según los datos

#### Scenario: Contrato que termina durante el año

- **WHEN** el fin efectivo cae en septiembre y un mes posterior no tiene cuota
- **THEN** ese mes dice «Después del contrato» y no ofrece detalle ni pago

#### Scenario: Mes dentro del contrato sin importe

- **WHEN** un mes dentro de la vigencia no tiene `InvoiceResponse` ni `preInvoice`
- **THEN** dice «Sin cuota generada», sin monto ni estado de deuda

#### Scenario: Importe pendiente de confirmación

- **WHEN** un mes dentro de la vigencia tiene una `preInvoice` y no tiene factura emitida
- **THEN** muestra su importe como «Importe a confirmar»
- **AND** no lo presenta como vencido, no muestra vencimiento ni permite comprobante

#### Scenario: Hueco entre contratos relacionados

- **WHEN** un mes no está cubierto por ninguno de los intervalos de la cadena
  y queda entre ellos
- **THEN** dice «Sin contrato vigente», sin monto ni estado de deuda

#### Scenario: Cuota histórica fuera de los límites informados

- **WHEN** existe una cuota cuyo período cae fuera de las fechas recibidas
- **THEN** el portal permite verla y consultar su detalle

#### Scenario: Contrato terminado

- **WHEN** la cadena ya no tiene contrato activo
- **THEN** el inquilino conserva acceso a su historial y comprobantes
- **AND** el portal no ofrece subir un comprobante nuevo

### Requirement: Comprobante de cuota anterior al cambio

El portal SHALL mantener visible una cuota anterior impaga tras un cambio de condiciones.
Mientras exista un sucesor activo, SHALL ofrecer «Subir comprobante» para esa cuota si
el backend indica `canSubmitPayment: true`. La decisión de elegibilidad SHALL venir
del backend y SHALL aplicarse también al endpoint de carga; el front no la inferirá del
estado `SUPERSEDED` ni de los límites del calendario.

#### Scenario: Cuota anterior pendiente con sucesor activo

- **WHEN** septiembre sigue vencido y en octubre entraron en vigor nuevas condiciones
- **THEN** septiembre sigue marcado como «Vencida» y su detalle explica que continúa
  pendiente aunque las condiciones hayan cambiado
- **AND** si `canSubmitPayment` es verdadero, el inquilino puede subir su comprobante
  desde cualquiera de los enlaces de la cadena

#### Scenario: Cuota anterior sin permiso de carga

- **WHEN** el backend indica `canSubmitPayment: false` para una cuota histórica
- **THEN** el detalle conserva el estado y el historial de pagos
- **AND** no ofrece «Subir comprobante» ni sugiere que la deuda desapareció

## MODIFIED Requirements

### Requirement: Carga y error

El portal SHALL indicar mientras se carga `GET /tenant/calendar`. Si falla la consulta,
SHALL avisarlo sin representar meses vacíos como si se conociera su estado.

#### Scenario: Cargando

- **WHEN** aún no llegó el calendario
- **THEN** el portal indica que está cargando

#### Scenario: La carga falla

- **WHEN** falla la consulta del calendario
- **THEN** el portal avisa que no se pudieron cargar y no da a entender que no hay ninguna

#### Scenario: Falló la consulta del calendario

- **WHEN** no se pudo obtener `coverage` o `invoices`
- **THEN** el portal muestra un error y permite reintentar
- **AND** no clasifica ningún mes como «Antes del contrato», «Sin cuota generada» o
  «Después del contrato»

#### Scenario: No hay cuotas generadas

- **WHEN** `coverage` llegó y `invoices` está vacío
- **THEN** el portal muestra los 12 meses del año correspondiente, distinguiendo los
  meses de vigencia sin cuota de los meses fuera del contrato
