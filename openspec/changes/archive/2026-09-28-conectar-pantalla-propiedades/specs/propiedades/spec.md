# propiedades

## Purpose

Permitir que el propietario vea su cartera de inmuebles, entienda de un vistazo cuál
está alquilado y cuál necesita atención, encuentre uno entre muchos, y saque de la
lista los que ya no gestiona sin perder su historia.

## ADDED Requirements

### Requirement: Listado de las propiedades del propietario

La pantalla SHALL mostrar las propiedades del propietario autenticado, excluyendo las
archivadas. Mientras la carga está en curso SHALL indicarlo, y si falla SHALL decir
que no se pudieron cargar en vez de mostrar una lista vacía.

#### Scenario: El propietario tiene propiedades

- **WHEN** el propietario abre Propiedades y la carga resuelve con tres inmuebles
- **THEN** la pantalla muestra las tres filas con su dirección y su ciudad

#### Scenario: Todavía no cargó ninguna

- **WHEN** la carga resuelve sin propiedades
- **THEN** la pantalla explica que todavía no cargó ninguna y ofrece agregar la primera

#### Scenario: La carga falla

- **WHEN** la carga falla por un error de red o del servidor
- **THEN** la pantalla avisa que no se pudieron cargar las propiedades
- **AND** no muestra el estado de «todavía no cargó ninguna», que sería falso

#### Scenario: Una propiedad archivada no aparece

- **WHEN** una de las propiedades del propietario está archivada
- **THEN** no figura en el listado

### Requirement: Estado de cada propiedad

Cada fila SHALL mostrar un estado que distinga una propiedad sin contrato vigente de
una alquilada, y en las alquiladas SHALL reflejar la situación de cobranza de su
contrato. El estado SHALL comunicarse con texto e ícono, nunca sólo con color.

#### Scenario: Propiedad sin contrato vigente

- **WHEN** la propiedad no tiene contrato vigente
- **THEN** su estado es «Sin alquilar»
- **AND** la fila no muestra un monto de alquiler

#### Scenario: Propiedad alquilada y al día

- **WHEN** la propiedad tiene contrato vigente y ninguna cuota vencida ni pago esperando confirmación
- **THEN** su estado es «Al día»
- **AND** la fila muestra el alquiler vigente de ese contrato

#### Scenario: Propiedad con una cuota vencida

- **WHEN** el contrato vigente de la propiedad tiene al menos una cuota vencida
- **THEN** su estado es «Vencida»

#### Scenario: Propiedad con un pago esperando confirmación

- **WHEN** el contrato vigente tiene un pago cargado por el inquilino sin resolver
- **THEN** su estado es «Pago a confirmar»
- **AND** ese estado gana sobre «Vencida», porque lo que falta es una acción del propietario

### Requirement: Búsqueda y filtros

La pantalla SHALL permitir acotar la lista por texto, ciudad, cantidad de dormitorios,
características y situación de alquiler. Los contadores de cada faceta SHALL calcularse
sobre el resto de los filtros ya aplicados, y SHALL poder limpiarse todo de una vez.

#### Scenario: Buscar por dirección o inquilino

- **WHEN** el propietario escribe parte de una dirección, una ciudad o el nombre de un inquilino
- **THEN** la lista queda acotada a las propiedades que coinciden

#### Scenario: Filtrar por situación de alquiler

- **WHEN** el propietario elige «Sin alquilar»
- **THEN** la lista muestra sólo las propiedades sin contrato vigente

#### Scenario: Ningún resultado

- **WHEN** la combinación de filtros no deja ninguna propiedad
- **THEN** la pantalla lo dice y ofrece limpiar los filtros

### Requirement: Detalle de una propiedad

El detalle SHALL mostrar la dirección completa, la categoría en castellano y las
características cargadas. SHALL omitir los datos que la propiedad no tiene en vez de
mostrar un hueco o un valor inventado.

#### Scenario: Propiedad con todos sus datos

- **WHEN** el propietario abre una propiedad que tiene código postal, dormitorios, baños y superficie
- **THEN** el detalle los muestra todos

#### Scenario: Propiedad cargada sin características

- **WHEN** la propiedad se cargó salteando el paso de características
- **THEN** el detalle no muestra esas filas, en vez de mostrarlas en cero

#### Scenario: Categoría nueva

- **WHEN** la propiedad es de categoría oficina, cochera, terreno u otro
- **THEN** el detalle la nombra en castellano

#### Scenario: Propiedad alquilada

- **WHEN** la propiedad tiene contrato vigente
- **THEN** el detalle ofrece ir a ese contrato

### Requirement: Archivar una propiedad

El propietario SHALL poder archivar una propiedad desde su detalle. Archivar SHALL
sacarla de los listados conservando su historia, y SHALL poder deshacerse. El sistema
SHALL confirmar antes de archivar, y SHALL explicar el motivo cuando el backend lo
rechace.

#### Scenario: Archivar una propiedad sin contrato

- **WHEN** el propietario archiva una propiedad y el backend lo acepta
- **THEN** la propiedad deja de aparecer en el listado
- **AND** la pantalla confirma que quedó archivada

#### Scenario: El backend rechaza el archivado

- **WHEN** el backend responde con un error al archivar
- **THEN** la pantalla explica que no se pudo archivar y la propiedad sigue en la lista

#### Scenario: Archivar no es eliminar

- **WHEN** el propietario abre el diálogo de archivado
- **THEN** el texto aclara que la propiedad sale de las listas y que su historia se conserva
