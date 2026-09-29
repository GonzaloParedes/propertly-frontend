# Completar el detalle de inquilino

## Why

Es lo último que le queda al panel del propietario, y arrastra los mismos tres problemas
que ya resolvimos en las otras pantallas: un botón que no hace nada («Editar datos»), otro
que además promete algo falso («Administrar», con el texto «se puede revocar y regenerar
cuando quiera» — la revocación está fuera de alcance y no tiene endpoint), y un resumen de
contrato que no lleva a ningún lado.

Ese último se rindió sin link a propósito: el detalle de contrato salía de datos de ejemplo
y llevar hasta ahí mostraba el contrato de otro. Esa razón desapareció.

Además, archivar quedó a medias: una propiedad se archiva desde su detalle, un inquilino no,
aunque el backend ofrece lo mismo para los dos.

## What Changes

- «Editar datos» edita nombre, apellido, CUIT, correo y teléfono con `PUT /tenants/{id}`,
  con las mismas validaciones que el alta.
- «Administrar» pasa a ser **«Copiar enlace»**, que obtiene el enlace real del contrato
  vigente con `GET /contracts/{id}/tenant-access`, igual que el detalle de contrato.
- **Se retira** «Se puede revocar y regenerar cuando quiera»: no hay endpoint detrás y el
  spec del portal dejó la revocación fuera de alcance.
- El resumen del contrato vigente lleva a su detalle.
- Se puede archivar un inquilino desde su detalle, con la misma advertencia y el mismo
  manejo del 409 que ya tiene la propiedad.

## Capabilities

### New Capabilities

- `detalle-inquilino` — ver y editar los datos de un inquilino, llegar a su contrato,
  compartirle el acceso y sacarlo de las listas conservando su historia.

### Modified Capabilities

Ninguna.

## Impact

- `src/components/dashboard/OwnerWorkspace.tsx` — `TenantDetail`.
- Reutiliza lo que ya existe: las validaciones de `cuit.ts` y `telefono.ts`, el diálogo de
  archivado de propiedades y la obtención del enlace del detalle de contrato.
- Endpoints: `PUT /tenants/{id}`, `POST /tenants/{id}/archive`,
  `GET /contracts/{id}/tenant-access`.
