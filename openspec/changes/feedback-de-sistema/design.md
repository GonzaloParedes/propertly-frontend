# Design

## Context

Relevamiento del estado actual (rama `workspace-propietario`, 02/10/2026):

- **Carga**: 13 lugares muestran «Cargando…» como texto gris (`.owner-list-note`,
  `.tenant-nota`, un `<p>` con `var(--text-2)` en `dashboard/layout.tsx`). Ninguno tiene
  indicador visual ni retardo.
- **Botón ocupado**: los diálogos ya cambian el rótulo a gerundio (`Guardando…`,
  `Archivando…`, `Finalizando…`, `Quitando…`) y se deshabilitan, pero sólo el pie del
  asistente muestra un spinner (`.owner-wizard-spinner`, gris `#9B95B5`, fuera de la paleta).
  Las acciones sin diálogo (descargar, ver comprobante, copiar o reenviar enlace, adjuntar o
  quitar documento) no muestran nada mientras esperan.
- **Éxito**: sólo tres acciones lo confirman, y cada una distinto: `avisoGuardado` como
  `<output>` en Configuración, el rótulo «Copiado» del botón de enlace, y el reenvío del enlace
  que se guarda en `errorContrato` y se pinta como **error** (`role="alert"`, fondo rojo). El
  resto —altas, archivados, toda Cobranzas, finalizar contrato, programar cambio— cierra el
  diálogo y nada más.
- **Error**: los diálogos y el asistente ya muestran el error adentro con `.owner-wizard-alert`
  y conservan lo escrito; eso está bien y lo exigen los specs vigentes. Las acciones sin
  diálogo terminan en lugares improvisados: `errorContrato` en la tarjeta del documento,
  `actionError` de Cobranzas sobre el listado, `errorSubida` arriba del portal.
- **Diálogo**: `Dialog` usa `<dialog open>` (no `showModal()`), con `z-index:100`. No vive en
  la top layer, así que un elemento con `z-index` mayor queda por encima y sigue siendo
  clickeable.
- **Dependencias**: el proyecto sólo depende de Next, React y Sentry.

## Goals / Non-Goals

**Goals:**

- Un componente de espera y un sistema de toasts reutilizables, con la estética del manual y
  las reglas de `sistema-ui.md` (anillos con `box-shadow`, color semántico sólo en íconos,
  ícono + palabra, 48 px táctiles, `prefers-reduced-motion`).
- Aplicarlos en **todos** los puntos relevados abajo, en una sola pasada.
- Que `/prototipo` muestre los toasts de éxito igual que la app real.

**Non-Goals:**

- Skeletons por pantalla. Un spinner con rótulo alcanza para el MVP; los skeletons piden una
  forma por pantalla y se pueden sumar después sin tocar este contrato.
- Toasts con acción («Deshacer»). El backend no ofrece deshacer ninguna de estas acciones.
- Pedir confirmación antes de «Quitar» el documento (hoy no la tiene). Se anota aparte.
- Los formularios viejos (`ContractForm`, `PropertyForm`, `PropertyFormCarousel`) que van a
  retirarse: no se tocan.
- Reintentos automáticos o botón «Reintentar» en los errores de carga.

## Decisions

### 1 · Toast hecho a mano, sin librería

Un `ToastProvider` con contexto, un hook `useToast()` que expone `exito(mensaje)` y
`error(mensaje)`, y una región fija que los dibuja. Son ~120 líneas.

*Por qué no `sonner` o `react-hot-toast`:* hay que pisarles casi todo el estilo para que
respeten los anillos `inset`, la tipografía y los 48 px, y su comportamiento por defecto
(error que se va solo a los 4 s, toasts apilados en abanico) va contra lo que pide el spec.
Sumar una dependencia para sobrescribirla entera no conviene; el proyecto tampoco tiene
ninguna librería de UI hoy.

### 2 · Dónde vive el provider

En `src/app/layout.tsx`, envolviendo a `AuthProvider`. Así un toast disparado justo antes de
navegar (`onComplete` del asistente → `go(...)`) sobrevive al cambio de vista, y el portal del
inquilino, que está fuera de `/dashboard`, también lo tiene.

`useToast()` fuera del provider **lanza un error**. Un no-op silencioso escondería un toast
que nunca se ve. Los tests renderizan con un helper que envuelve en el provider.

### 3 · La región de toasts

- `position:fixed; z-index:110` — por encima de `.owner-dialog` (100), así un error de
  descarga disparado con un diálogo abierto se ve.
- Escritorio: abajo a la derecha, ancho máximo 420 px, margen `--esp-20`.
- Celular (corte 620, no se agregan cortes): abajo a lo ancho con margen `--esp-12`. No hace
  falta subir la región por el pie fijo del asistente: el éxito aparece recién cuando el
  asistente se cierra y los errores del asistente van inline, así que nunca coinciden.
- Máximo 3 visibles; el más nuevo abajo, más cerca del borde. El cuarto desplaza al más viejo.
- **Dos live regions siempre montadas**, vacías al inicio: una `role="status"`
  (`aria-live="polite"`) para éxito y una `role="alert"` (`aria-live="assertive"`) para error.
  Si la región se monta junto con el mensaje, varios lectores no lo anuncian.
- El toast no recibe foco al aparecer. El botón cerrar es alcanzable con Tab.

### 4 · Aspecto del toast

Tarjeta blanca, radio `14px`, `--sombra`, contorno `inset 0 0 0 1.5px var(--borde)`. A la
izquierda un círculo de 36 px con fondo `--exito-bg`/`--error-bg` y el ícono `check`/`alert` en
`--exito`/`--error` — el color vive en el ícono, nunca en el texto (regla de contraste). Texto
en `--tinta`, 16 px Nunito Sans 600. A la derecha el botón cerrar, 48×48 de área táctil con
`aria-label="Cerrar aviso"`. Entrada con `fade-up` corto (ya existe en `globals.css`); sin
animación con `prefers-reduced-motion`.

El tipo se dice también en palabra para lector de pantalla: el texto anunciado lleva un
prefijo oculto («Listo:» / «Error:»).

### 5 · Duraciones

- Éxito: **6 s**, pausado mientras hay hover o foco dentro. Más que los 4 s habituales: el
  público incluye gente de 60+ que lee despacio, y WCAG 2.2.1 pide que lo temporizado se
  pueda pausar.
- Error: no se cierra solo.

### 6 · Spinner

Componente `Spinner` en `src/components/ui/Spinner.tsx`, CSS puro:

- Anillo de trazo `2.5px` con extremo visible: pista en
  `color-mix(in srgb, currentColor 25%, transparent)` y arco en `currentColor`. Así toma el
  color del texto que lo rodea: blanco sobre el botón primario, índigo sobre fondo claro, rojo
  en un botón `danger`. Reemplaza al `.owner-wizard-spinner` gris, que no está en la paleta.
- Tamaños: `sm` 18 px (dentro de botones, igual que el actual) y `md` 32 px (bloque).
- `aria-hidden`: lo que se anuncia es el rótulo, no el dibujo.
- `prefers-reduced-motion`: gira a 2.4 s por vuelta en vez de 0.7 s (decisión ya tomada en el
  CSS actual; se conserva).

*Por qué no animar el logo:* el manual prohíbe deformar o alterar el logo, y un isotipo
girando es exactamente eso.

### 7 · Carga de bloque

Componente `Cargando` (`src/components/ui/Spinner.tsx`, mismo archivo): `Spinner md` en
`--indigo`, grande (48–72 px según el ancho de pantalla) y **sin texto a la vista** —decidido al
verlo: la leyenda molestaba—, con el rótulo en `sr-only` dentro de un contenedor `role="status"`.
Los de pantalla van sobre una tarjeta `owner-card`. El
contenedor se pinta con `opacity:0` y una animación que lo lleva a 1 con **300 ms de
retardo**, en CSS (`animation-delay`), sin timers en JS. Si los datos llegan antes, el
componente se desmonta sin haberse visto. Reemplaza a `.owner-list-note` sólo en su uso de
«Cargando…»; los usos de error y vacío de esa clase quedan.

### 8 · Botón ocupado

- El `Button` interno de `OwnerWorkspace` suma la prop `busy`: pone `disabled`,
  `aria-busy="true"` y antepone `<Spinner sm />` al rótulo. El rótulo en gerundio lo sigue
  decidiendo cada diálogo, como hoy.
- El botón puede crecer al pasar a «Guardando…» con spinner, pero no se mueve: el pie de
  diálogo alinea a la derecha, así que crece hacia la izquierda y el primario queda donde el
  usuario lo tocó. Medir el ancho en reposo para fijar `min-width` no vale la pena; si en la
  revisión visual algún pie salta, se fija ahí.
- En las pantallas de acceso, que usan otro sistema (Tailwind + `--primary`), se suma el
  `Spinner sm` dentro del botón existente; el `currentColor` lo resuelve sin estilos nuevos.

### 9 · Mensajes

Tratamiento de usted, sin exclamaciones, sin emojis, terminan en punto, nombran el objeto.
Viven junto a cada acción, no en un catálogo aparte: son únicos por acción y el catálogo sólo
agrega un salto para leerlos.

### 10 · Modo demo

Las ramas `if (demo) return …` de cada acción disparan el mismo toast de éxito antes de
volver. Si no, el prototipo —que es la hoja de ruta navegable— no mostraría el comportamiento.

## Relevamiento: qué va en cada lugar

### Carga de bloque (`Cargando`)

| Lugar | Archivo | Rótulo |
|---|---|---|
| Verificando sesión | `src/app/dashboard/layout.tsx:25` | Cargando su panel… |
| Inicio | `OwnerWorkspace.tsx:969` | Cargando su panel… |
| Recordatorios (Configuración) | `OwnerWorkspace.tsx:1128` | Cargando los recordatorios… |
| Propiedades | `OwnerWorkspace.tsx:1234` | Cargando sus propiedades… |
| Detalle de propiedad | `OwnerWorkspace.tsx:1075` | Cargando la propiedad… |
| Contratos | `OwnerWorkspace.tsx:775` | Cargando sus contratos… |
| Detalle de contrato | `OwnerWorkspace.tsx:1431` | Cargando el contrato… |
| Historial de aumentos | `OwnerWorkspace.tsx:1327` | Cargando el historial… |
| Cobranzas | `OwnerWorkspace.tsx:878` | Cargando sus cobranzas… |
| Inquilinos | `OwnerWorkspace.tsx:732` | Cargando sus inquilinos… |
| Detalle de inquilino | `OwnerWorkspace.tsx:634` | Cargando el inquilino… |
| Asistente: listas a elegir | `CreationWizard.tsx:362` | Cargando… (va dentro de un paso; el título del paso ya dice qué) |
| Portal del inquilino | `TenantPortal.tsx:137` | Cargando sus cuotas… |

### Botón ocupado (`busy`)

Ya tienen gerundio, suman spinner: los diálogos de `OwnerWorkspace.tsx:1623–1723` (ajuste,
quitar ajuste, archivar inquilino, editar propiedad, archivar propiedad, finalizar contrato,
revisar pago —confirmar **y** rechazar—, confirmar importe, registrar pago, editar inquilino,
editar cuenta, recordatorios), `CambioCondicionesForm.tsx:111`, `TenantPortal.tsx:250` y
`:277`, y los envíos de `login`, `registro`, `olvidar-contrasena` y
`restablecer-contrasena`. El asistente ya lo tiene; sólo cambia al `Spinner` nuevo.

Hoy sin estado de espera, se les agrega: Ver comprobante (Cobranzas y revisión de pago),
Copiar enlace (detalle de contrato y de inquilino), Reenviar por correo, Descargar, Quitar y
Adjuntar documento.

### Toasts

| Acción | Dónde | Éxito | Error |
|---|---|---|---|
| Crear propiedad | `CreationWizard` → `onComplete` | Propiedad agregada. | inline (asistente) |
| Crear inquilino | idem | Inquilino agregado. | inline |
| Crear contrato | idem | Contrato creado. Le enviamos al inquilino su enlace por correo. ¹ | inline |
| Editar propiedad | `guardarPropiedadEditada` | Propiedad actualizada. | inline (diálogo) |
| Archivar propiedad | `archivarPropiedad` | Propiedad archivada. | inline |
| Editar inquilino | `guardarInquilinoEditado` | Datos del inquilino guardados. | inline |
| Archivar inquilino | `archivarInquilino` | Inquilino archivado. | inline |
| Recordatorios | `guardarAvisos` | Recordatorios guardados. | inline |
| Cuenta | `guardarCuenta` | Sus datos quedaron guardados. | inline |
| Confirmar importe | `accionDeCuota` | Importe confirmado. Le avisamos al inquilino que ya puede pagar. | inline |
| Registrar pago | `accionDeCuota` | Pago registrado. La cuota de {período} quedó pagada. | inline |
| Confirmar pago | `accionDeCuota` | Pago confirmado. La cuota de {período} quedó pagada. | inline |
| Rechazar pago | `accionDeCuota` | Pago rechazado. El inquilino puede cargar un comprobante nuevo. | inline |
| Guardar ajuste | `accionDeAjuste` | Ajuste guardado. | inline |
| Quitar ajuste | `accionDeAjuste` | Ajuste quitado. | inline |
| Finalizar contrato | `finalizarContrato` | Contrato finalizado. | inline |
| Programar cambio | `CambioCondicionesForm` → `onProgramado` | Cambio programado desde {mes}. | inline |
| Copiar enlace | `copiarEnlace` | Enlace copiado. | **toast** |
| Reenviar enlace | `reenviarEnlace` | Le reenviamos el enlace por correo al inquilino. | **toast** |
| Adjuntar documento | `adjuntarDocumento` | Documento adjuntado. | **toast** (mensaje de `mensajeErrorAlAdjuntarDocumento`) |
| Quitar documento | `quitarDocumento` | Documento quitado. | **toast** |
| Descargar documento | `descargarDocumento` | — (la descarga del navegador ya se ve) | **toast** |
| Ver comprobante (propietario) | `verComprobante` | — (se abre la pestaña) | **toast** |
| Subir comprobante (inquilino) | `TenantPortal.subirComprobante` | Recibimos su comprobante. Queda esperando la confirmación del propietario. | **toast** |
| Ver comprobante (inquilino) | `TenantPortal.verComprobante` | — | **toast** |
| Login / registro / olvido / restablecer | `src/app/*` | — (navega o tiene pantalla propia) | inline (formulario) |

¹ Verificado en `propertly-backend` (rama `codex/frontend-integration-lots`):
`ContractService.create` llama a `issueTenantAccess`, que manda el correo con el enlace,
siempre. Si eso cambiara, el mensaje vuelve a «Contrato creado.»: lo que el backend no hace,
el toast no lo afirma.

`{período}` y `{mes}` salen de la fila o del pedido que ya está en mano en cada acción; el
wrapper `accionDeCuota` pasa a recibir el mensaje de éxito como argumento.

### Lo que se retira

- `avisoGuardado` y la prop `savedNotice` de `SettingsView` (`OwnerWorkspace.tsx:1140`).
- El estado `"copiado"` de `enlace` y el rótulo «Copiado» (`OwnerWorkspace.tsx:1390`); el
  estado `"error"` también, porque pasa a toast. Queda `"pidiendo"` para el botón ocupado.
- El uso de `errorContrato` para el éxito del reenvío, y para los errores de documento.
  `errorContrato` sigue existiendo sólo para el diálogo de finalizar.
- El `actionError` mostrado sobre el listado de Cobranzas cuando no hay diálogo abierto
  (`OwnerWorkspace.tsx:879`): el único que llegaba ahí era el de «Ver comprobante».
- `errorSubida` y su banda en `TenantPortal.tsx:178`.
- `.owner-wizard-spinner` y su `@keyframes`.

## Risks / Trade-offs

- **Toast fuera de la vista del usuario en pantallas grandes** → abajo a la derecha es
  periférico. Mitigación: el toast de éxito acompaña a un cambio que ya se ve (el diálogo se
  cierra, la fila cambia); el de error no se va solo.
- **Errores de acción sin diálogo que antes quedaban junto a su tarjeta ahora quedan en una
  esquina** → se pierde la cercanía. Es el costo aceptado de la opción híbrida; esos errores
  no piden corregir nada en la tarjeta, sólo reintentar.
- **Tests que buscan «Cargando…» o «Recordatorios guardados.» por texto** → cambian de
  rótulo o de lugar. Se actualizan en la misma pasada; el texto anunciado sigue siendo
  buscable con `getByRole("status")`.
- **El retardo de 300 ms en CSS no lo ve jsdom** → en tests el rótulo existe desde el primer
  render, que es lo que conviene para testear.
- **`color-mix()`** → soportado en todos los navegadores actuales desde 2023. Sin fallback.

## Open Questions

Ninguna. La única (si el alta de contrato manda el enlace por correo) se resolvió leyendo el
backend; ver ¹ en la tabla de toasts.
