# Tareas

## 1. Derivación, en un módulo aparte

- [x] 1.1 Crear `src/lib/contrato-detalle.ts` con `condicionesComerciales`: las condiciones
      pactadas en pares etiqueta/valor, omitiendo las que no se cargaron.
- [x] 1.2 Formatear importes según la moneda del contrato, no siempre en pesos.
- [x] 1.3 `proximaActualizacion`: fecha y, sólo cuando viene, el importe; si no hay fecha,
      no hay hito.
- [x] 1.4 `historialDeAumentos`: cada aumento en una línea, con el período del índice
      cuando corresponde.
- [x] 1.5 `vigenciaEnFechas`: «del X al Y», con la fecha real de fin si terminó antes.
- [x] 1.6 Tests de las cinco, incluido el contrato sin ninguna condición cargada.

## 2. Carga

- [x] 2.1 Pedir `GET /contracts/{id}` al abrir el detalle, con estado de carga y error.
- [x] 2.2 Pedir el historial aparte, de modo que su fallo no voltee la pantalla.
- [x] 2.3 Que la fila de Contratos lleve al detalle.

## 3. La vista

- [x] 3.1 Encabezado con propiedad, inquilino y vigencia en fechas.
- [x] 3.2 Alquiler vigente, estado y día de vencimiento.
- [x] 3.3 Línea de tiempo: inicio, próxima actualización y fin, omitiendo el hito que no
      tenga dato.
- [x] 3.4 Tarjeta de condiciones comerciales, ausente si no hay ninguna.
- [x] 3.5 Tarjeta de historial de aumentos, con su estado vacío.
- [x] 3.6 Contrato reemplazado: indicarlo y llevar al sucesor.
- [x] 3.7 Retirar «Cambiar condiciones» y la frase sobre la vigencia del enlace.

## 4. Acceso del inquilino

- [x] 4.1 «Copiar enlace» pide `GET /contracts/{id}/tenant-access` y copia el resultado.
- [x] 4.2 Confirmación al copiar y aviso si falla.
- [x] 4.3 Ofrecer el reenvío por correo como acción distinta.

## 5. Documento firmado

- [x] 5.1 Descargar el documento con su nombre real.
- [x] 5.2 Adjuntar, advirtiendo que reemplaza al anterior si ya había uno.
- [x] 5.3 Quitar el documento.
- [x] 5.4 Mostrar tamaño y fecha de carga, omitiendo la fecha si no viene.
- [x] 5.5 Manejo de error en las tres acciones.

## 6. Finalizar el contrato

- [x] 6.1 Diálogo con fecha de terminación y la advertencia sobre las cuotas futuras.
- [x] 6.2 Llamar a `POST /contracts/{id}/terminate` y reflejar el nuevo estado.
- [x] 6.3 Ofrecer la acción sólo sobre un contrato vigente.
- [x] 6.4 Traducir el error del backend.

## 7. Verificación

- [x] 7.1 Tests de la vista: las cinco tarjetas, sus estados vacíos y los errores.
- [x] 7.2 `npm test`, `npx tsc --noEmit` y `npm run lint`.
- [x] 7.3 Probar contra el backend local: enlace, documento en sus tres verbos y
      terminación.
- [x] 7.4 Actualizar el estado de las pantallas en `docs/design/sistema-ui.md`.
