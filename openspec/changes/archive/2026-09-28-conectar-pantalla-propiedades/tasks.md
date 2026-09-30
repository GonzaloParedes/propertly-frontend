# Tareas

## 1. Nombres de las categorías

- [x] 1.1 Ampliar `src/lib/propiedad.ts` con el nombre en castellano de las ocho
      categorías (departamento, casa, PH, local comercial, oficina, cochera, terreno,
      otro) y sus tests.
- [x] 1.2 Ofrecer las ocho en el paso de tipo del asistente, que hoy ofrece cuatro.

## 2. Derivación, en un módulo aparte

- [x] 2.1 Crear `src/lib/propiedades.ts` con `FilaPropiedad` y `buildFilasPropiedad`,
      que cruza propiedades con cuotas y resuelve el estado de cada fila.
- [x] 2.2 Resolver el estado: «Sin alquilar» sin `activeContract`; con contrato,
      «Pago a confirmar» gana sobre «Vencida», y «Al día» es el resto.
- [x] 2.3 `filtrarPropiedades` y `contarFacetas`, conservando el conteo sobre el resto
      de los filtros aplicados.
- [x] 2.4 `resumenPropiedades` para la bajada del encabezado.
- [x] 2.5 Tests de las cuatro, incluido el caso de `activeContract` ausente en todas.

## 3. La vista

- [x] 3.1 Cargar `GET /properties` y `GET /invoices?periodFrom=` en paralelo, con el
      mismo patrón de estado de carga y error que Cobranzas.
- [x] 3.2 Reemplazar el array `properties` en `propertiesView`.
- [x] 3.3 Estados de carga, error, lista vacía y sin resultados de filtro.
- [x] 3.4 Omitir los chips cuando ninguna propiedad trae `activeContract` y hay
      contratos vigentes.
- [x] 3.5 Que `/prototipo` siga usando los datos de ejemplo.

## 4. El detalle

- [x] 4.1 `propertyDetail` sale de la propiedad cargada, no de `selectedProperty`.
- [x] 4.2 Mostrar código postal y características sólo cuando están.
- [x] 4.3 Que la fila lleve al detalle, ahora que los dos son datos reales.

## 5. Archivar

- [x] 5.1 Diálogo de confirmación que diga que la propiedad sale de las listas y que su
      historia se conserva.
- [x] 5.2 Llamar a `properties.archive` y sacarla de la lista al volver.
- [x] 5.3 Traducir el error del backend a un mensaje accionable.
- [x] 5.4 Tests de los tres casos.

## 6. Verificación

- [x] 6.1 `npm test`, `npx tsc --noEmit` y `npm run lint`.
- [x] 6.2 Abrir la pantalla contra el backend local con la rama desplegada.
- [x] 6.3 Actualizar el estado de las pantallas en `docs/design/sistema-ui.md`.
