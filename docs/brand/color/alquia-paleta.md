# Paleta de color Alquia · v1.1

> CMYK y Pantone son referencias de conversión más cercanas. Validar con prueba de color de la imprenta antes de producción.

## Colores de marca

| Color | HEX | RGB | CMYK (ref.) | Pantone (ref.) | Uso |
|---|---|---|---|---|---|
| Índigo | #5B4BC4 | 91, 75, 196 | 54 / 62 / 0 / 23 | 2098 C | Color líder: acciones, marca, fondos hero |
| Rosa | #DB4C8E | 219, 76, 142 | 0 / 65 / 35 / 14 | 7423 C | Acento (máx. 10% de una pieza); techo del isotipo |
| Tinta | #1E1B2E | 30, 27, 46 | 35 / 41 / 0 / 82 | 5255 C | Texto principal, fondos oscuros |
| Lila | #A79AF0 | 167, 154, 240 | 30 / 36 / 0 / 6 | 2705 C | Acentos sobre fondos oscuros |
| Rosa claro | #F5A6CB | 245, 166, 203 | 0 / 32 / 17 / 4 | 217 C | Techo del isotipo sobre índigo |
| Superficie | #F6F5FC | 246, 245, 252 | 2 / 3 / 0 / 1 | — | Fondo de pantallas y tarjetas suaves |
| Gris | #514D63 | 81, 77, 99 | 18 / 22 / 0 / 61 | 5285 C | Texto secundario |
| Blanco | #FFFFFF | 255, 255, 255 | 0 / 0 / 0 / 0 | — | Fondos, texto sobre índigo |

## Colores semánticos de interfaz

| Rol | Texto/ícono | Fondo suave | Uso |
|---|---|---|---|
| Éxito | #1E874B | #E6F4EC | Pagado, confirmaciones |
| Advertencia | #B26A00 | #F8EFDB | Por vencer, avisos |
| Error | #CE3F53 | #FBE9EC | Vencido, errores |
| Info | #5B4BC4 | #E7E3F8 | Contratos, notas neutras |

## Bordes y líneas
- Borde de tarjeta (producto): #DEDAF0
- Borde de campo (inputs): #C4BEE4
- Divisor suave / editorial: #EDEBF7 — separadores internos y layout del manual; NO usarlo como borde de tarjeta en producto
- Hover de fila: #F1EFFA

## Estados de interacción (botón primario y todo elemento interactivo)
- Normal: fondo #5B4BC4, texto blanco
- Hover: #463AA0 (un paso más oscuro)
- Active / pressed: #3A3084 (dos pasos)
- Focus visible: ring lila #A79AF0 de 3 px con separación blanca de 2 px; sobre fondos oscuros, ring blanco
- Disabled: fondo #E7E3F8, texto #9B95B5, sin sombra ni cursor pointer
- El rosa #DB4C8E NUNCA es fondo de botón/CTA: es acento decorativo o texto ≥ 24 px bold

## Combinaciones permitidas
- Texto tinta (#1E1B2E) sobre blanco o superficie ✓
- Texto gris (#514D63) sobre blanco o superficie ✓ (solo secundario)
- Texto blanco sobre índigo (#5B4BC4) o tinta ✓
- Índigo sobre blanco ✓ (texto y botones)
- Rosa sobre blanco: SOLO decorativo o texto ≥ 24 px bold; nunca fondo de botón/CTA
- Nunca: rosa sobre índigo, lila sobre blanco, gris sobre índigo

## Modo oscuro
- Texto secundario sobre índigo o tinta: #DDD9F0 (manual, sección 10 — paneles hero, formularios de auth)

## Contraste WCAG (texto normal, umbral AA = 4.5:1)

| Combinación | Ratio aprox. | AA texto normal | AA texto grande |
|---|---|---|---|
| Tinta sobre blanco | 16.2:1 | ✓ | ✓ |
| Gris sobre blanco | 7.5:1 | ✓ | ✓ |
| Índigo sobre blanco | 6.3:1 | ✓ | ✓ |
| Blanco sobre índigo | 6.3:1 | ✓ | ✓ |
| Blanco sobre tinta | 15.4:1 | ✓ | ✓ |
| Éxito sobre blanco | 4.9:1 | ✓ | ✓ |
| Advertencia sobre blanco | 4.7:1 | ✓ | ✓ |
| Error sobre blanco | 4.6:1 | ✓ | ✓ |
| Rosa sobre blanco | 3.9:1 | ✗ | ✓ (≥18 pt / 24 px bold) |
| Lila sobre índigo | 2.3:1 | ✗ decorativo solamente | ✗ |
