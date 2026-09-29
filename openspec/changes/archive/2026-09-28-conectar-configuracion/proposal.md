# Conectar la pantalla de Configuración al backend

## Why

Configuración es la última pantalla del panel que queda sin conectar, y la que más tiempo
estuvo prometiendo algo que no existía: «los inquilinos reciben recordatorios por correo»
era falso desde que se dibujó. Sus dos botones tampoco hacen nada, y la tarjeta Cuenta
afirma una «moneda operativa» que no es un dato de la cuenta en ningún lado.

Eso cambió: el backend ya manda los cuatro avisos —cuota confirmada, por vencer, el día del
vencimiento y vencida—, respeta las preferencias del propietario y las expone en
`GET`/`PUT /users/me/reminder-settings`. La promesa de la pantalla pasó a ser cierta, y
ahora se puede editar.

## What Changes

- Los recordatorios salen de `GET /users/me/reminder-settings` en vez de estar escritos.
- «Editar recordatorios» los guarda con `PUT`, incluido el interruptor general que permite
  apagarlos del todo.
- El texto de la tarjeta menciona también el aviso de cuota confirmada, que es el que le
  dice al inquilino que ya puede pagar. Hoy no se nombra y es el más importante de los
  cuatro.
- «Editar datos» edita nombre, apellido, CUIT y teléfono con `PUT /users/me`, reenviando
  siempre el objeto completo porque es un reemplazo total.
- La tarjeta Cuenta muestra además el CUIT y el teléfono, que ya vienen en la sesión.
- **Se retira** «Moneda operativa: Pesos argentinos (ARS)». No existe como preferencia del
  usuario: la moneda es del contrato, no de la cuenta.

## Capabilities

### New Capabilities

- `configuracion` — ver y editar las preferencias de recordatorios y los datos de la cuenta
  del propietario.

### Modified Capabilities

Ninguna.

## Impact

- `src/components/dashboard/OwnerWorkspace.tsx` — `settingsView` deja de ser estática.
- `src/lib/recordatorios.ts` (nuevo) — cómo se dice cada preferencia en pantalla.
- La edición de datos reutiliza las validaciones que ya existen: `cuit.ts` y `telefono.ts`,
  las mismas del registro y del alta de inquilino.
- Depende del deploy de `codex/frontend-integration-lots`.
