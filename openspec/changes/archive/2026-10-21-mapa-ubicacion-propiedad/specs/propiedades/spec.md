# propiedades Spec Delta

## ADDED Requirements

### Requirement: La ubicación de una propiedad se confirma en un mapa

Al cargar o editar una propiedad, la pantalla SHALL mostrar un mapa interactivo donde el
propietario ve, verifica y corrige la ubicación del inmueble, y SHALL impedir guardar la propiedad
mientras no haya un par de coordenadas (`latitude`/`longitude`) confirmado. Al guardar, el par
confirmado SHALL viajar en `PropertyRequest`. El propietario SHALL poder corregir la ubicación
arrastrando el pin o tocando el mapa.

Cuando la dirección se eligió de una sugerencia que trajo coordenadas (GeoRef), el mapa SHALL
abrirse centrado en ese punto con el pin puesto, para verificar. Cuando la dirección se tipeó a mano
o la sugerencia no trajo punto, el mapa SHALL abrirse en el centro de Argentina sin pin y SHALL
requerir que el propietario marque la ubicación tocando el mapa.

#### Scenario: Verificar la ubicación que trajo la sugerencia

- **WHEN** el propietario elige una dirección sugerida que vino con coordenadas
- **THEN** el mapa aparece centrado en ese punto con el pin puesto
- **AND** la propiedad puede guardarse con esas coordenadas sin tocar el mapa

#### Scenario: Corregir el pin arrastrándolo

- **WHEN** el propietario arrastra el pin a otro punto del mapa
- **THEN** la propiedad queda con las coordenadas del nuevo punto

#### Scenario: Dirección tipeada a mano, sin coordenadas de origen

- **WHEN** el propietario carga una dirección a mano y no hay coordenadas
- **THEN** el mapa aparece en el centro de Argentina sin pin
- **AND** no se puede avanzar ni guardar la propiedad hasta marcar la ubicación en el mapa

#### Scenario: Marcar la ubicación tocando el mapa

- **WHEN** el propietario toca un punto del mapa sin pin previo
- **THEN** el pin queda en ese punto y la propiedad toma esas coordenadas
- **AND** la propiedad ya puede guardarse
