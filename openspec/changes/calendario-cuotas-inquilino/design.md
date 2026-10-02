# Diseño

## Datos que usa hoy el front

`POST /tenant-auth/session` canjea el token por la cookie de inquilino. Luego
`GET /tenant/invoices` devuelve **un array completo de `InvoiceResponse` del contrato
del enlace**. Cada elemento incluye `id`, `contractId`, `period` (fecha ISO del período),
`dueDate`, `baseAmount`, `total`, `status` (`PENDING`, `DUE`, `PAID`), `confirmed`,
`adjustments` y `payments`. Un pago aporta su propio estado (`AWAITING_CONFIRMATION`,
`CONFIRMED`, `REJECTED`), identificador y, si corresponde, motivo de rechazo.

`buildFilasInquilino` formatea esos datos. `estadoDeCuota` prioriza un pago esperando
confirmación sobre el estado de la cuota. `POST /tenant/payments?invoiceId=…` sube un
comprobante y `GET /tenant/payments/{id}/receipt` permite verlo. El array no trae los
límites del contrato. `contractId` identifica la cuota, pero **no autoriza** al inquilino
a llamar los endpoints de contratos del propietario.

`ContractResponse`, usado en el panel del propietario, ya modela `startDate`, `endDate`,
`actualEndDate`, `status` y el vínculo predecesor/sucesor. Ninguno de esos datos está
disponible hoy para el portal del inquilino. Una actualización de condiciones crea un
contrato sucesor; la API actual, limitada al contrato del enlace, deja las cuotas de
la otra parte de la cadena fuera de vista.

## Dependencia del backend

La spec `propertly-backend/specs/tenant-invoice-calendar/spec.md`
propone `GET /tenant/calendar`, autenticado con la misma sesión que
`GET /tenant/invoices`, sin parámetro `contractId`. El backend recorre sólo los
vínculos predecesor/sucesor del contrato del enlace y devuelve:

```json
{
  "tenant": { "firstName": "Lucía", "lastName": "Fernández" },
  "coverage": [
    { "startDate": "2025-06-15", "effectiveEndDate": "2025-09-30" },
    { "startDate": "2025-10-01", "effectiveEndDate": "2027-05-31" }
  ],
  "invoices": [
    { "id": 10, "contractId": 1, "period": "2025-09-01", "dueDate": "2025-09-10",
      "baseAmount": 410000, "total": 410000, "status": "DUE", "confirmed": true,
      "adjustments": [], "payments": [], "canSubmitPayment": true }
  ],
  "preInvoices": [
    { "contractId": 2, "period": "2025-11-01", "amount": 450000 }
  ]
}
```

Los dos enlaces de la cadena devuelven el mismo calendario completo, incluso después
del reemplazo. Otros contratos del mismo inquilino sin vínculo predecesor/sucesor
quedan excluidos. Los sucesores `SCHEDULED` no aparecen hasta que se activan.
`tenant` se deriva de la sesión del enlace y permite el saludo del encabezado; no es
un identificador ni incluye datos de contacto, fiscales, de propiedad o propietario.
`GET /tenant/invoices` conserva su forma actual para otros consumidores. El portal
usará `GET /tenant/calendar` y volverá a consultarlo después de subir un comprobante.
`401` conserva el mensaje genérico del enlace inválido; otros errores no se presentan
como ausencia de cuotas.

## Proyección de meses

Se comparan períodos `YYYY-MM`, sin convertir fechas ISO a medianoche de JavaScript.
`invoice.period` ubica la cuota en el mes; `dueDate` sólo informa cuándo vence. Una
`preInvoice.period` ubica un importe conocido pero todavía no emitido ni confirmado;
`amount` es una proyección de renta base y puede cambiar con ajustes. Cada
intervalo de `coverage` incluye los meses de sus fechas de inicio y fin. El primer mes
de cada intervalo posterior al primero muestra una indicación discreta «Cambiaron las
condiciones», incluso si todavía no tiene cuota. Un importe pendiente se presenta como
«Importe a confirmar», sin estado de deuda, vencimiento, detalle de pago ni comprobante.

| Situación del mes | Presentación | Acción |
|---|---|---|
| Tiene una cuota | Estado obtenido de `estadoDeCuota` | Abre el detalle actual |
| Tiene `preInvoice` pero no cuota | Importe y «Importe a confirmar» | Ninguna |
| Antes del primer intervalo | «Antes del contrato», atenuado | Ninguna |
| Dentro de cualquier intervalo, sin cuota | «Sin cuota generada», neutro | Ninguna |
| Entre intervalos, sin cuota | «Sin contrato vigente», atenuado | Ninguna |
| Después del último intervalo, sin cuota | «Después del contrato», atenuado | Ninguna |

Una cuota existente siempre se muestra, incluso si su período contradice las fechas del
resumen; no se oculta historial por una inconsistencia de datos. Si el backend devuelve más
de una cuota para un período, el mes informa cuántas hay y el detalle muestra todas, sin
descartar ninguna. El front no proyecta importes ni convierte ausencia de cuota en
«A vencer».

El selector incluye los años cubiertos por la cadena y cualquier año con cuotas. Abre
en el año actual si está entre los disponibles; si no, en el año disponible más cercano.
Cambiar de año cierra el detalle seleccionado. En móvil, los 12 meses siguen visibles en
dos columnas; las acciones tienen al menos 48 px y los estados se escriben con texto,
además del color.

## Cuotas anteriores impagas

Una cuota vencida de un contrato reemplazado sigue siendo una deuda visible; el cambio
de condiciones no la marca como pagada. La expectativa de producto es que, mientras
exista un sucesor activo, el inquilino pueda subir el comprobante de esa cuota histórica
si está confirmada y no tiene un pago activo. El detalle usa la misma acción «Subir
comprobante» y puede añadir una aclaración breve: «Esta cuota corresponde a condiciones
anteriores y sigue pendiente». El front no inventa elegibilidad: usa
`invoice.canSubmitPayment` y el `POST /tenant/payments` aceptan exactamente esos
casos, según la spec acordada de `GET /tenant/calendar`; el front no reinterpreta esa
regla.

Si la cadena completa ya terminó y no hay sucesor activo, se mantiene la regla actual:
historial y comprobantes legibles, sin nuevas cargas. Las cuotas impagas permanecen
visibles con su estado; se orienta al inquilino a consultar al propietario.

## Estados de carga y conservación de acciones

El calendario se carga después de establecer la sesión. Si la consulta falla, se
muestra un error con opción de reintentar; no se dibuja un calendario que afirme que
faltan cuotas. `invoices: []` con `coverage` válido sí muestra los 12 meses
clasificados por vigencia; si además llega una `preInvoice`, muestra su importe como
pendiente de confirmación.

El detalle conserva el comportamiento actual: desglose de ajustes; aviso de importe que
puede cambiar cuando `confirmed=false`; estado y motivo del comprobante; volver a subir
tras rechazo. La acción de carga se muestra sólo con `canSubmitPayment: true`. Después
de intentar cargar, el backend sigue siendo la autoridad y puede rechazar si el estado
cambió desde la lectura. Los archivos propios siguen disponibles desde ambos enlaces.

## Validación con una persona no técnica

Con el prototipo y sin explicar previamente el calendario: pedirle que encuentre la
cuota de septiembre, que diga qué significa octubre «Pago a confirmar», que cambie a
2025 y explique enero frente a junio. Añadir el caso del cambio de condiciones en
octubre y preguntar si entiende por qué septiembre puede seguir pendiente. Registrar
dónde toca, si necesita ayuda y cómo interpreta «Sin cuota generada». Si interpreta un
mes anterior al contrato como una deuda, el texto o la presentación requieren revisión
antes de llevar la vista al portal real.
