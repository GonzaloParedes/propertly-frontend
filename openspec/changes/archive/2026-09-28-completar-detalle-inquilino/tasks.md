# Tareas

## 1. Datos y edición

- [x] 1.1 Mostrar también el teléfono, que ya viene en la respuesta.
- [x] 1.2 Diálogo de edición con los cinco campos cargados.
- [x] 1.3 Validar documento, correo y teléfono antes de enviar, reutilizando `cuit.ts` y
      `telefono.ts`.
- [x] 1.4 Guardar con `PUT /tenants/{id}` y refrescar la lista.
- [x] 1.5 Traducir los 400 de duplicado, que son los únicos accionables.

## 2. Contrato y acceso

- [x] 2.1 Que el resumen del contrato lleve a su detalle.
- [x] 2.2 «Copiar enlace» en vez de «Administrar», con el enlace real del contrato.
- [x] 2.3 Retirar la frase sobre revocar y regenerar.
- [x] 2.4 Aviso si no se pudo obtener el enlace.

## 3. Archivar

- [x] 3.1 Acción de archivar en el encabezado.
- [x] 3.2 Diálogo con la misma advertencia que el de propiedades.
- [x] 3.3 Llamar a `tenants.archive` y refrescar la lista.
- [x] 3.4 Traducir el error del backend.

## 4. Verificación

- [x] 4.1 Tests de la vista, la edición, el enlace y el archivado.
- [x] 4.2 `npm test`, `npx tsc --noEmit` y `npm run lint`.
- [x] 4.3 Probar contra el backend local.
- [x] 4.4 Actualizar el estado de las pantallas en `docs/design/sistema-ui.md`.
