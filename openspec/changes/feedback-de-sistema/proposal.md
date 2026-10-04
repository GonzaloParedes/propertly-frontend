# Proposal

## Why

La app no tiene un lenguaje común para decirle al usuario «estoy trabajando», «salió bien» o
«no salió». Hoy cada pantalla lo resuelve a su manera: 13 «Cargando…» sueltos en texto gris,
un spinner que existe sólo en el pie del asistente, confirmaciones de éxito que en la mayoría
de las acciones directamente no existen (se cierra el diálogo y el usuario tiene que deducir
que guardó), y errores de acciones sin diálogo que se pintan en lugares improvisados. Hay
incluso un caso donde un éxito se muestra como error: «Le reenviamos el enlace por correo»
se guarda en `errorContrato` y sale con `role="alert"` y fondo rojo. Para un público de 25 a
60+ años, sin costumbre de interfaces densas, la falta de una confirmación explícita es
exactamente lo que genera el «¿se guardó?» y el doble click.

## What Changes

- **Componente `Spinner`** con la estética de Alquia (anillo índigo, trazo redondeado, sin
  logo animado), en dos tamaños: dentro de un botón y de bloque. Reemplaza el
  `.owner-wizard-spinner` gris actual y respeta `prefers-reduced-motion`.
- **Estado de carga de bloque** (`Spinner` + rótulo) que reemplaza los «Cargando…» de texto en
  el panel del propietario, el portal del inquilino y el layout de `/dashboard`. Aparece
  recién después de un breve retardo para no parpadear en cargas rápidas.
- **Botón ocupado**: toda acción que espera al backend muestra el spinner chico junto al
  rótulo en gerundio que ya existe («Guardando…»), deshabilita el botón y marca
  `aria-busy`. Hoy sólo el asistente lo hace.
- **Sistema de toasts** (`ToastProvider` + `useToast`) montado en el layout raíz, con dos
  tonos: éxito y error. Visible abajo al centro en celular y abajo a la derecha en
  escritorio, anunciado por lector de pantalla, con botón para cerrar.
- **Toast de éxito** al terminar cada acción que modifica datos: altas desde el asistente,
  ediciones, archivados, ajustes de cuota, confirmaciones de importe y de pago, registro y
  rechazo de pagos, finalizar contrato, programar cambio de condiciones, documentos,
  copiar y reenviar el enlace, y la subida de comprobante del inquilino. Las pantallas de
  acceso no llevan toast: registro, olvidé y restablecer contraseña ya muestran una pantalla
  propia de éxito, y el login navega al panel.
- **Toast de error, híbrido**: sólo para acciones que no tienen un lugar propio donde
  mostrar el error (descargar, ver comprobante, copiar o reenviar enlace, adjuntar y quitar
  documento). Los errores dentro de un diálogo o asistente abierto **siguen inline**, porque
  ahí el usuario tiene que corregir algo y lo escrito se conserva. Los errores de carga de
  una pantalla también siguen inline: reemplazan el contenido que no llegó.
- Se retiran las confirmaciones improvisadas: el `<output>` «Recordatorios guardados.» de
  Configuración, el uso de `errorContrato` para un éxito y el `actionError` suelto de
  Cobranzas cuando no hay diálogo abierto.

## Capabilities

### New Capabilities

- `feedback-de-sistema`: cómo la app indica espera, éxito y error en todas las pantallas —
  qué canal usa cada caso (spinner de botón, carga de bloque, toast, error inline), cuánto
  dura, cómo se anuncia y qué acciones están obligadas a confirmar.

### Modified Capabilities

Ninguna. Los specs vigentes (`configuracion`, `detalle-contrato`, `detalle-inquilino`,
`ajuste-de-cuota`, `cambio-de-condiciones`, `propiedades`, `inicio`, `portal-inquilino`)
dicen «la pantalla lo confirma» o «la pantalla lo avisa» sin fijar el canal, y los errores
de diálogo que exigen «el diálogo sigue abierto con el motivo visible» se mantienen inline.
Este cambio define el canal sin contradecir ninguno de sus escenarios.

## Impact

- **Código nuevo**: `src/components/ui/Spinner.tsx`, `src/components/ui/Toast.tsx`
  (provider, hook y región), estilos en `globals.css` o un CSS propio de `ui/`.
- **Código tocado**: `src/app/layout.tsx` (monta el provider), `OwnerWorkspace.tsx` y `.css`,
  `CreationWizard.tsx`, `CambioCondicionesForm.tsx`, `TenantPortal.tsx` y
  `tenant-portal.css`, `src/app/dashboard/layout.tsx`, y las cuatro pantallas de acceso
  (`login`, `registro`, `olvidar-contrasena`, `restablecer-contrasena`).
- **Sin dependencias nuevas**: el toast se construye a mano (ver design.md).
- **Modo demo**: en `/prototipo` las acciones no llaman al backend pero **sí** muestran el
  toast de éxito, para que el prototipo enseñe el comportamiento completo.
- **Tests**: los de `src/tests/components/dashboard/` que hoy buscan «Cargando…» o
  «Recordatorios guardados.» se actualizan; se suman tests del provider y de cada familia de
  acción.
- **Documentación**: al archivar, la regla resultante se escribe en `docs/design/sistema-ui.md`
  (sección nueva «Feedback de sistema»).
