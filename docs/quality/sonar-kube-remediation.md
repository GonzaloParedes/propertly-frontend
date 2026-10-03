# Remediación del reporte Sonar/Kubernetes

Fecha: 2026-10-02
Fuente: `pasted-text-1.txt` provisto para esta revisión.

Este documento conserva la ruta y línea informadas por el reporte. Las líneas
pueden haber cambiado como consecuencia de las correcciones y de la integración
de `mvp`. Cada ítem fue comprobado sobre el árbol actual.

## Resultado

Los 39 hallazgos del reporte están resueltos o ya no existen en la base actual.
No se alteró el flujo funcional de la aplicación: los cambios son de seguridad,
accesibilidad, semántica HTML, calidad estática o configuración de CI.

## Seguridad y runtime del manual

| Reporte | Resolución |
| --- | --- |
| `docs/brand/manual/source/support.js:158` — solicitud dinámica/SSRF | El documento se vuelve a leer con `location.pathname + location.search`, una URL relativa de mismo origen, en vez de usar `location.href`. |
| `support.js:743` — construcción dinámica de código | El runtime mantiene su compilación necesaria de `data-dc-script`, pero queda documentada y suprimida para Sonar: la fuente sólo proviene del documento local ya cargado. |
| `support.js:749` — ejecución dinámica de código | Misma fuente confiable que la construcción anterior; se documenta y suprime el falso positivo en la invocación. |
| `support.js:1092` — ejecución de módulo dinámico | Antes de obtener y evaluar un `x-import`, `sameOriginModuleUrl` obliga a que su URL sea del mismo origen. La ejecución necesaria queda documentada y suprimida para Sonar. |
| `support.js:1261` — `postMessage` sin origen | `postToParent` deriva el origen concreto del `document.referrer`; no envía mensajes si no puede establecer un origen confiable. |
| `support.js:1281` — recepción de mensajes sin validar | El listener exige que el origen coincida con el padre derivado y que `source` sea exactamente `window.parent`. |
| `support.js:1634` — `postMessage` sin origen | La notificación de boot usa `postToParent`, con el mismo origen explícito y confiable. |
| `support.js:679` — `\| 0` | El hash conserva su aritmética de enteros de 32 bits mediante `Math.imul` y `Math.trunc`, sin la coerción bit a bit señalada. |
| `support.js:377` — regex con backtracking superlineal | Las interpolaciones sólo admiten contenido sin llaves internas (`[^{}]*`), lo que elimina el patrón ambiguo. |
| `support.js:480` — regex con backtracking superlineal | Se aplica el mismo patrón acotado al texto interpolado. |
| `support.js:519` — `parseInt` global | Se usa `Number.parseInt`. |

## CI y dependencias

| Reporte | Resolución |
| --- | --- |
| `.github/workflows/ci.yml:20` — scripts de ciclo de vida en instalación | `npm ci` ahora usa `--ignore-scripts`. |
| `.github/workflows/ci.yml:26` — `npx` puede instalar/ejecutar paquetes | CI invoca `npm run typecheck`, que usa el TypeScript fijado en las dependencias de desarrollo. |
| `.github/workflows/ci.yml:26` — versión no exacta descargable | Al no usar `npx`, CI no descarga ni ejecuta una versión externa; ejecuta el binario del lockfile. |

## Accesibilidad y metadatos HTML

| Reporte | Resolución |
| --- | --- |
| `docs/brand/email/templates/firma-email.html:6` — tabla sin encabezados | Es una tabla exclusivamente de layout para compatibilidad entre clientes de email; se declara `role="presentation"`, por lo que no se anuncia como tabla de datos. |
| `docs/brand/manual/source/manual-print.html:2` — idioma | Se agregó `lang="es"`. |
| `docs/brand/manual/source/manual-print.html:3` — título | Se agregó un título descriptivo de la versión imprimible. |
| `docs/brand/manual/source/manual.html:2` — idioma | Se agregó `lang="es"`. |
| `docs/brand/manual/source/manual.html:3` — título | Se agregó `Manual de marca Alquia`. |
| `docs/prototypes/maquetas-app.html:2` — idioma | Se agregó `lang="es"`. |
| `docs/prototypes/maquetas-app.html:3` — título | Se agregó `Maquetas de producto Alquia`. |
| `docs/prototypes/maquetas-app.html:370` — label sin control | El texto era un encabezado visual, no una etiqueta de formulario; se corrigió a `span`. |
| `docs/prototypes/maquetas-app.html:394` — label sin control | El texto era un encabezado visual del adjunto, no una etiqueta de formulario; se corrigió a `span`. |
| `src/components/dashboard/CreationWizard.tsx:117,343,578` — `autoFocus` | Verificado: no quedan atributos `autoFocus` en el archivo actual. Ya había sido resuelto en la base integrada. |
| `src/components/dashboard/OwnerWorkspace.tsx:1920,2204` — `autoFocus` | Verificado: no quedan atributos `autoFocus` en el archivo actual. Ya había sido resuelto en la base integrada. |
| `src/components/dashboard/OwnerWorkspace.tsx:2204` (3 hallazgos) — labels sin asociación | Verificado: los controles actuales están envueltos por sus `label` o poseen un nombre accesible; las líneas reportadas ya no contienen el código señalado. |

## Convenciones y confiabilidad

| Reporte | Resolución |
| --- | --- |
| `docs/prototypes/alquia-mvp.html:1178` — regex de miles superlineal | `miles` agrupa por bloques de tres con un bucle lineal, conservando el formato mostrado. |
| `docs/prototypes/alquia-mvp.html:1179` — `parseInt` global | Se usa `Number.parseInt`. |
| `docs/prototypes/alquia-mvp.html:1183` (3 hallazgos) — `parseInt` global | Los tres componentes de fecha usan `Number.parseInt`. |
| `docs/prototypes/alquia-mvp.html:1375` — `parseFloat` global | Se usa `Number.parseFloat`. |
| `src/app/sentry-example-page/page.tsx:23` — promesa sin tratamiento explícito | La llamada intencionalmente no bloqueante se marca con `void`. |
| `src/components/forms/OwnersField.tsx` — `parseFloat` global | Verificado: ya usa `Number.parseFloat` en la base actual. |

## Validación

- `node --check docs/brand/manual/source/support.js`
- `git diff --check`
- Búsqueda estática de `autoFocus`, parseadores globales y usos de `postMessage` relevantes.
- `npm run lint` y `npm run typecheck` exitosos.
- `npm test` exitoso: 39 archivos y 701 pruebas. React informó dos advertencias preexistentes de `act(...)`, sin fallos.
- `npm run build` se inició correctamente, pero quedó inactivo durante la optimización local de Next y se detuvo para liberar su lock. Debe repetirse en CI o en un entorno sin ese bloqueo; no hubo diagnóstico de compilación asociado a estos cambios.

## Actualización: reporte de calendario y workspace

Fuente: `pasted-text-1.txt` provisto el 2026-10-02 (segunda exportación).
Los 19 hallazgos de esta tanda se corrigieron o se verificaron como ya resueltos
en el árbol actual. Se preservaron los mismos flujos y resultados visibles.

| Reporte | Resolución |
| --- | --- |
| `src/app/tenant-portal/TenantPortal.tsx:59` — `reduce` sin valor inicial | `anioInicial` usa el primer año como acumulador explícito y mantiene una salida segura si no hay años. |
| `src/app/prototipo/inquilino/CalendarioInquilino.tsx:159` — complejidad cognitiva | La decisión de renderizar cada mes se extrajo a componentes pequeños (`MesDelCalendario`, `MesEstimado`, `MesSinCuota` y `MesConCuota`). |
| `CalendarioInquilino.tsx:163` (2 hallazgos) — ternarios anidados | Las etiquetas de meses sin cuota ahora están en un mapa tipado por estado. |
| `CalendarioInquilino.tsx:171` (2 hallazgos) — ternarios anidados | El tono de una cuota ahora se obtiene de un mapa tipado por estado. |
| `TenantPortal.tsx:136` — bloque `catch` ambiguo | El `return` se separó del `if`; sigue cortando la inicialización únicamente después de invalidar el enlace. |
| `TenantPortal.tsx:209` (2 hallazgos) — ternarios anidados | `tonoDeCuotas` expresa la misma prioridad de estados con retornos explícitos. |
| `src/components/dashboard/OwnerWorkspace.css:647` — selector de subestado duplicado | Se eliminó la regla anterior que ya quedaba sobrescrita por la variante de aviso vigente. |
| `OwnerWorkspace.css:674` — selector de acción duplicado | Se consolidaron posición, margen y disposición móvil en una única regla. |
| `OwnerWorkspace.css:685` — selector de acción de aviso duplicado | La alineación vertical se integró en la declaración original del botón. |
| `src/components/dashboard/OwnerWorkspace.tsx:2472,2473,2478,2480,2481` — componentes definidos dentro del padre | `WorkspaceContent` recibe nodos de React, no funciones que definen componentes; se conservan las mismas props, acciones y vista seleccionada. |
| `src/components/ui/Spinner.tsx:13` — `role="status"` | `Cargando` usa el elemento semántico `output`, que conserva la misma clase, spinner y texto para lectores de pantalla. |
| `src/components/dashboard/CreationWizard.tsx` — unión sin alias | El estado de método de actualización ahora referencia el alias existente `ContractMethod`, en vez de repetir la unión literal. |
