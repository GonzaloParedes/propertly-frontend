# Calendario del inquilino: contexto para backend

## Qué hace el frontend hoy

El inquilino abre `/tenant-portal?token=…`. El front canjea ese token con
`POST /tenant-auth/session` y después llama a `GET /tenant/invoices`. Esa respuesta
es un **array de cuotas del contrato del enlace**; no incluye el contrato.

Por cada cuota, el front muestra una tarjeta con el período, el vencimiento, el
importe, el estado y, si corresponde, el comprobante. Ordena primero las vencidas
y las próximas a vencer. En un contrato largo, esto produce una lista extensa.

```text
Sus cuotas

┌──────────────────────────────────────────────┐
│ junio 2025                     Pagada         │
│ Vence el 10/06/2025                          │
│ $ 410.000                                    │
│ Pago confirmado · Ver comprobante            │
└──────────────────────────────────────────────┘
```

Este dibujo representa la interfaz actual con **datos de ejemplo**, no una captura de
un inquilino real. El código está en
[`TenantPortal.tsx`](../../src/app/tenant-portal/TenantPortal.tsx) y la transformación
de datos en [`portal-inquilino.ts`](../../src/lib/portal-inquilino.ts).

La cuota ya trae todo lo necesario para su detalle:

```json
{
  "id": 10,
  "contractId": 1,
  "period": "2025-06-01",
  "dueDate": "2025-06-10",
  "baseAmount": 410000,
  "total": 410000,
  "status": "PAID",
  "confirmed": true,
  "adjustments": [],
  "payments": [
    {
      "id": 12,
      "invoiceId": 10,
      "status": "CONFIRMED",
      "submittedByTenant": true
    }
  ]
}
```

El front usa `period` para nombrar el mes y `dueDate` para mostrar cuándo vence.
El estado visible «Pago a confirmar» sale de un pago embebido con estado
`AWAITING_CONFIRMATION`; los otros estados salen de la cuota.

## El problema concreto al pasar a calendario

Ejemplo: el contrato empezó el **15/06/2025** y hasta ahora sólo llegó la cuota de junio.

| Meses | Hoy, en la lista | En el calendario queremos decir |
|---|---|---|
| Enero–mayo | No aparecen | «Antes del contrato» |
| Junio | Aparece la cuota | «Pagada», con su detalle |
| Julio–diciembre | No aparecen | «Sin cuota generada» si el contrato sigue vigente |

Para el front, enero y julio son idénticos hoy: **no hay un `InvoiceResponse` para
esos meses**. `contractId` no contiene las fechas, y la sesión del inquilino no puede
consultar `/contracts/{id}`, que pertenece al panel del propietario. No podemos
deducir el inicio por la primera cuota: podría faltar una cuota histórica.

## API acordada para el calendario

La propuesta de backend es `GET /tenant/calendar`, sin `contractId` enviado por el
cliente. Devuelve los intervalos de la cadena de contratos relacionados y todas sus
cuotas efectivas, desde cualquiera de los enlaces:

```json
{
  "coverage": [
    { "startDate": "2025-06-15", "effectiveEndDate": "2025-09-30" },
    { "startDate": "2025-10-01", "effectiveEndDate": "2027-05-31" }
  ],
  "invoices": [
    { "id": 10, "contractId": 1, "period": "2025-09-01",
      "dueDate": "2025-09-10", "baseAmount": 410000, "total": 410000,
      "status": "DUE", "confirmed": true, "adjustments": [], "payments": [],
      "canSubmitPayment": true }
  ]
}
```

`coverage` permite marcar los meses anteriores, interiores y posteriores al acuerdo.
`invoices` da los estados y el detalle. `canSubmitPayment` decide si se ofrece cargar
un comprobante de cada cuota, también de una cuota antigua pendiente.

El endpoint sigue respondiendo para cadenas finalizadas. `GET /tenant/invoices` conserva
su forma actual para otros consumidores. El punto pendiente de acuerdo es si una cuota
impaga del contrato reemplazado puede recibir comprobante mientras el sucesor está
activo; la [respuesta del front](spec-api-calendario-inquilino.md) recomienda que sí.

La [spec del frontend](../../openspec/changes/calendario-cuotas-inquilino/specs/portal-inquilino/spec.md)
describe los estados y casos límite. El prototipo navegable está en
`/prototipo/inquilino` dentro de este repositorio; usa datos ficticios y muestra el
ejemplo de inicio en junio al elegir 2025.

La spec `propertly-backend/specs/tenant-invoice-calendar/spec.md`
define la API; la [respuesta del front](spec-api-calendario-inquilino.md) documenta el
ajuste solicitado para cuotas anteriores impagas.
