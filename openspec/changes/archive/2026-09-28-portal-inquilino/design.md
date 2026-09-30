# Diseño

## Context

Es la primera pantalla para alguien que no es el propietario. No comparte sesión, no
comparte layout y no comparte casi ninguna de las decisiones ya tomadas para
`OwnerWorkspace` — el inquilino no tiene cuenta, no navega entre secciones, y sólo puede
mirar y subir un archivo.

Verificado contra el backend el 28/09/2026: el token del enlace ya no vence (S-1, sin
`exp`), el `GET /contracts/{id}/tenant-access` sigue funcionando después de terminar el
contrato (S-2), y subir un comprobante sobre un contrato no vigente sigue rechazado con
400. Los tres puntos del spec que bloqueaban el portal ya no bloquean nada.

## Goals / Non-Goals

**Goals**

- Que abrir el enlace del mail funcione, siempre — es el caso que hoy da 404.
- Que las reglas ya decididas (`sistema-ui.md`, punto 5) se vean tal cual se escribieron.
- Que la sesión del inquilino no dependa ni interfiera con la del propietario.

**Non-Goals**

- Login del inquilino con usuario y contraseña. El spec del backend lo excluye a propósito.
- Cerrar sesión. Mismo motivo — no hay flujo de logout definido del lado del backend.
- Ver el contrato, el documento firmado o los datos de la propiedad. El spec del portal
  limita la vista a pagos: nada de eso viene en `GET /tenant/invoices`.
- Notificaciones dentro del portal cuando el propietario confirma o rechaza. Eso ya lo
  cubre el mail que el backend manda (`InvoiceNotificationService`).

## Decisions

### Ruta fuera de `dashboard/`, sesión propia

`/tenant-portal` vive en `src/app/tenant-portal/`, no bajo `dashboard/`. Comparte muy poco
con esa parte del árbol: no hay `DashboardNav`, no hay `useAuth` del propietario, y la
cookie es otra (`tenant_access_token` contra `access_token`/`refresh_token`). Meterlo bajo
`dashboard/` habría significado esquivar su `layout.tsx`, que redirige a `/login` sin
sesión de propietario — exactamente lo que no tiene que pasarle al inquilino.

No hay contexto de autenticación compartido. El estado de sesión vive en el propio
componente de página: no hace falta un `TenantAuthProvider` para una sola pantalla sin
sub-rutas.

### El token de la URL se canjea una vez; después manda la cookie

Al cargar, si la URL trae `?token=`, la página llama a `tenantAuth.session` con ese
token — es lo que deja la cookie puesta. Si no trae token (una visita posterior, con la
cookie ya presente), se salta ese paso y va directo a pedir las cuotas.

Un `401` en cualquiera de los dos casos termina en la misma pantalla: «este enlace no
funciona». No se distingue «token inválido» de «sin sesión y sin token» — el backend ya
responde así a propósito (`{"message":"Invalid or expired access link","status":401}`,
verificado en vivo), y replicar esa ambigüedad del lado del cliente es correcto: no hay
que decirle al inquilino más de lo que el propio enlace revela.

### El estado de la cuota reutiliza el criterio de `cobranzas.ts`, sin sus acciones

`estadoDeCuota` ya resuelve «Vencida» / «A vencer» / «Pagada» / «Pago a confirmar» desde
un `InvoiceResponse`. El portal lo reutiliza tal cual: es la misma cuota, vista desde el
otro lado, y el criterio no puede divergir entre las dos pantallas sin que en algún
momento el propietario y el inquilino vean estados distintos de la misma cuota.

Lo que no se reutiliza son las acciones: `AccionCuota` (confirmar, revisar, registrar) es
vocabulario del propietario. El inquilino tiene una acción propia —subir comprobante— que
sólo aplica cuando la cuota está confirmada y no tiene un pago activo.

### La cuota sin confirmar no ofrece subir nada

Ya decidido en `sistema-ui.md` antes de que el backend estuviera listo: se muestra el
importe con la aclaración de que puede cambiar, y no hay botón de subir. El backend lo
refuerza (`Cannot submit a payment for an unconfirmed invoice`), pero la razón de
producto es anterior al rechazo técnico: mostrar un botón que va a fallar con un 400 es
peor que no mostrarlo.

### Después de rechazado, se puede volver a subir

El backend excluye `REJECTED` al chequear si ya hay un pago activo — confirmado en el
código: sólo bloquea un pago nuevo si hay uno `AWAITING_CONFIRMATION` o `CONFIRMED`. Así
que una cuota con el último pago rechazado vuelve a ofrecer «Subir comprobante», con el
motivo del rechazo visible arriba para que el inquilino sepa qué corregir.

### CSS propio, mismos tokens

Nueva hoja de estilos con prefijo `tenant-*`, importada desde `globals.css` igual que
`OwnerWorkspace.css`. Usa las mismas variables de marca (`--primary`, `--esp-*`, etc.):
es la misma identidad visual, una pantalla más simple.

## Risks / Trade-offs

- **Sin control de que el mismo dispositivo tenga sesiones de dos contratos a la vez.**
  Cada `tenant_access_token` es de un contrato; abrir un segundo enlace pisa la cookie del
  primero. Es el comportamiento del backend (una cookie, un valor), no algo que el front
  pueda evitar sin inventar un mecanismo de múltiples sesiones que el spec no pide.
- **El archivo que se sube no se valida en el cliente más allá de que exista uno.** El
  spec del backend excluye explícitamente restricciones de tipo o tamaño de archivo.

## Migration Plan

Ninguna: es superficie nueva. No hay `/prototipo` para el portal — el spec del backend no
lo pide y no hay datos de ejemplo que mostrar sin un token real.
