# Tasks

## 1. API client and payload

- [x] 1.1 Add the draft types to `src/lib/backend-types.ts`, `contractDrafts` (`list`, `get`, `create`, `update`, `remove`, `attachDocument`, `getDocument`, `removeDocument`) to `src/lib/backend-client.ts`, `draftId` to `ContractOnboardingRequest`, and the `contract-draft-*` codes to `src/lib/error-codes.ts`. Verify with client tests for the routes, the `X-Requested-With` header on mutations, and the mapping of `limit` and `currentVersion`.
- [x] 1.2 Create `src/lib/borradores.ts` with `serializar`, `deserializar` (`schemaVersion` 1; never throws), `etiquetaDeBorrador` and `diasParaVencer` (D-1, D-7). Verify with unit tests for the round trip of a partial state with drafted property and tenant, guarantees with their `id`, a half-typed amount, an unknown version, a broken payload, and every label fallback.

## 2. Pending steps in the wizard

- [x] 2.1 Add "Completar después" and `pendientes` to `CreationWizard` (D-2): mark and unmark steps, show the elapsed question as pending while its inputs are, and list pending steps in the review with links, keeping "Crear contrato" disabled with the reason. Verify with RTL tests for the scenarios of "Steps can be completed later".

## 3. Autosave, resume and leave

- [x] 3.1 Add a `keepalive` option to `apiPut` (`src/lib/api.ts`), and create `useAutoguardado` (D-3): creation on leaving step 1, a save on every step change, a 2 s debounce, serialized saves that send the newest state, dirty tracking, retry with backoff, and the final `keepalive` save on `pagehide`/`visibilitychange`. Verify with hook tests using fake timers for:
  - no request before step 1 is left;
  - one `POST`, then `PUT`s with the returned version;
  - no save without changes;
  - two quick changes sending only the newest state, after the in-flight save;
  - a retry after a network failure;
  - the final save sent with `keepalive`.
- [x] 3.2 Wire the hook into `CreationWizard`: the header indicator ("Guardando…", "Guardado", "No se pudo guardar", limit) with only failures announced, leaving without a dialog plus the toast once it is a draft, today's dialog before that, and "Descartar borrador" in the header (D-3, D-4, D-9). Verify with RTL tests for the scenarios of:
  - "The contract flow becomes a draft after its first step";
  - "A draft saves itself";
  - "The flow shows whether the draft is saved";
  - "Leaving keeps the draft";
  - "A draft can be discarded from the flow".

  Include that nothing calls `contracts.onboard`, `properties.create` or `tenants.create` while autosaving.
- [x] 3.3 Implement resume: load the draft, open on `paso`, clear stale property and tenant references, and reset the elapsed answer when the periods changed (D-3). Verify with RTL tests for resuming on the saved step, an archived tenant reference becoming a pending step, and an unreadable payload offering only to discard.
- [x] 3.4 Handle `contract-draft-version-conflict` by stopping autosave and opening the conflict dialog (D-8). Verify with RTL tests that no further save is sent while the dialog is open, "Guardar esta versión" resends with `currentVersion` and resumes autosave, and "Cargar la otra" reloads the draft.

## 4. PDF in the review

- [x] 4.1 Add the optional PDF attachment to the review (D-5): upload it immediately to the draft and pick up the new `version`, remove or replace it, and hold it in memory when the flow is not a draft, attaching it after creation. Map `import-file-*` errors with the import's messages. Verify with RTL tests for attaching, an encrypted-PDF error keeping the draft, the next autosave using the version returned by the upload, and creation without a draft attaching through `contracts.attachDocument`.

## 5. Creating from a draft

- [x] 5.1 Before creating, cancel the pending debounce and wait for any save in flight; stop the hook after success. Send `draftId` on creation, retry once without it on `contract-draft-not-found` and say the PDF must be attached from the detail, and refresh the draft list on success (D-6). Verify with RTL tests for the scenarios of "Creating the contract consumes the draft", and that no save is sent after the contract is created.

## 6. Inicio, Contratos and "Nuevo contrato"

- [x] 6.1 Add draft notices to Inicio's actions section with "Continuar" and "Descartar", and the expiry warning from 15 days before; the section no longer says "Nada pendiente" while drafts exist (D-7). Verify with RTL tests for the modified `inicio` scenarios and the expiry scenarios.
- [x] 6.2 Add the "Borradores" group to Contratos and the confirmed discard `Dialog` (danger style, names the draft and its PDF). Verify with RTL tests for "Discarding a draft is confirmed" from both places.
- [x] 6.3 Make "Nuevo contrato" (and "Cargar mi primer contrato") offer to continue an existing draft before the PDF-or-manual choice, without "Empezar uno nuevo" at the limit (D-9). Verify with RTL tests for "New contract with a draft pending" and "At the limit".

## 7. Documentation and checks

- [x] 7.1 Update `docs/design/sistema-ui.md` with the autosave indicator, leaving a draft without a dialog (and why), "Descartar borrador" in the wizard header, "Completar después" and the draft notice with two actions. Then check the screens in `/prototipo` on desktop and at phone width (wizard, review with PDF, Inicio, Contratos) against the design system.
- [x] 7.2 Run `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build`, and `openspec validate contract-drafts --strict`. Verify that all pass.
