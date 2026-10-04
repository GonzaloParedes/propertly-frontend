# Tasks

## 1. Spinner y carga de bloque

- [x] 1.1 Crear `src/components/ui/Spinner.tsx` con `Spinner` (`sm` 18 px / `md` 32 px, `currentColor`, `aria-hidden`) y `Cargando` (spinner `md` índigo + rótulo, `role="status"`, aparición con 300 ms de retardo en CSS), con sus estilos y la regla de `prefers-reduced-motion`; verificar con un test en `src/tests/components/ui/spinner.test.tsx` que `Cargando` expone su rótulo por `getByRole("status")` y que el anillo no se anuncia
- [x] 1.2 Reemplazar los 13 «Cargando…» de la tabla «Carga de bloque» del design por `Cargando` con su rótulo; verificar que `npm test` pasa después de actualizar los tests de `owner-workspace-*`, `tenant-portal` y `auth-context` que buscaban «Cargando…» por texto
- [x] 1.3 Reemplazar `.owner-wizard-spinner` del pie de `CreationWizard` por `Spinner sm` y borrar la clase y su `@keyframes` de `OwnerWorkspace.css`; verificar con `grep owner-wizard-spinner src` sin resultados y el test del asistente en verde

## 2. Botón ocupado

- [x] 2.1 Sumar la prop `busy` al `Button` interno de `OwnerWorkspace` (deshabilita, `aria-busy="true"`, antepone `Spinner sm`) y usarla en todos los diálogos de `OwnerWorkspace.tsx:1623–1723`, incluido «Rechazar» de la revisión de pago, y en `CambioCondicionesForm`; verificar con un test que al guardar un diálogo el botón queda deshabilitado con `aria-busy` y que un segundo click no dispara otra llamada
- [x] 2.2 Agregar estado de espera a las acciones que hoy no lo tienen —Ver comprobante, Copiar enlace (contrato e inquilino), Reenviar por correo, Descargar, Quitar y Adjuntar documento—; verificar con un test por familia (enlace, documento, comprobante) que el botón queda ocupado mientras la promesa está pendiente
- [ ] 2.3 Sumar `Spinner sm` a los botones ocupados del portal («Subiendo…», «Abriendo…») y de `login`, `registro`, `olvidar-contrasena` y `restablecer-contrasena`; verificar a mano en `localhost:3000/login` con la red en «Slow 3G» que el anillo se ve blanco sobre el botón índigo

## 3. Sistema de toasts

- [x] 3.1 Crear `src/components/ui/Toast.tsx` con `ToastProvider`, `useToast()` (`exito`, `error`; lanza fuera del provider) y la región: dos live regions siempre montadas, máximo 3 visibles, éxito 6 s con pausa por hover/foco, error sin cierre automático, botón «Cerrar aviso» de 48 px, prefijo oculto «Listo:»/«Error:»; verificar con `src/tests/components/ui/toast.test.tsx` cubriendo cada escenario de «Comportamiento del toast» del spec (con timers falsos de Vitest)
- [ ] 3.2 Estilos de la región y del toast según design §3–4 (z-index 110, abajo a la derecha / a lo ancho bajo 620 px, `fade-up` sin animación con movimiento reducido); verificar a mano a 1280 y 390 px que no tapa el pie del asistente ni se sale de pantalla
- [x] 3.3 Montar `ToastProvider` en `src/app/layout.tsx` y agregar en `src/tests/` un helper de render que envuelva en el provider; migrar los tests existentes de `OwnerWorkspace`, `CreationWizard` y `TenantPortal` a ese helper y verificar `npm test` en verde

## 4. Toasts en el panel del propietario

- [x] 4.1 Toasts de éxito de los tres asistentes (vía `onComplete`) y de editar/archivar propiedad e inquilino, cuenta y recordatorios, con los textos de la tabla del design; quitar `avisoGuardado`/`savedNotice` de Configuración; verificar con tests en `owner-workspace-propiedades`, `-tenants` y `-configuracion` que cada éxito muestra su toast y que el aviso fijo ya no está
- [x] 4.2 Hacer que `accionDeCuota` y `accionDeAjuste` reciban el mensaje de éxito y pasarlo desde confirmar importe, registrar/confirmar/rechazar pago y guardar/quitar ajuste (con `{período}` de la fila); quitar el `actionError` suelto de Cobranzas y mandar el error de «Ver comprobante» a toast; verificar en `owner-workspace-cobranzas` un test por acción y que un error con diálogo abierto sigue inline sin toast
- [x] 4.3 Detalle de contrato: toasts de éxito de finalizar, programar cambio (`Cambio programado desde {mes}.`), adjuntar y quitar documento, copiar y reenviar enlace; toasts de error de descargar, adjuntar, quitar, copiar y reenviar; dejar `errorContrato` sólo para el diálogo de finalizar y sacar el estado `"copiado"`/`"error"` de `enlace`; verificar en `owner-workspace-detalle-contrato` que el reenvío exitoso ya no sale con `role="alert"` y que el botón vuelve a decir «Copiar enlace»
- [x] 4.4 Disparar el mismo toast de éxito en cada rama `if (demo)` de las acciones anteriores; verificar con un test que renderiza `OwnerWorkspace` con `demo` y completa un archivado, y a mano en `localhost:3000/prototipo`

## 5. Toasts en el portal del inquilino

- [x] 5.1 Toast de éxito al subir el comprobante y toasts de error al subir o ver el comprobante; quitar `errorSubida` y su banda; verificar en `src/tests/app/tenant-portal.test.tsx` que la cuota sigue reflejando el estado nuevo, que aparece el toast y que una falla deja la cuota como estaba

## 6. Documentación e integración

- [x] 6.1 Escribir en `docs/design/sistema-ui.md` la sección «Feedback de sistema»: qué canal usa cada caso (carga de bloque, botón ocupado, toast de éxito, error inline vs. toast de error), duraciones, mensajes en usted y por qué el toast es propio y no una librería; verificar que la sección enlaza a `src/components/ui/Spinner.tsx` y `Toast.tsx` y que no contradice «Reglas de accesibilidad»
- [ ] 6.2 Revisión final en navegador a 1280 y 390 px recorriendo un alta, una edición, una acción de Cobranzas, un error de descarga (backend apagado) y el portal; verificar además `npm test`, `npm run lint` y `openspec validate feedback-de-sistema --strict` en verde
