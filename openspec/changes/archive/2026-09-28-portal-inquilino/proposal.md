# Portal del inquilino

## Why

El backend le manda un mail al inquilino cada vez que se crea un contrato y cada vez que
se generan cuotas, con un enlace a `{FRONTEND_URL}/tenant-portal?token=...`. Esa ruta no
existe en nuestra app: hoy un inquilino que hace click recibe el 404 de Next.js. No es un
caso raro — pasa todos los meses con cada inquilino activo del sistema.

Dos cosas que bloqueaban construirlo ya están resueltas y verificadas contra el backend:
el enlace ya no vence a fin de mes (S-1, el token no lleva `exp`) y el inquilino sigue
viendo su historial después de que el contrato termina (S-2, `getForTenantAccess` ya no
filtra por `ACTIVE`). Las reglas de producto —cómo se muestra una cuota sin confirmar,
qué pasa cuando el pago espera aprobación— ya están decididas en `sistema-ui.md` desde el
17/09/2026, antes incluso de que el backend estuviera listo.

El cliente HTTP (`AlquiaBackendClient.tenantAuth` y `.tenantPortal`) ya existe y no lo usa
nadie.

## What Changes

- Nueva ruta `/tenant-portal`, pública (sin pasar por el login del propietario), que
  canjea el `token` de la query por una sesión de inquilino.
- Una vez autenticado, el inquilino ve sus cuotas: período, vencimiento, monto y estado.
- Una cuota confirmada y vencida o por vencer ofrece subir un comprobante.
- Una cuota **sin confirmar** muestra el importe con la aclaración de que el propietario
  todavía no lo cerró y puede cambiar, sin ofrecer subir nada — regla ya decidida.
- Un pago cargado se puede ver: su estado (esperando confirmación / confirmado /
  rechazado) y su comprobante.
- Token inválido, vencido o de un contrato ya no reconocible: mensaje claro, sin
  exponer detalles del error.
- **BREAKING**: ninguno. Es superficie nueva, no toca el panel del propietario.

## Capabilities

### New Capabilities

- `portal-inquilino` — la sesión pasiva del inquilino (sin cuenta, sin contraseña), su
  lectura de cuotas y pagos, y la carga de comprobantes.

### Modified Capabilities

Ninguna.

## Impact

- `src/app/tenant-portal/` (nuevo) — página y layout, fuera del árbol `dashboard/`
  porque usa una cookie y una sesión distintas (`tenant_access_token`, no la del
  propietario).
- `src/lib/portal-inquilino.ts` (nuevo) — derivación de las filas de cuota para el
  inquilino: mismo criterio de estado que `cobranzas.ts`, pero sin las acciones del
  propietario.
- `src/lib/backend-client.ts` — `tenantAuth` y `tenantPortal` pasan de no usarse a ser el
  corazón de esta pantalla; no cambian de forma.
- Depende del deploy de `codex/frontend-integration-lots` (S-1, S-2, y los filtros de
  `/invoices` que ya usa el resto del panel no aplican acá — el endpoint del inquilino no
  los necesita, devuelve todo su historial).
