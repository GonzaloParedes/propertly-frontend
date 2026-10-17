# Design

## Context

See `proposal.md` for the motivation and `specs/contract-drafts/spec.md` for the behavior.

- `CreationWizard` runs the contract flow in steps: 1 Propiedad, 2 Inquilino, 3 Alquiler, 4 Plazo (with the elapsed-installments question), 5 Actualización, 6 Otras condiciones (skippable), 7 Revisión. Its state lives in React state: the selection or draft of property and tenant (`SeleccionDeContrato`), the terms, `otras` (`Condiciones`, with `GarantiaBorrador` items carrying a stable `id`) and the elapsed answer. Before it comes the PDF-or-manual choice (`ModoContrato`).
- Leaving with something entered goes through `pedirSalir` and the "¿Salir sin crear el contrato?" `Dialog` (`hayAlgoCargado`).
- `contracts.onboard` posts `/contracts/onboarding`. Errors are routed by section prefix (`contract-onboarding-flow` D-3).
- Inicio's "Requieren su acción" section builds `avisos` from invoices and renders `Notice` items with one action. With no notices it shows the "Nada pendiente por ahora" empty state.
- The backend change `contract-drafts` provides:
  - `GET/POST /contract-drafts`;
  - `GET/PUT/DELETE /contract-drafts/{id}` (`PUT` with `version`; `409 contract-draft-version-conflict` with `currentVersion`);
  - `PUT/GET/DELETE /contract-drafts/{id}/document` (same `import-file-*` errors as PDF import);
  - `409 contract-draft-limit-reached` with `limit`;
  - `expiresAt` on every response;
  - `draftId` in onboarding, with `404 contract-draft-not-found`.

## Goals / Non-Goals

**Goals:**
- The payload is owned by the frontend and versioned, so the wizard can change without breaking saved drafts.
- No new UI patterns: `Notice`, `Dialog`, `Button` tones and the existing wizard chrome, following `docs/design/sistema-ui.md`.

**Non-Goals:**
- Offline editing: a failed save is retried while the page is open, but nothing is queued across reloads.
- Undoing edits on a resumed draft: once saved, an edit is the draft's content.
- Drafts in the standalone property and tenant wizards.

## Decisions

### D-1. Payload shape and versioning (`src/lib/borradores.ts`)

```ts
type EstadoDelBorrador = {
  paso: number;                                   // contract step to reopen on
  propiedad: { id: number | null; nuevo: boolean; borrador: { pedido: PropertyRequest; etiqueta: string } | null };
  inquilino: { id: number | null; nuevo: boolean; borrador: { pedido: TenantRequest; etiqueta: string } | null };
  alquiler: string; diaVencimiento: number; plazo: number; inicio: string;
  metodo: "FIXED_PERCENTAGE" | "ICL" | "IPC"; porcentaje: string; frecuencia: number;
  otras: OtrasCondiciones;                        // garantías without their on-screen `id`
  pagadoHasta: string;                            // the answer to "¿Hasta qué mes le pagaron?", as given
};
// payload = { schemaVersion: 1, ...EstadoDelBorrador }
```

- Values are stored exactly as the inputs hold them, strings included, so a half-typed amount comes back as typed.
- A drafted new property or tenant is stored as its request (the same object `contracts.onboard` sends). The form fields of the detour are rebuilt from it on resume. A detour left half-typed and never confirmed is not kept.
- `serializar(state)` and `deserializar(json)` live in `borradores.ts`, with unit tests.
- `deserializar` validates the shape field by field and rebuilds `otras` from known keys only. An unknown `schemaVersion` or a broken payload returns `null`: the flow opens empty, says that the draft could not be read, and still offers to discard it. It never throws.
- Guarantees get fresh `id`s on every read: the saved ones would collide with the counter of a new session.
- The label is derived by `etiquetaDeBorrador(propiedad, inquilino)` (spec: property · tenant, or a fallback).

Alternative considered: storing the onboarding request body. Rejected because it cannot represent invalid or partial values or the current step.

### D-2. Pending steps

Pending steps are **derived, not stored**: step `n` of 1 to 6 is pending when it is blocked with the current data (`contratoBloqueado(n, …)` for steps 1 to 5, and invalid "Otras condiciones" for step 6). Completing a step unmarks it with no extra bookkeeping, and a resumed draft needs no `pendientes` in its payload.

Each step already knows whether it can continue. When it cannot, a secondary "Completar después" appears next to "Seguir"; it advances without marking anything.

The elapsed-installments question already lives in the review (it needs the dates). While the start date is pending the review lists "Plazo" as pending and asks no question; a saved answer that no longer matches the elapsed months is ignored by `respuestaVigenteDe`, so a resumed draft asks again when time has passed.

The review lists the pending steps as links under "Falta completar" and disables "Crear contrato", with that list as the reason.

### D-3. Autosave (`useAutoguardado`)

A hook owns the draft's `{id, version}` and the save state (`idle`, `guardando`, `guardado`, `error`, `limite`, `conflicto`). The wizard only tells it "the state changed" or "this is a step change".

- **Birth.** The first step change out of step 1 `POST`s the draft, then stores `{id, version}`. Before that, the hook does nothing. A resumed draft starts with its `{id, version}`.
- **Triggers:**
  - A step change saves immediately.
  - Any other state change schedules a save 2 s after the last change (debounce).
  - `pagehide`, and `visibilitychange` to `hidden`, send the last unsaved state with `fetch(…, { keepalive: true })`, which allows the `X-Requested-With` header that `sendBeacon` cannot set. This needs a `keepalive` option on `apiPut` in `src/lib/api.ts`.
- **One save at a time.** A save that is triggered while another is in flight waits for it and then sends the newest state with the version it returned. Intermediate states are skipped. This keeps the hook from conflicting with itself.
- **Dirty tracking.** The hook compares the serialized payload with the last saved one, so navigating without changes sends nothing.
- **Failures.** A network or `5xx` failure sets `error` and retries with backoff (2 s, 5 s, 15 s, then every 30 s) while the flow is open. The next successful save clears it. The entered values stay on screen in every case.
- **Indicator.** A small status next to the wizard title shows "Guardando…", "Guardado" or "No se pudo guardar". It uses an icon plus a word, per `sistema-ui.md`. Only `error`, `limite` and `conflicto` are announced, through an `<output>` with `aria-live="polite"`; successful saves are silent.
- **Resume.** "Continuar" `GET`s the draft, `deserializar`s it into the wizard, and opens at `paso`. Saved references to existing properties and tenants are checked against the freshly loaded lists. One that is no longer offered (archived, or a property that now has an active contract) is cleared, and its step is marked pending with a note explaining why.

Alternatives considered:
- Saving on every keystroke: too many requests, and every request is a chance to conflict.
- Saving only on step changes: loses a long step's typing when the tab closes.
- `localStorage` as a buffer: does not survive a change of device, which is the case we design for, and adds a second source of truth.

### D-4. Leaving and discarding

`pedirSalir` keeps its role:

- **Flow is a draft:** no dialog. It flushes any unsaved state (awaiting it, with a short timeout), closes, and shows the toast "Guardamos el contrato como borrador. Lo encuentra en Inicio."
- **Not a draft yet** (still on step 1, or birth failed because of the limit): today's "¿Salir sin crear el contrato?" dialog when something was entered, or a plain close when nothing was.
- **"Descartar borrador"** sits in the wizard header while the flow is a draft. It opens the shared discard `Dialog` (D-7) and, on confirmation, stops autosave, deletes the draft and closes.

### D-5. PDF in the review

- A file input in the review accepts `application/pdf`, and the client checks the size against the import limit before uploading.
- The review is past step 1, so the flow is normally a draft by then. Attaching uploads immediately (`PUT …/document`) and shows the stored file's name and size, with "Quitar" and "Reemplazar". A document change also updates the draft's `version`, which the hook picks up from the response before its next save.
- When the flow is not a draft (birth failed because of the limit), the file is held in memory and attached after creation through `contracts.attachDocument`.
- Upload errors reuse the import's message map in `error-codes.ts`.
- The copy says the file is stored as is and not read automatically.

### D-6. Creation from a draft

"Crear contrato" first cancels the pending debounce and waits for any save in flight. Then `contracts.onboard` sends `draftId` when the flow is a draft. After a successful creation the hook is stopped, so no late save can recreate the draft. A `404 contract-draft-not-found` resends once without `draftId`. If the draft had a document, the success screen says the PDF must be attached from the contract's detail. Other errors keep the current routing; the draft is untouched by the backend. On success, the draft list is invalidated.

### D-7. Lists, notices and expiry

- `contractDrafts.list()` loads with the rest of Inicio and Contratos.
- In Inicio, each draft becomes a `Notice` in the actions section. Its body is the label plus "editado hace N días". From 15 days before `expiresAt`, it also says "Se descarta el <fecha> si no lo retoma", with `tone="warn"`.
- The notice carries two actions, "Descartar" (secondary) and "Continuar" (primary). `Notice` today takes one `action` node, so it receives a small group of two buttons.
- In Contratos, a "Borradores" group above the list uses the same item.
- Relative dates reuse the "hace N días" helper in `src/lib/inicio.ts`.

### D-8. Version conflicts

A `409 contract-draft-version-conflict` on any save puts the hook in `conflicto`, which stops autosave, and opens a `Dialog`: "Este borrador cambió en otro dispositivo". It offers:
- "Guardar esta versión": resends with `currentVersion` and resumes autosave.
- "Cargar la otra": `GET`s the draft and reloads it into the wizard, discarding this session's unsaved changes.

Since saves are serialized (D-3), a conflict can only come from another device or tab.

### D-9. Limit

The draft count comes from the list. At 3 drafts, "Nuevo contrato" opens the resume choice without "Empezar uno nuevo", with the explanation. A `409 contract-draft-limit-reached` at birth (for example a draft created meanwhile on another device) puts the hook in `limite`. The indicator then says the contract cannot be saved as a draft until one is finished or discarded. The flow keeps working, and leaving uses the "not a draft yet" path.

## Risks / Trade-offs

- **Payload drift.** Renaming wizard fields breaks old drafts. This is mitigated by `schemaVersion` and a tested `deserializar` that never throws. Each wizard change that alters the payload must bump the version and add a migration step or accept that old drafts open with steps pending.
- **Stale references and elapsed answers** on resume. These are handled by D-3 and D-2, and the backend validates again at creation.
- **The last save on close is best-effort.**
  - A `keepalive` request may be dropped by the browser, or exceed its 64 KB in-flight budget when the payload is near the backend's limit.
  - A save already in flight at close cannot be followed by the final one.
  - At most the last two seconds of typing are lost, since step changes always save.
- **Accidental drafts.** An owner who moves past step 1 by mistake gets a draft that takes one of the 3 slots. Mitigation: it is visible right away in Inicio with "Descartar", and "Descartar borrador" is in the flow itself.
- **Request volume.** It is bounded by the debounce and dirty tracking: roughly one request per step plus one per pause in typing.
- **Edits overwrite.** Leaving a resumed draft keeps whatever was changed; there is no "salir sin guardar". This is accepted as the expected autosave behavior (see Non-Goals).
- **The 15-day warning** relies on the owner opening the app; there is no email. This is accepted for v1.

## Migration Plan

1. Ship after the backend `contract-drafts` is deployed. The client feature-detects nothing, so the routes must exist.
2. Archive `contract-onboarding-flow` before this change. Then, when archiving `contract-drafts`, edit the archived `contract-onboarding-flow` spec's "Leaving keeps nothing" requirement to point to `contract-drafts` ("Leaving keeps the draft"), so the two specs do not contradict each other.

## Differences found while implementing

- **A property preselected from its detail page** starts the contract on step 2, so the draft is born when the owner leaves step 2, not on opening.
- **The hook saves once more when the screen unmounts** with unsaved changes (the owner navigated elsewhere with the flow open), since the 2 s timer would never run.
- **The saved content is compared in a canonical form** (keys sorted): the backend stores it in a `jsonb` column that does not keep key order, so a draft that was just resumed would otherwise look modified and be saved again.
- **"Cargar la otra versión" remounts the flow** with the other device's draft (the wrapper that loads the draft swaps it in), instead of overwriting every field one by one.
- **Leaving is split in two callbacks** (`onDraftKept`, `onDraftDiscarded`) that the workspace turns into toasts, so the wizard stays independent of the toast provider.
- **A step left half-typed inside a property or tenant detour is not kept.** Only a detour confirmed with "Usar esta propiedad" / "Usar este inquilino" becomes part of the draft.
- **Drafts are reloaded whenever a list becomes visible again** (the wizard or a detail closes), instead of keeping them in sync by hand.
- **Removing the draft's PDF re-reads the draft** to learn its new version, because the backend answers that `DELETE` with no body.
- **If the PDF cannot be attached to a contract created without a draft** (the limit case), the contract stays and the owner is told to upload it from its detail.
