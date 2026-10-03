# Spec Delta

## MODIFIED Requirements

### Requirement: Editar los datos del inquilino

El propietario SHALL poder cambiar nombre, apellido, documento, correo y teléfono. El
sistema SHALL validar el documento, el correo y el teléfono con los mismos criterios que el
alta antes de enviarlos, y SHALL explicar los rechazos que el propietario puede resolver,
reconociéndolos por su identificador estable y no por el texto del mensaje.

#### Scenario: Guardar un cambio

- **WHEN** el propietario corrige el correo y guarda
- **THEN** el cambio queda guardado y la pantalla lo refleja

#### Scenario: Documento inválido

- **WHEN** el documento ingresado no es válido
- **THEN** el sistema lo señala y no deja guardar

#### Scenario: Documento ya usado por otro inquilino

- **WHEN** el backend rechaza el documento por duplicado, por el chequeo previo o por la colisión
  concurrente de unicidad
- **THEN** la pantalla explica que ya figura en otro inquilino suyo, sin importar por cuál de los dos
  caminos se detectó

#### Scenario: Teléfono ya usado por otro inquilino

- **WHEN** el backend rechaza el teléfono por duplicado
- **THEN** la pantalla explica que ese teléfono ya figura en otro inquilino suyo

#### Scenario: Ningún dato puede quedar vacío

- **WHEN** el propietario borra el nombre
- **THEN** el sistema no deja guardar

#### Scenario: Falla al guardar

- **WHEN** el guardado falla
- **THEN** la pantalla lo avisa y conserva lo que el propietario había escrito
