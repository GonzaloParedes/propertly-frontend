# Proposal

## Why

Con el interruptor general «Enviar recordatorios» apagado, la tarjeta «Recordatorios de pago»
de Configuración dice arriba que los recordatorios están desactivados y, debajo, lista igual
los tres valores («7 días», «Se avisa», «3 días»). El propietario lee una contradicción y
no sabe si el inquilino va a recibir avisos. La causa es que la lista se arma sin mirar el
interruptor: `describirRecordatorios` ignora `enabled`, y sólo la frase de arriba lo mira.

## What Changes

- Con el interruptor general apagado, la tarjeta deja de listar los tres valores de días y
  muestra sólo la frase de que los recordatorios están desactivados.
- Con el interruptor encendido, la tarjeta no cambia.
- El diálogo «Editar recordatorios» no cambia: ya oculta los días cuando el interruptor está
  apagado.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `configuracion`: el requisito de la tarjeta de recordatorios pasa a exigir que, con los
  avisos apagados, no se muestren valores de días.

## Impact

- `src/components/dashboard/OwnerWorkspace.tsx` (`SettingsView`): la lista de valores se
  renderiza sólo si `enabled` es verdadero.
- `src/lib/recordatorios.ts`: sin cambios. `describirRecordatorios` sigue devolviendo los tres
  valores; la decisión de no mostrarlos queda en la vista.
- `src/tests/components/dashboard/owner-workspace-configuracion.test.tsx`: el test de
  «apagados» pasa a verificar también que no aparezcan los valores de días.
- Sin impacto en backend ni en API.
