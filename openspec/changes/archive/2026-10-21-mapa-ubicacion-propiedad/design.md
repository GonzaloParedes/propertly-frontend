# Design

## Context

The backend (`alquia-backend`, ALQ-92) makes `Address.latitude`/`longitude` non-null and
`PropertyRequest.latitude`/`longitude` `@NotNull`, backfilling legacy rows to the geographic center
of Argentina (`-34.6989`, `-64.7597`). Every property therefore has coordinates, and the front must
always send a valid pair.

The real property write paths in this repo are `CreationWizard` (create, via
`AlquiaBackendClient.properties.create`) and `OwnerWorkspace`'s `PropertyEditDialog` (edit, via
`properties.update`). The `src/components/forms/PropertyForm*` components are mock prototypes with
no endpoint and are out of scope. The map stack already exists for the rent estimator: `leaflet` +
`react-leaflet` + `maplibre-gl` + `AlquiaVectorLayer` (brand basemap), loaded client-only. The
`RentEstimateMapCanvas` is deliberately read-only (`dragging={false}`, no zoom).

## Decisions

### D-1. A new interactive canvas, not a flag on the read-only one

`RentEstimateMapCanvas` is a fixed, non-interactive display by design. Rather than parameterize it,
ALQ-92 adds a sibling `PropertyLocationMapCanvas` that is interactive (draggable pin + tap-to-place)
and shares the same mechanics: client-only load via `next/dynamic({ ssr: false })` (Leaflet touches
`window`), pins drawn with `L.divIcon` (never Leaflet's default icon, which breaks under the
bundler), and the same `AlquiaVectorLayer` basemap and attribution. A thin `PropertyLocationMap`
wrapper renders the instruction, the coordinate readout and the dynamic canvas.

### D-2. Case A verifies, Case B requires

The component takes the current `latitude`/`longitude` (possibly `null`).

- With coordinates (Case A): the map centers on the point at street zoom with a draggable pin, and
  the copy asks the owner to verify and, if needed, correct it.
- Without coordinates (Case B): the map opens on the center of Argentina at country zoom with no
  pin, and the copy requires the owner to tap the map to place one.

In both cases, dragging the pin or tapping the map reports the new pair upward via `onChange`, which
updates the form's address/property state.

### D-3. No save without a confirmed pair

The location step gates progress on a present coordinate pair:

- `CreationWizard.propiedadBloqueada` blocks the property-location step while
  `latitude`/`longitude` are absent, in addition to the existing address-complete check.
- `OwnerWorkspace.isPropertyValid` requires both coordinates, so the edit dialog's save button stays
  disabled until the pin is placed.

`armarPropiedad` (the `Direccion` → `PropertyRequest` builder) throws if coordinates are missing
rather than silently defaulting: the gate guarantees they are present, so a missing pair is a bug to
surface loudly, never a wrong location (e.g. the country center) saved quietly.

### D-4. Required coordinates in the types

`PropertyRequest` and `PropertyResponse` carry required `latitude`/`longitude` (`number`), matching
the backend contract and removing optional-to-required friction when mapping a response into an edit
request. The draft `Direccion` type keeps `number | null`, since a draft can still be mid-edit with
no pin yet; the gate is what turns that into a guaranteed pair before a request is built.

### D-5. Center of Argentina as the Case B starting view

`src/lib/geo.ts` holds `CENTRO_DE_ARGENTINA` (`-34.6989`, `-64.7597`) and the two zoom levels. It is
only the map's initial framing when there is no pin yet — it is never written as a property's
coordinate (that is the backend's backfill concern, not a value the front sends on its own).

## Risks / trade-offs

- The map stack is client-only; under jsdom the shared test mocks (`src/tests/setup.tsx`) stand in
  for `leaflet`/`react-leaflet`. The mock gains `useMapEvents` and `setView` so the interactive
  canvas renders in tests without the real library.
- Owners resuming an old draft whose property had no coordinates see Case B and must place a pin
  before continuing — intended, since those properties never had a location.
