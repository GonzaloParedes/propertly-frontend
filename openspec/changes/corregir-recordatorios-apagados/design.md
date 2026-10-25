# Design

## Context

La tarjeta de recordatorios en `SettingsView` (`src/components/dashboard/OwnerWorkspace.tsx`)
arma dos bloques a partir de `ReminderSettingsResponse`. La frase de arriba usa
`resumenRecordatorios`, que sí chequea `enabled`. La lista de valores usa
`describirRecordatorios`, que no lo chequea. Ver proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Con `enabled` en falso, la tarjeta no muestra ningún valor de días ni del aviso del día del
  vencimiento.

**Non-Goals:**
- No cambiar el diálogo «Editar recordatorios», que ya oculta los días con el interruptor
  apagado.
- No cambiar la forma de `ReminderSettingsResponse` ni la llamada al backend.

## Decisions

- **Ocultar en la vista, no en la función.** Se renderiza el bloque `<dl>` sólo si
  `reminderSettings.enabled`. Alternativa: que `describirRecordatorios` devuelva «No se avisa»
  en las tres filas cuando está apagado. Se descarta porque la tarjeta ya dice «desactivados»
  arriba, y repetir tres «No se avisa» agrega ruido sin información nueva. El comentario de
  `resumenRecordatorios` ya describe esa intención: no listar días que no se usan.
- **`recordatorios.ts` queda como está.** Sigue describiendo los valores para cualquier
  consumidor que los necesite; la regla de qué mostrar pertenece a la pantalla.
- **Layout de la sección Configuración: sin estirar las tarjetas.** Con los avisos apagados la
  tarjeta de recordatorios es corta, pero la sección usa `owner-detail-grid--even`, que la
  estira a la altura de Cuenta, y `.owner-card>.owner-button` empuja «Editar recordatorios»
  al fondo: queda un hueco vacío entre el texto y el botón. Se quita `--even` sólo de
  `SettingsView`: cada tarjeta toma su alto natural y el botón queda debajo del texto. Se
  descartó tocar la regla CSS global porque otras pantallas dependen de que los botones de
  tarjetas hermanas se alineen al fondo.

## Risks / Trade-offs

- [Un test de la función sigue mirando sólo los valores, no la visibilidad] → el test de la
  pantalla cubre el caso apagado con `queryByText`, que es lo que ve el usuario.

## Open Questions

Ninguna.
