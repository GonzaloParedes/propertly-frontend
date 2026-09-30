# detalle-inquilino Specification

## Purpose
Darle al propietario todo lo que necesita sobre una persona a la que le alquila: sus datos
de contacto, el contrato que los vincula, el acceso para que suba comprobantes, y la
posibilidad de sacarlo de las listas cuando deja de ser inquilino.

## Requirements

### Requirement: Datos del inquilino

La pantalla SHALL mostrar el nombre, el documento, el correo y el teléfono del inquilino.

#### Scenario: Inquilino cargado

- **WHEN** el propietario abre un inquilino
- **THEN** ve su nombre, documento, correo y teléfono

#### Scenario: Todavía no llegaron los datos

- **WHEN** el inquilino aún no se cargó
- **THEN** la pantalla lo indica en vez de mostrar campos vacíos

### Requirement: Editar los datos del inquilino

El propietario SHALL poder cambiar nombre, apellido, documento, correo y teléfono. El
sistema SHALL validar el documento, el correo y el teléfono con los mismos criterios que el
alta antes de enviarlos, y SHALL explicar los rechazos que el propietario puede resolver.

#### Scenario: Guardar un cambio

- **WHEN** el propietario corrige el correo y guarda
- **THEN** el cambio queda guardado y la pantalla lo refleja

#### Scenario: Documento inválido

- **WHEN** el documento ingresado no es válido
- **THEN** el sistema lo señala y no deja guardar

#### Scenario: Documento ya usado por otro inquilino

- **WHEN** el backend rechaza el documento por duplicado
- **THEN** la pantalla explica que ya figura en otro inquilino suyo

#### Scenario: Ningún dato puede quedar vacío

- **WHEN** el propietario borra el nombre
- **THEN** el sistema no deja guardar

#### Scenario: Falla al guardar

- **WHEN** el guardado falla
- **THEN** la pantalla lo avisa y conserva lo que el propietario había escrito

### Requirement: Contrato del inquilino

La pantalla SHALL mostrar el contrato vigente del inquilino y SHALL permitir ir a su
detalle. Cuando no tenga contrato, SHALL ofrecer crearlo.

#### Scenario: Inquilino con contrato

- **WHEN** el inquilino tiene un contrato vigente
- **THEN** la pantalla lo resume y lleva a su detalle

#### Scenario: Inquilino sin contrato

- **WHEN** el inquilino no tiene contrato
- **THEN** la pantalla lo dice y ofrece crear uno

### Requirement: Acceso del inquilino

Cuando el inquilino tenga un contrato vigente, el propietario SHALL poder obtener su enlace
de acceso para compartirlo. La pantalla SHALL NOT ofrecer acciones sobre el enlace que el
sistema no pueda hacer, ni afirmar una vigencia que no pueda sostener.

#### Scenario: Copiar el enlace

- **WHEN** el propietario pide el enlace
- **THEN** el sistema lo obtiene y queda copiado

#### Scenario: No se pudo obtener

- **WHEN** la consulta falla
- **THEN** la pantalla lo avisa y no deja creer que se copió algo

#### Scenario: Sin contrato no hay acceso

- **WHEN** el inquilino no tiene contrato vigente
- **THEN** la pantalla no muestra la sección de acceso

#### Scenario: No se prometen acciones inexistentes

- **WHEN** el propietario lee la sección de acceso
- **THEN** no se le ofrece revocar ni regenerar el enlace

### Requirement: Archivar un inquilino

El propietario SHALL poder archivar un inquilino desde su detalle. Archivar SHALL sacarlo de
las listas conservando su historia. El sistema SHALL confirmar antes, y SHALL explicar el
motivo cuando el backend lo rechace.

#### Scenario: Archivar un inquilino sin contrato

- **WHEN** el propietario archiva un inquilino y el backend lo acepta
- **THEN** deja de aparecer en el listado

#### Scenario: El backend lo rechaza

- **WHEN** el backend responde con un error al archivar
- **THEN** la pantalla explica que no se pudo y el inquilino sigue en la lista

#### Scenario: Archivar no es eliminar

- **WHEN** el propietario abre el diálogo de archivado
- **THEN** el texto aclara que su historia se conserva
