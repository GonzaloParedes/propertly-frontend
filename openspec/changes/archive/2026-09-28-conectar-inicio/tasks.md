# Tareas

## 1. Derivación, en un módulo aparte

- [x] 1.1 Crear `src/lib/inicio.ts` con `periodoCorriente` y `periodoSiguiente`, que
      devuelven el `period` como fecha ISO completa del día 1.
- [x] 1.2 `resumenDeCobranza`: cobrado, por vencer, vencido y total emitido, apoyándose en
      los criterios de estado que ya define `cobranzas.ts`.
- [x] 1.3 `proyeccionDelMes`: suma de las pre-cuotas más el conteo de contratos vigentes
      sin proyección. Sin ninguna proyección no devuelve total.
- [x] 1.4 `avisosPendientes`: pagos esperando, cuotas sin confirmar y vencidas agrupadas,
      cada uno con lo que la pantalla necesita decir.
- [x] 1.5 Tests de las cuatro, incluidos el mes sin cuotas y la cartera enteramente por
      índice.

## 2. Carga

- [x] 2.1 Pedir las cuatro listas en paralelo cuando la vista es Inicio y no es demo.
- [x] 2.2 Estado de carga y de error para las tres necesarias.
- [x] 2.3 Que la proyección falle sola sin voltear la pantalla.

## 3. La vista

- [x] 3.1 Resumen de cobranza con sus tres montos, el total emitido y la barra
      proporcional, con su descripción accesible al día.
- [x] 3.2 Conteo de propiedades.
- [x] 3.3 Tarjeta de proyección, con el caso «a definir según el índice» y el caso sin
      total.
- [x] 3.4 Bloque de avisos derivado, con su estado de «nada pendiente».
- [x] 3.5 Lista de contratos vigentes.
- [x] 3.6 Estados vacíos: sin propiedades, sin contratos, sin cuotas del mes.
- [x] 3.7 Que `/prototipo` siga mostrando el panel de ejemplo.

## 4. Verificación

- [x] 4.1 Tests de la vista: los cinco bloques, sus estados vacíos y el error.
- [x] 4.2 `npm test`, `npx tsc --noEmit` y `npm run lint`.
- [x] 4.3 Probar contra el backend local con la rama, incluida una cartera por índice.
- [x] 4.4 Actualizar el estado de las pantallas en `docs/design/sistema-ui.md`.
