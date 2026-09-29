# Conectar el detalle de contrato al backend

## Why

Es la última pantalla grande con datos de ejemplo, y la que más botones muertos tiene:
«Copiar enlace» no copia nada, «Descargar» no descarga, «Adjuntar» no adjunta y
«Finalizar contrato» no finaliza. La fila de Contratos ni siquiera lleva hasta acá —se
rinde sin link a propósito, porque llevar a un detalle de ejemplo mostraría el contrato de
otro.

Todo lo que la bloqueaba llegó con `codex/frontend-integration-lots`: el enlace del
inquilino se puede pedir sin reenviar el mail, la próxima actualización la calcula el
backend, el documento trae su fecha de carga, y existen el historial de aumentos y los
términos comerciales que el contrato ya guarda y nadie muestra.

## What Changes

- El detalle sale de `GET /contracts/{id}`: alquiler vigente, estado, plazo y fechas.
- La línea de tiempo usa `nextIncrementDate` y `nextIncrementRent` en vez de calcularlos.
  Recalcularlos en el front daría una fecha distinta de la que el backend usa en cuanto el
  contrato haya tenido una renegociación.
- Tarjeta nueva con las condiciones comerciales que el contrato ya guarda y nunca se
  mostraron: moneda, depósito, comisión, punitorios, renovación y preaviso.
- Tarjeta nueva con el historial de aumentos (`GET /contracts/{id}/rent-increments`).
- «Copiar enlace» copia el enlace real, obtenido con `GET /contracts/{id}/tenant-access`.
- El documento firmado se descarga, se adjunta y se quita de verdad, con su fecha de carga.
- «Finalizar contrato» llama a `POST /contracts/{id}/terminate`, avisando antes de qué se
  lleva puesto.
- La fila de Contratos pasa a llevar al detalle, ahora que los dos son datos reales.
- **Se retira** del encabezado el texto «Activo hasta que finalice este contrato» sobre el
  enlace: hoy el token vence a fin de mes (S-1), así que esa frase es falsa.

## Capabilities

### New Capabilities

- `detalle-contrato` — ver un contrato completo, compartir el acceso del inquilino,
  gestionar su documento firmado y darlo por terminado.

### Modified Capabilities

Ninguna. `propiedades` e `inicio` no cambian de comportamiento; sólo se habilita la
navegación desde la lista de contratos, que no es una capacidad registrada.

## Impact

- `src/components/dashboard/OwnerWorkspace.tsx` — `ContractDetail` deja de leer los arrays
  de ejemplo; `contractsView` habilita el link de la fila.
- `src/lib/contrato-detalle.ts` (nuevo) — condiciones comerciales y aumentos en texto,
  siguiendo el molde de los otros módulos.
- Endpoints: `GET /contracts/{id}`, `/rent-increments`, `/tenant-access`, el documento en
  sus tres verbos, y `POST /contracts/{id}/terminate`.
- Depende del deploy de `codex/frontend-integration-lots`.

## Out of Scope

- **«Cambiar condiciones».** Son dos flujos distintos —ajustar una cuota puntual
  (`/invoices/{id}/adjustments`) y cambiar las condiciones a futuro
  (`/invoices/{id}/schema-change`)— con su propia elección de qué cuota mandar y su propio
  cálculo de delta. Entra en su cambio; hasta entonces el botón se retira en vez de quedar
  muerto.
