# manejo-de-errores Specification

## Purpose

Define cómo el frontend interpreta los errores que devuelve el backend: por un identificador estable y
máquina-legible en vez del texto del mensaje, con copy en español por identificador, un fallback genérico
en español, y los errores por-campo disponibles para validación inline.

## Requirements

### Requirement: Distinguir errores por identificador estable

El frontend SHALL decidir qué error mostrar a partir del identificador estable `type` que acompaña a la
respuesta de error del backend, y SHALL NOT decidirlo comparando el texto del mensaje. El status HTTP SHALL
usarse sólo como respaldo cuando no hay `type`, nunca para distinguir entre condiciones de negocio que
comparten status.

#### Scenario: Se decide por el identificador, no por el texto

- **WHEN** el backend rechaza una acción con un `type` conocido
- **THEN** la pantalla muestra el aviso correspondiente a ese `type`
- **AND** el aviso no cambia si el texto del mensaje del backend cambia

#### Scenario: Dos condiciones con el mismo status se distinguen

- **WHEN** dos rechazos distintos llegan ambos con el mismo status HTTP pero distinto `type`
- **THEN** cada uno muestra su propio aviso

### Requirement: Copy en español por identificador con fallback

El frontend SHALL mostrar un copy en español asociado a cada `type` conocido, y SHALL mostrar un fallback
genérico en español cuando el `type` es desconocido o ausente. El frontend SHALL NOT mostrar nunca el
`detail` ni el `title` crudos del backend (están en inglés).

#### Scenario: Identificador conocido

- **WHEN** el error trae un `type` que el frontend conoce
- **THEN** se muestra el copy en español de ese `type`

#### Scenario: Identificador desconocido

- **WHEN** el error trae un `type` que el frontend no conoce, o no trae `type`
- **THEN** se muestra un mensaje genérico en español, nunca el texto en inglés del backend

#### Scenario: Copy adaptado a la pantalla

- **WHEN** una pantalla necesita un texto distinto para un mismo `type` (p. ej. un documento duplicado
  dicho desde el alta de inquilino vs. desde el registro)
- **THEN** la pantalla puede sobrescribir el copy de ese `type` sin cambiar el del resto

### Requirement: La misma condición produce el mismo aviso

El frontend SHALL mostrar el mismo aviso para una misma condición de negocio sin importar por qué camino
o con qué status la detectó el backend.

#### Scenario: Duplicado detectado por colisión concurrente

- **WHEN** un documento o teléfono duplicado se rechaza por la colisión de unicidad en la base (camino
  concurrente) en vez de por el chequeo previo
- **THEN** la pantalla muestra el mismo aviso de "ya existe" que cuando lo detecta el chequeo previo, y no
  cae al mensaje genérico

### Requirement: Errores por campo para validación inline

Cuando el backend devuelve errores por-campo (la extensión `errors` del cuerpo RFC 9457), el frontend SHALL
exponerlos de modo que un formulario pueda mostrar cada error junto a su campo en vez de en un único aviso
general.

#### Scenario: Rechazo por-campo en un formulario

- **WHEN** el backend rechaza un envío con errores asociados a campos concretos
- **THEN** el formulario puede mostrar cada mensaje junto a su campo

#### Scenario: Sin errores por campo

- **WHEN** el error no trae errores por-campo
- **THEN** el formulario muestra el aviso general sin romperse
