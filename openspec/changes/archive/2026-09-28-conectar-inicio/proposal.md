# Conectar la pantalla de Inicio al backend

## Why

Inicio es lo primero que ve el propietario al entrar, y hoy es lo único que queda
enteramente inventado: dice que cobró $ 430.000 de $ 1.933.691, que dos cuotas están
vencidas hace nueve días y que Marta Suárez subió un comprobante el 18/08. Nada de eso
sale de su cartera. El saludo ya es real desde el 16/09/2026, lo que vuelve el contraste
peor: la pantalla lo llama por su nombre y después le miente los números.

Los cuatro bloques estaban bloqueados por cosas distintas y ya no lo están: `GET
/invoices` se puede acotar por período, `GET /pre-invoices` expone las proyecciones, y
`submittedAt` permite fechar los avisos.

## What Changes

- El resumen de cobranza del mes sale de las cuotas del período corriente: cobrado, por
  vencer y vencido, con la barra proporcional a esos tres montos.
- El conteo de propiedades sale de `GET /properties`, distinguiendo alquiladas de libres.
- La proyección del mes siguiente sale de `GET /pre-invoices`. Los contratos por índice
  sin valor publicado **no** se proyectan: se cuentan aparte y se dicen como «a definir
  según el índice», nunca sumados a un número.
- El bloque «Requieren su acción» se arma con lo que realmente pide atención —pagos
  esperando confirmación, cuotas sin confirmar, cuotas vencidas— y desaparece cuando no
  hay nada que hacer, en vez de mostrar avisos fijos.
- La lista de contratos activos sale de `GET /contracts`.
- Los avisos fechan el hecho con `submittedAt` y `dueDate` en vez de textos escritos.

## Capabilities

### New Capabilities

- `inicio` — el panel de entrada: cobranza del mes, tamaño de la cartera, proyección del
  mes siguiente y lo que requiere acción del propietario.

### Modified Capabilities

Ninguna. `propiedades` no cambia: Inicio cuenta propiedades pero no redefine cómo se
listan ni cómo se les calcula el estado.

## Impact

- `src/components/dashboard/OwnerWorkspace.tsx` — `overview` deja de leer los arrays de
  ejemplo.
- `src/lib/inicio.ts` (nuevo) — el resumen de cobranza, la proyección y la derivación de
  los avisos, siguiendo el molde de `cobranzas.ts`, `contratos.ts` y `propiedades.ts`.
- Cuatro llamadas en paralelo: `/invoices` acotado al mes, `/pre-invoices` acotado al mes
  siguiente, `/properties` y `/contracts`.
- Depende de que el backend despliegue `codex/frontend-integration-lots`. Contra el build
  viejo `/pre-invoices` no existe y la proyección no se puede mostrar.
