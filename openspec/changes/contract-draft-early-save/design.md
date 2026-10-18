# Design

## Context

See `proposal.md` for the motivation and `specs/contract-drafts/spec.md` for the behavior. This builds on the in-flight `contract-drafts` change (its D-1 to D-9), which is implemented but not archived.

- `CreationWizard` navigates with `useNavegacion`: `pasoContrato` (1–7), plus `desvio` (`"property" | "tenant" | null`) and `pasoDesvio`. The property detour has 4 steps (address, category, characteristics, extras); the tenant detour has 1.
- The detour forms live in the wizard's own state:
  - property: `direccion`, `unidad`, `categoria`, `bedrooms`, `bathrooms`, `superficie`, `mascotas`, `amoblada`;
  - tenant: `nombre`, `apellido`, `cuit`, `correo`, `telefono`.

  They survive leaving the detour. The address search text lives inside `AddressField` and only reaches `direccion` when a result is chosen.
- Today the payload (`schemaVersion` 1) keeps only *confirmed* detours (`borradorPropiedad` / `borradorInquilino`, as requests). The forms are rebuilt from those requests on resume (`formularioDePropiedad`, `formularioDeInquilino`).
- `opcionesDeAutoguardado` sets the hook's `activo` to "resumed, or `pasoContrato` past the initial step". The hook creates the draft on the first save after `activo` turns true. A step change is detected by comparing `paso`, and only `pasoContrato` is passed.
- On failure, `useAutoguardado` retries the `POST` with backoff. `pagehide` and unmount only send a final `PUT`, so nothing is sent while the draft has no `id`.
- `pedirSalir`: a draft flushes and closes with a toast, or shows "No pudimos guardar los últimos cambios" if that flush fails. Otherwise, `hayAlgoCargado` opens "¿Salir sin crear el contrato?", or the flow just closes.

## Goals / Non-Goals

**Goals:**
- One definition of "own input", used both to create the draft and to decide how leaving behaves.
- Old (`schemaVersion` 1) drafts keep opening exactly as they do today.
- A creation that is retried or sent at page close never takes a second draft slot.

**Non-Goals:**
- Restoring the address search text.
- Changing how the standalone property and tenant wizards save. They still do not use drafts.

## Decisions

### D-1. "Own input" is derived from state (`hayAlgoPropio`)

A pure function in the wizard returns true when any of these holds:
- `ubicacionCompleta`: `direccion` has non-blank `street`, `number`, `city` and `province`, the same condition that unblocks the address step (`propiedadBloqueada(1, …)`, which should reuse it). A search result may lack some of them, and the step then asks for them by hand. Until they are complete, nothing of the new property counts: `unidad` and `postalCode` are on the same step, and steps 2–4 cannot be reached;
- any tenant form field is non-blank;
- `borradorPropiedad` or `borradorInquilino` is set;
- `pasoContrato` is past the initial step (1, or 2 when the property was preselected).

The hook's `activo` becomes `guardaBorrador && (retomando || hayAlgoPropio)`. The hook already makes birth sticky (`nacio`), so clearing the field later keeps the draft. This matches the spec's "remains one".

Choosing an existing property or tenant changes only `propiedadId` / `inquilinoId`, which the function ignores. The same holds on the tenant step of a preselected flow; that case is an assumption, since the requirement only mentions properties. The search text never reaches the wizard state, so it is excluded with no special case.

`hayAlgoCargado` and its list of fields are deleted. Leaving uses `hayAlgoPropio` (D-5).

Alternative considered: emitting an explicit "birth" event from each input handler. Rejected because it spreads the rule over a dozen handlers and is easy to miss on the next field.

### D-2. Payload `schemaVersion` 2 (`src/lib/borradores.ts`)

```ts
type EstadoDelBorrador = {
  paso: number;
  desvio: { tipo: "property" | "tenant"; paso: number } | null;   // new
  formularioPropiedad: {                                           // new: as on screen
    direccion: Direccion | null; unidad: string; categoria: PropertyCategory | null;
    bedrooms: number | null; bathrooms: number | null; superficie: string;
    mascotas: boolean; amoblada: boolean;
  };
  formularioInquilino: { nombre: string; apellido: string; cuit: string; correo: string; telefono: string }; // new
  // …the rest of v1 unchanged: propiedad, inquilino, alquiler, …, pagadoHasta
};
```

- The forms are always serialized, whether or not a detour is open, because they live in state regardless. Resuming then restores exactly what the session had.
- `deserializar` accepts versions 1 and 2:
  - **v1 is migrated on read:** `desvio: null`, and the forms are rebuilt from the confirmed requests with the existing `formularioDePropiedad` / `formularioDeInquilino`, which move into `borradores.ts`.
  - The first save of a resumed v1 draft writes v2.
  - Any other version, or a broken payload, still returns `null` (contract-drafts D-1).
- Validation, field by field:
  - `desvio.paso` is clamped to the detour's step count;
  - an unknown `desvio.tipo` becomes `null`;
  - `direccion` requires its string fields;
  - `categoria` must be a known category.

  A bad field falls back to its empty value instead of rejecting the draft.
- `VERSION_DEL_PAYLOAD` becomes 2. The payload stays far below the backend's 64 KB: the new fields add well under 1 KB.
- **Label:** while there is no confirmed new property but the location is complete (`ubicacionCompleta`, D-1), the property part of the label is `etiquetaDePropiedad(direccion, unidad)`. A confirmed draft or an existing property still takes precedence, as today.

### D-3. Position changes save immediately

The hook's `paso` input becomes `posicion: string`, a key built by the wizard as `${pasoContrato}|${desvio ?? "-"}|${pasoDesvio}|${ubicacionCompleta}`. Any change of the key saves right away; every other change still waits 2 s.

- Including the detour and its step makes detour step changes immediate, as the spec requires.
- Including `ubicacionCompleta` (a boolean, not the address values) makes completing the location immediate, whether it was completed by choosing a search result or by typing its last missing field. Typing the street or number by hand does not change the key on every keystroke, so those edits still wait 2 s.

Typing a tenant's name is not a position change, so that birth waits for the 2 s pause. If the page closes first, D-4's final creation covers it.

Alternative considered: a separate `guardarYa()` that the wizard calls after `setDireccion`. Rejected because the call would run before the re-render and send the previous state. That is the same stale-ref problem the hook avoids by reacting to props.

### D-4. Idempotent creation

- `useAutoguardado` generates one key per mount with `crypto.randomUUID()`, kept in a ref. `contractDrafts.create(body, { idempotencyKey, keepalive })` sends it as the `Idempotency-Key` header. A resumed draft never creates, so its key is unused.
- Every creation attempt from that session reuses the key: the first one, the backoff retries, and the final one. The backend answers a repeated key with the draft it already created (`200` instead of `201`; backend D-1). The hook adopts `id` and `version` from either response. Its dirty tracking then compares contents, and the next `PUT` sends anything newer.
- **Final save while unborn:** `pagehide`, `visibilitychange: hidden` and unmount now also fire when the draft has no `id` but `nacio` is true. They send a `keepalive` `POST`. When a `POST` is already in flight, they send nothing more (as with `PUT` today).
- `apiPost` gains `keepalive` and `headers` options, like `apiPut`.
- **No retries after the wizard closes.** The last save on unmount is sent once; if it fails, the hook does not schedule backoff retries. An owner who chose "Salir igual" after the warning should not find the draft created later in the background.

Alternative considered: creating the draft empty on opening the flow and only `PUT`ting afterwards. Rejected because it spends a slot on every accidental open, which is exactly what the spec forbids.

### D-5. Leaving

`pedirSalir` becomes:

| Situation | Behavior |
|---|---|
| `esBorrador`, or `hayAlgoPropio` while the hook is not in `limite` (unborn because creation is pending, failing or in flight) | `salirConservandoBorrador`: flush (which creates if needed), then the toast. If the flush fails: "No pudimos guardar los últimos cambios" (already exists). For an unborn flow its text says the contract was not saved as a draft. |
| `hayAlgoPropio` and the hook in `limite` | A dialog: "No se guardó como borrador". The text says the owner already has the maximum of 3 drafts, so what was entered is lost on leaving. Actions: "Seguir cargando" / "Salir". |
| Otherwise | Close. |

In `/prototipo` (`demo`), drafts are never saved, so `hayAlgoPropio` does not apply and leaving always just closes. Only the dialogs above lose their trigger there.

The "¿Salir sin crear el contrato?" title and its "No se guardó nada…" text are deleted from `DialogoDeSalida`. `SalidaPendiente.sinGuardar: boolean` becomes a reason (`"fallo" | "limite"`).

### D-6. Resume into a detour

`valoresIniciales` reads `formularioPropiedad` / `formularioInquilino` from the deserialized state instead of rebuilding them from the requests (D-2 already did that for v1). `useNavegacion` takes the initial `desvio` and `pasoDesvio`, so the flow reopens inside the detour. "Atrás" from the detour's first step returns to the contract step stored in `paso`, as in a live session.

### D-7. «Completar después» is removed

Decided by the product owner after seeing the wizard: two buttons that both advance, one only with the data and one without it, confuse. With the draft born from the first own input (D-1), "come back later" is covered by leaving the flow, so the button no longer has a job.

- Delete `BotonCompletarDespues`, `puedeCompletarDespues` and the `.owner-wizard-later` rule. «Seguir» stays disabled until the step is valid, and nothing else moves on.
- **Kept:** the pending steps stay derived (`pasosPendientes`, contract-drafts D-2) and the review keeps its «Falta completar» list and the disabled «Crear contrato». They matter for a resumed draft whose saved property or tenant is gone (`elegidosVigentes`), and for the elapsed-installments question when dates changed. Without the button, nothing else can make a step pending, so the list is rarely seen.
- «Otras condiciones»: «Seguir» with incomplete content already marks where (`intentoOtras`). The owner completes or empties it; «Saltear este paso» stays for when nothing is loaded.
- No payload or backend change: pending steps were never stored.

Alternatives considered:
- Rename it («Seguir sin completar», «Dejar para después»): keeps the same two-buttons confusion.
- Show one button per state (only «Completar después» when the step is incomplete): hides why «Seguir» is unavailable.

## Risks / Trade-offs

- **[An owner without a required datum cannot go past the step]**: they must leave and resume. → The draft keeps the step and everything else, and leaving asks nothing. It is the same path as any interruption.

- **[More drafts born by accident]**: completing a location by mistake now takes a slot. → The draft is visible right away, with "Descartar borrador" in the header and "Descartar" in Inicio. The requirement accepts this.
- **[A creation in flight when the page closes]**: the final `POST` is not sent, and the in-flight one may be cancelled by the browser. → The key makes any later retry harmless. At most the first 2 s of typing are lost, the same bound as for updates.
- **[A replayed creation does not carry the newest content]**: the backend returns the draft as first created. → The hook's dirty tracking `PUT`s the difference on the next save. If the page is already gone, the draft holds the first content, never a duplicate.
- **[v1 → v2 drift]**: a bug in the migration would open old drafts wrong. → Unit tests round-trip a v1 fixture taken from a real saved payload.
- **[Label from an unconfirmed address]**: if the owner changes the address, the label follows it on the next save. This is intended ("follows later changes").

## Migration Plan

1. Deploy the backend `contract-draft-early-save` first. Without it the header is ignored and creation stays non-idempotent, but nothing breaks.
2. Archive `contract-drafts` (frontend) before archiving this change, so the MODIFIED and REMOVED requirements find their base in `openspec/specs/contract-drafts/`.
3. Rollback: reverting the frontend leaves v2 payloads that the previous `deserializar` rejects ("no se pudo leer", with only discard offered). If a rollback is likely, ship the v2 reader first and start writing v2 in a second release.
