# Tareas

## 1. Contrato de datos

- [x] Alinear con backend `GET /tenant/calendar`: `coverage` e `invoices` de la cadena
  efectiva desde cualquiera de sus enlaces, sin contratos no relacionados.
- [x] Resolver la discrepancia de `canSubmitPayment` para cuotas impagas del contrato
  reemplazado: permitir comprobantes históricos elegibles mientras hay sucesor activo.
- [x] Añadir el tipo de respuesta y el método del cliente HTTP; conservar el método
  actual de `/tenant/invoices` para sus consumidores existentes.
- [x] Incorporar `preInvoices` como importe pendiente de confirmación, sin convertirlo
  en deuda ni habilitar acciones de comprobante.

## 2. Calendario del portal

- [x] Derivar meses desde `invoice.period` y los intervalos de `coverage`, con una
  función pura que clasifique los 12 meses de cada año.
- [x] Reemplazar la lista larga por la vista anual, selector directo de año y detalle
  accesible por mes, sin selector de contratos. Conservar las acciones y avisos actuales.
- [x] Marcar discretamente el primer mes de cada sucesor efectivo y mostrar el mismo
  historial desde el enlace original o uno sucesor.
- [x] Cubrir meses anteriores y posteriores al contrato, meses interiores sin cuota,
  huecos entre intervalos, años sin cuotas, fechas a mitad de mes y varias cuotas en un
  mismo período.
- [x] Usar `canSubmitPayment` para decidir si se ofrece cargar comprobante y volver a
  consultar el calendario al terminar; conservar el historial cuando la cadena termina.
- [x] Mantener errores y estados de carga honestos si falla la consulta.

## 3. Revisión

- [x] Probar estados y navegación con React Testing Library a nivel de comportamiento
  visible, incluyendo regreso del foco al mes al cerrar el detalle.
- [x] Revisar a 390 px y en escritorio que los 12 meses, textos y acciones sean legibles.
- [ ] Validar el prototipo con la mamá de Nacho sin guiar sus acciones; anotar confusiones
  sobre el cambio de condiciones y las cuotas anteriores pendientes, y ajustar antes de
  desplegar el cambio.
