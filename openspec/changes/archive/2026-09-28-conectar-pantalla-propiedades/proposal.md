# Conectar la pantalla de Propiedades al backend

## Why

Propiedades es la última pantalla grande que sigue dibujándose sobre los arrays de
ejemplo de `OwnerWorkspace.tsx`: lista cinco inmuebles inventados, filtra sobre ellos
y su detalle muestra datos que no existen. El alta ya guarda contra el backend desde
el 17/09/2026, así que hoy un propietario puede cargar una propiedad y no verla.

La rama `codex/frontend-integration-lots` del backend destraba lo que faltaba:
`PropertyResponse` ahora trae `activeContract`, así que el estado de cada fila se
resuelve sin cruzar `/contracts` entero, y existe el archivado real detrás del botón
que hoy no hace nada.

## What Changes

- La lista de propiedades sale de `GET /properties` en vez del array `properties`.
- El chip de estado de cada fila se arma con `activeContract` más las cuotas de ese
  contrato, no con un campo `state` escrito a mano.
- Los filtros por ciudad, dormitorios, extras y estado cuentan sobre datos reales,
  conservando el comportamiento de facetas ya definido en el sistema de UI.
- El detalle de propiedad se arma con la respuesta que ya trajo el listado, e incluye
  el código postal cuando está cargado. Se evaluó pedir `GET /properties/{id}` —así
  estaba planteado al proponer— y se descartó: la lista acaba de cargarse con los
  mismos campos, así que la llamada extra sólo agregaría una espera.
- El botón **Archivar** llama a `POST /properties/{id}/archive`. Hoy no hace nada.
- Las ocho categorías se muestran con su nombre en castellano, incluidas las cuatro
  nuevas (oficina, cochera, terreno, otro).
- **BREAKING** para el prototipo: `/prototipo` conserva sus datos de ejemplo, así que
  la vista pasa a tener dos orígenes según el modo, como ya ocurre en Cobranzas,
  Contratos e Inquilinos.

## Capabilities

### New Capabilities

- `propiedades` — listar, filtrar, ver en detalle y archivar las propiedades del
  propietario.

### Modified Capabilities

Ninguna: es la primera capacidad que se registra en este proyecto.

## Impact

- `src/components/dashboard/OwnerWorkspace.tsx` — `propertiesView` y `propertyDetail`
  dejan de leer `properties`; se suma la carga y el manejo de error que ya usan las
  otras vistas.
- `src/lib/propiedades.ts` (nuevo) — derivación de filas, estado y filtros, siguiendo
  el molde de `cobranzas.ts` y `contratos.ts`: la lógica vive en un módulo testeable
  aparte del componente.
- `src/lib/propiedad.ts` — se amplía con el nombre en castellano de las ocho
  categorías.
- Depende de que el backend despliegue `codex/frontend-integration-lots`. Contra el
  build viejo, `activeContract` viene ausente y la pantalla no puede decir el estado.
