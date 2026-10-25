# Tasks

## 1. Tarjeta de recordatorios

- [x] 1.1 En `SettingsView` (`src/components/dashboard/OwnerWorkspace.tsx`), renderizar el bloque `<dl>` de valores sólo si `reminderSettings.enabled`
- [x] 1.2 Verificar que con `enabled` verdadero la tarjeta muestra los mismos tres valores que hoy

## 2. Tests

- [x] 2.1 Ajustar el test «apagados lo dice…» en `src/tests/components/dashboard/owner-workspace-configuracion.test.tsx` para verificar que no aparecen «7 días», «Se avisa» ni «3 días»
- [x] 2.2 Correr `npx vitest run src/tests/components/dashboard/owner-workspace-configuracion.test.tsx src/tests/lib/recordatorios.test.ts` y confirmar que pasan

## 3. Validación del change

- [x] 3.1 Correr `openspec validate corregir-recordatorios-apagados`

## 4. Layout de la tarjeta con avisos apagados

- [x] 4.1 En `SettingsView`, quitar la clase `owner-detail-grid--even` de la sección para que la tarjeta de recordatorios no se estire a la altura de Cuenta
- [ ] 4.2 Verificar visualmente con los avisos apagados que «Editar recordatorios» queda debajo del texto, sin hueco, y con los avisos encendidos que la tarjeta no cambia
- [x] 4.3 Correr de nuevo `npx vitest run src/tests/components/dashboard/owner-workspace-configuracion.test.tsx` y `openspec validate corregir-recordatorios-apagados`
