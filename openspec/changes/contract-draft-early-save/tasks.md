# Tasks

## 1. Payload v2

- [x] 1.1 In `src/lib/borradores.ts`, add `desvio`, `formularioPropiedad` and `formularioInquilino` to `EstadoDelBorrador` and raise `VERSION_DEL_PAYLOAD` to 2 (D-2). Move `formularioDePropiedad` / `formularioDeInquilino` here to migrate v1 on read, and validate the new fields with per-field fallbacks. Verify with unit tests for:
  - a v2 round trip with an open property detour on step 4 and an unconfirmed address;
  - a v1 fixture that opens with `desvio: null` and forms rebuilt from its confirmed requests;
  - an out-of-range `desvio.paso` and an unknown `desvio.tipo`;
  - an unknown version still returning `null`.
- [x] 1.2 Make the label use the unconfirmed address, once its location is complete, when there is no confirmed or existing property (D-2). Verify with unit tests for "Lavalle 950" from a complete location alone, no property part while the location is incomplete, and the confirmed property winning over it.

## 2. API client

- [x] 2.1 Add `keepalive` and `headers` options to `apiPost` (`src/lib/api.ts`) and an `{ idempotencyKey, keepalive }` option to `contractDrafts.create` (`src/lib/backend-client.ts`) that sends `Idempotency-Key` (D-4). Verify with client tests that the header and `keepalive` reach `fetch`, alongside `X-Requested-With`, and that a `200` replay is parsed like a `201`.

## 3. Autosave hook

- [x] 3.1 In `useAutoguardado`, replace `paso` with `posicion` (any change saves immediately) and generate one idempotency key per mount, reused by every creation attempt (D-3, D-4). Verify with fake-timer hook tests for:
  - a `posicion` change saving without waiting 2 s;
  - a failed creation retried with the same key;
  - a `200` replay adopting `id` and `version` and then `PUT`ting newer content.
- [x] 3.2 Send the final save on `pagehide`, `visibilitychange: hidden` and unmount also when the draft is unborn, as a `keepalive` `POST` with the key, and send nothing extra while a `POST` is in flight (D-4). Verify with hook tests for both cases.

## 4. Wizard

- [x] 4.1 Add `hayAlgoPropio` to `CreationWizard`, drive the hook's `activo` with it, pass the `posicion` key, and serialize the detour and both forms (D-1, D-2, D-3). Verify with RTL tests for the scenarios of "The contract flow becomes a draft with the owner's first own input", including:
  - no `POST` when choosing an existing property, typing in the address search, or choosing a search result without a number;
  - one `POST` right after choosing a complete search result, and right after typing the missing number by hand;
  - no save per keystroke while typing the street by hand once the location is complete (only after the 2 s pause);
  - the preselected-property case.

  Include that nothing calls `properties.create`, `tenants.create` or `contracts.onboard`.
- [x] 4.2 Resume into the detour: pass `desvio` and `pasoDesvio` to `useNavegacion`, and restore the forms from the payload (D-6). Verify with RTL tests for "Resume a half-loaded property" and for "Atrás" from the detour's first step returning to the saved contract step.
- [x] 4.3 Rework leaving (D-5): delete `hayAlgoCargado` and the "¿Salir sin crear el contrato?" text, flush and toast for an unborn flow with own input, and add the limit dialog. Verify with RTL tests for the scenarios of "Leaving keeps the draft", plus a failed creation on leaving showing "No pudimos guardar…".
- [x] 4.4 Cover the indicator for an unborn flow. Verify with RTL tests for "Draft could not be created" (exactly one `POST` key across retries, the location stays on screen) and "Limit reached from another device" (409 at birth while loading a new property).

## 5. Documentation and checks

- [ ] 5.1 Update `docs/design/sistema-ui.md`:
  - "Salir se confirma sólo si…" in the `contract-onboarding-flow` section;
  - "Nace al salir del primer paso" in "Contratos a medio cargar", which becomes "nace con lo primero que carga el propietario", with the reason;
  - the limit dialog on leaving.

  Then check the wizard in `/prototipo`, on desktop and at phone width, against the design system.
- [x] 5.2 Run `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` and `openspec validate contract-draft-early-save --strict`. Verify that all pass.

## 6. Remove «Completar después»

- [x] 6.1 Delete `BotonCompletarDespues`, `puedeCompletarDespues` and the `.owner-wizard-later` CSS from the wizard, keeping the derived pending steps and the review list (D-7). Rewrite the "pasos para completar después" tests in `creation-wizard.test.tsx`: the button is never offered, with a step complete or incomplete; «Seguir» stays unavailable until the step is valid; a resumed draft with an archived tenant lists "Inquilino" in the review with a link, blocks «Crear contrato», and completing it from the link enables it. Move the two birth tests that clicked the button («Completar después» on step 1, and with the property preselected) to «Seguir». Verify with `npx vitest run src/tests/components/dashboard/creation-wizard.test.tsx` and that no source or test mentions the button except to assert its absence.
- [x] 6.2 Update `docs/design/sistema-ui.md`: replace the «Completar después» bullet in "Contratos a medio cargar" with how an owner who lacks a datum proceeds (leaves and resumes) and what still makes a step pending, and add the removal to *Rechazado* with its reason. Verify by reading the section and searching the file for the old button name.
- [x] 6.3 Run `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` and `openspec validate contract-draft-early-save --strict` again. Verify that all pass.
