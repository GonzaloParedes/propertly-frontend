## MODIFIED Requirements

### Requirement: Ver los recordatorios vigentes

La pantalla SHALL mostrar la configuración de recordatorios que el sistema aplica hoy:
cuántos días antes del vencimiento se avisa, si se avisa el mismo día, cuántos días después
y si los avisos están activos. SHALL describir qué avisos recibe el inquilino sin prometer
ninguno que el sistema no envíe. Cuando los avisos están desactivados, la pantalla SHALL
decirlo y SHALL NOT mostrar ningún valor de días ni de aviso del día del vencimiento.

#### Scenario: Configuración cargada

- **WHEN** el propietario abre Configuración con los avisos activos
- **THEN** ve los días antes, el aviso del día del vencimiento y los días después

#### Scenario: Recordatorios apagados

- **WHEN** los recordatorios están desactivados
- **THEN** la pantalla dice que están desactivados y no muestra «7 días», «Se avisa» ni «3 días» ni ningún otro valor de días

#### Scenario: Recordatorios apagados con días configurados

- **GIVEN** el interruptor general está apagado y los días guardados son 7 antes y 3 después
- **WHEN** el propietario abre Configuración
- **THEN** la tarjeta muestra sólo la frase de desactivados, sin los tres valores

#### Scenario: El aviso de cuota confirmada se nombra

- **WHEN** el propietario lee la tarjeta de recordatorios
- **THEN** entiende que al inquilino también se le avisa cuando una cuota queda confirmada y puede pagarla

#### Scenario: No se pudo cargar

- **WHEN** la configuración no se puede obtener
- **THEN** la pantalla lo avisa y no muestra valores inventados
