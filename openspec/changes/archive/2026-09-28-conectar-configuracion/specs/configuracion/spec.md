# configuracion

## Purpose

Dejar que el propietario vea y ajuste las dos únicas cosas que configura en la app: cuándo
se le avisa a su inquilino sobre las cuotas, y sus propios datos de cuenta.

## ADDED Requirements

### Requirement: Ver los recordatorios vigentes

La pantalla SHALL mostrar la configuración de recordatorios que el sistema aplica hoy:
cuántos días antes del vencimiento se avisa, si se avisa el mismo día, cuántos días después
y si los avisos están activos. SHALL describir qué avisos recibe el inquilino sin prometer
ninguno que el sistema no envíe.

#### Scenario: Configuración cargada

- **WHEN** el propietario abre Configuración
- **THEN** ve los días antes, el aviso del día del vencimiento y los días después

#### Scenario: Recordatorios apagados

- **WHEN** los recordatorios están desactivados
- **THEN** la pantalla lo dice claramente, en vez de mostrar los días como si se enviaran

#### Scenario: El aviso de cuota confirmada se nombra

- **WHEN** el propietario lee la tarjeta de recordatorios
- **THEN** entiende que al inquilino también se le avisa cuando una cuota queda confirmada y puede pagarla

#### Scenario: No se pudo cargar

- **WHEN** la configuración no se puede obtener
- **THEN** la pantalla lo avisa y no muestra valores inventados

### Requirement: Editar los recordatorios

El propietario SHALL poder cambiar los días de anticipación, los días posteriores, el aviso
del día del vencimiento y el interruptor general. Los valores SHALL respetar los límites que
el backend acepta, y el sistema SHALL confirmar cuando quedaron guardados.

#### Scenario: Guardar un cambio

- **WHEN** el propietario cambia los días de anticipación y guarda
- **THEN** la configuración queda guardada y la pantalla lo confirma

#### Scenario: Apagar todos los avisos

- **WHEN** el propietario desactiva los recordatorios
- **THEN** queda guardado y la pantalla refleja que no se enviarán

#### Scenario: Valor fuera de rango

- **WHEN** el propietario intenta poner más días de los permitidos
- **THEN** el sistema no lo deja, en vez de dejarlo guardar y recibir un rechazo

#### Scenario: Falla al guardar

- **WHEN** el guardado falla
- **THEN** la pantalla lo avisa y conserva lo que el propietario había escrito

#### Scenario: Cancelar sin guardar

- **WHEN** el propietario edita y cancela
- **THEN** la configuración vuelve a como estaba

### Requirement: Datos de la cuenta

La pantalla SHALL mostrar el nombre, el correo, el CUIT y el teléfono del propietario.
SHALL NOT mostrar preferencias que no existan como dato de la cuenta.

#### Scenario: Cuenta con todos sus datos

- **WHEN** el propietario abre Configuración
- **THEN** ve su nombre, correo, CUIT y teléfono

#### Scenario: El correo no se edita desde acá

- **WHEN** el propietario edita sus datos
- **THEN** el correo se muestra pero no se puede cambiar

### Requirement: Editar los datos de la cuenta

El propietario SHALL poder cambiar su nombre, apellido, CUIT y teléfono. El sistema SHALL
validar el CUIT y el teléfono con los mismos criterios que el registro antes de enviarlos, y
SHALL enviar siempre el conjunto completo de datos.

#### Scenario: Guardar un cambio de teléfono

- **WHEN** el propietario cambia sólo su teléfono y guarda
- **THEN** se envían también su nombre, apellido y CUIT, y el cambio queda guardado

#### Scenario: CUIT inválido

- **WHEN** el CUIT ingresado no es válido
- **THEN** el sistema lo señala y no deja guardar

#### Scenario: Teléfono con formato que el backend deforma

- **WHEN** el teléfono se escribe con el cero de la característica
- **THEN** el sistema lo señala antes de enviarlo

#### Scenario: Ningún campo puede quedar vacío

- **WHEN** el propietario borra su nombre
- **THEN** el sistema no deja guardar

#### Scenario: Falla al guardar

- **WHEN** el guardado falla
- **THEN** la pantalla lo avisa y conserva lo que el propietario había escrito
