# Spec funcional · Ver los pagos del otro en vivo

**Para:** front (`alquia-frontend`) y back (`propertly-backend`).
**Qué es:** las reglas de negocio que los dos tienen que cumplir. No dice cómo se ven las pantallas
ni cómo es la API: eso lo decide cada lado. El contrato técnico del canal de eventos lo define el
back en su propio change (`payment-live-updates`). Si una regla de acá no se puede cumplir, se
discute la regla, no se resuelve en silencio de un solo lado.

## Contexto

Hoy el propietario y el inquilino trabajan sobre el mismo pago desde lados distintos. El inquilino
sube un comprobante; el propietario lo confirma o lo rechaza. Cada uno ve el cambio en su propia
pantalla al instante, pero la otra persona no lo ve hasta recargar. Con la sesión abierta, eso deja
acciones que ya no aplican (un botón «Confirmar» sobre un pago que ya se confirmó) y mensajes que
dicen algo viejo (un «Pendiente de revisión» que ya fue rechazado).

## Definiciones

- **Pago:** la cuota de un mes con su comprobante y su estado de revisión.
- **Cambio de pago:** cuando el inquilino sube un comprobante, o el propietario confirma o rechaza
  un pago. Son los únicos cambios que este spec cubre.
- **Pantalla afectada:** la vista de cobranzas del propietario, o la del inquilino, que muestra ese
  pago.

## Reglas

**R1 · El otro ve el cambio sin recargar.** Cuando ocurre un cambio de pago, la persona del otro
lado de ese pago ve su nuevo estado en la pantalla afectada, sin recargar la página ni hacer ninguna
acción.

**R2 · Cada uno ve sólo lo suyo.** El propietario recibe cambios sólo de pagos de sus contratos. El
inquilino recibe cambios sólo de pagos de su contrato y de los contratos que lo continúan. Un cambio
fuera de ese alcance no modifica ninguna pantalla de esa persona.

**R3 · Al conectarse, se vuelve a cargar.** Cada vez que la conexión de actualizaciones se establece,
la pantalla afectada vuelve a cargar sus datos. Los cambios ocurridos mientras no había conexión no
se reenvían, así que esta recarga es la única forma de ponerse al día.

**R4 · Cortar la conexión no es un error.** Que la conexión se corte, se renueve o se reconecte no
muestra ningún mensaje de error ni interrumpe lo que la persona está haciendo. Se reconecta sola.

**R5 · Ninguna acción sobre un dato viejo se aplica en silencio.** Si la persona intenta confirmar,
rechazar o subir un comprobante sobre un pago que ya cambió (por el otro lado o por otra pestaña), la
acción no se aplica. La persona ve el estado actual del pago y puede decidir de nuevo.

**R6 · La actualización no pisa lo que la persona está haciendo.** Un cambio que llega mientras hay
un diálogo abierto, o un comprobante que se está eligiendo o subiendo, no cierra el diálogo ni borra
lo que la persona cargó. Los datos de fondo se actualizan; el diálogo sigue abierto.

**R7 · Sin sesión, no hay actualizaciones.** Si la sesión venció, las actualizaciones se detienen y
la persona sigue el flujo de sesión vencida que ya existe. No se muestra un error nuevo por la
conexión.

**R8 · Lo que ya se ve correcto no cambia.** Un cambio de pago que llega cuando la pantalla ya tiene
ese mismo estado no produce ningún parpadeo, ni recarga visible, ni cambio de posición en la lista.

**R9 · Actualizar siempre, avisar sólo cuando hace falta.** Todo cambio de pago actualiza la pantalla
en silencio (datos, estado y acciones disponibles). Además, muestra un aviso breve sólo en estos
casos:
- al propietario, cuando llega un comprobante nuevo que espera su confirmación;
- al inquilino, cuando su pago fue confirmado o rechazado.

**R10 · Lo propio no genera aviso.** La persona que confirma, rechaza o sube un comprobante también
recibe el cambio, porque el aviso de cambio no dice quién lo hizo. Un aviso aparece sólo si el estado
que llega es distinto del que la pantalla ya muestra. Así, quien confirma un pago no ve un aviso por
su propia acción.

**R11 · Abrir demasiadas pantallas.** Cada persona puede tener un número limitado de pantallas con
actualizaciones en vivo abiertas a la vez. Si abre una más, la más antigua deja de recibir cambios y
no vuelve a conectarse sola, para no pelearse con la nueva. La pantalla nueva sigue funcionando
normalmente.

**R12 · La cadena del inquilino se fija al conectarse.** Los contratos que continúan al del inquilino
se toman al conectarse. Si uno nuevo entra en la cadena mientras la pantalla está abierta, sus pagos
empiezan a llegar en la próxima conexión (como mucho, a los diez minutos).

## Escenarios

**E1 · El inquilino sube un comprobante.** El propietario tiene abierta la cobranza del mes. El
inquilino sube el comprobante de octubre.
→ En la pantalla del propietario, la cuota de octubre pasa a «Pendiente de revisión» con la acción
de revisar, sin recargar (R1).

**E2 · El propietario rechaza.** El inquilino tiene abierta su vista con el comprobante subido. El
propietario lo rechaza indicando el motivo.
→ En la vista del inquilino aparece que el comprobante fue rechazado, con el motivo, y puede subir
otro (R1).

**E3 · Un contrato ajeno.** Otro propietario confirma un pago de un contrato que no es suyo.
→ La pantalla de este propietario no cambia (R2).

**E4 · Se corta la red.** El propietario pierde la conexión durante dos minutos. En ese tiempo, el
inquilino sube un comprobante.
→ Al reconectarse, la cobranza se vuelve a cargar y muestra el comprobante nuevo (R3). No aparece
ningún error mientras tanto (R4).

**E5 · Renovación cada diez minutos.** Una persona tiene la pantalla abierta más de diez minutos sin
que pase nada.
→ La conexión se renueva sola. La persona no ve nada ni pierde su lugar en la pantalla (R4, R8).

**E6 · Confirmar un pago que ya cambió.** El propietario tiene abierta la revisión de un pago. Mientras
tanto, el inquilino reemplaza el comprobante por uno nuevo.
→ Al confirmar, la acción no se aplica sobre el comprobante viejo. La persona ve el estado actual del
pago y el comprobante nuevo (R5).

**E7 · Dos pestañas del propietario.** El propietario rechaza un pago en una pestaña. En otra pestaña
tiene abierta la misma revisión y la confirma.
→ La confirmación no se aplica. La segunda pestaña muestra que el pago ya fue rechazado (R5).

**E8 · Diálogo abierto mientras cambian los datos.** El propietario está escribiendo el motivo de un
rechazo. Llega un comprobante nuevo de otra cuota.
→ El diálogo sigue abierto con lo escrito. La lista de fondo muestra la cuota nueva (R6).

**E9 · Sesión vencida.** La sesión del inquilino vence con la pantalla abierta.
→ Las actualizaciones se detienen y la persona ve el flujo de sesión vencida que ya existe. No
aparece un error de conexión aparte (R7).

**E10 · El propietario confirma.** El propietario confirma un pago desde su pantalla.
→ Su cobranza se actualiza en silencio y no aparece ningún aviso, porque el estado que llega ya es
el que muestra (R10). El inquilino ve el aviso «Pago confirmado» (R9).

**E11 · Tercera pantalla.** El propietario tiene tres pantallas abiertas, y el límite es dos. Abre la
tercera.
→ La más antigua deja de recibir cambios sin reconectarse. Las otras dos y la nueva siguen
actualizándose (R11).

## Fuera de alcance

- Avisos fuera de la pantalla: notificaciones del navegador, correo o mensajes al celular.
- Actualizar en vivo otros cambios que no sean pagos: contratos, cuotas nuevas, ajustes, inquilinos
  o propiedades.
- Historial de cambios de un pago en la pantalla.
- Que el otro lado vea quién está mirando el pago.

## Para acordar

Cada lado anota acá lo que decide y lo que necesita saber del otro, con fecha.

- **Back (verificado en el código, 04/10/2026):** el canal de eventos está commiteado en `propertly-backend`,
  commit `a93feae` (`feat: add live payment status updates over SSE`), en la rama
  `codex/frontend-integration-lots`. Su contenido coincide con lo verificado. Además, al superar el límite
  el back manda un evento `replaced` antes de cerrar la conexión más antigua. Ese evento no estaba en el
  mensaje original y el front lo tiene en cuenta para R11.
- **Back:** propone que el cambio se mande en silencio, y que el aviso breve sea sólo el de R9. Por
  ahora no agrega a los eventos quién hizo el cambio: R10 se resuelve comparando estados en el
  front. Si el front necesita ese dato, lo puede agregar.
- **Front (implementado, 04/10/2026):** R9 y R10 se implementaron tal como están. El aviso compara el estado
  que llega con el que la pantalla ya muestra, así que la propia acción no genera aviso. Un
  comprobante que llega antes de la primera carga no avisa, porque no hay con qué comparar; sí aparece
  en la lista. R11: la pestaña desplazada cierra su stream sin reconectarse y no muestra nada; queda
  con los últimos datos. Si el back o producto quieren un aviso ahí, se agrega.
- **Ambos:** pendiente sólo qué ve la pantalla desplazada (R11). Hoy: últimos datos, sin aviso.
