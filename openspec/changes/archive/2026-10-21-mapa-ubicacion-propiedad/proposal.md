# Proposal

## Why

Today a property's coordinates (`latitude`/`longitude`) only exist when the address was resolved
through GeoRef (`/address-lookup/resolve`); when the owner types the address by hand they stay
`null`, and the front sends no coordinates at all. ALQ-92 makes coordinates mandatory on the
backend (`PropertyRequest.latitude`/`longitude` are now `@NotNull`, and legacy rows were backfilled
to the center of Argentina), because the rent estimator (ALQ-45) needs every property to have a
location: without it `subjectLocation` is `null` and the comparables map cannot anchor the subject.

So the front has to stop sending properties without coordinates. It does that by showing the owner
a map where they see, verify and correct the property's location before saving — turning the
coordinate from something that silently came (or did not come) from GeoRef into something the owner
always confirms.

## What Changes

- **BREAKING (with the backend)**: `PropertyRequest` now carries required `latitude`/`longitude`,
  and `PropertyResponse` always returns them (every property has coordinates). `backend-types.ts`
  is updated to match; a create/update without a coordinate pair is a `400`.
- Property create (the "new property" step of `CreationWizard`) and property edit
  (`PropertyEditDialog` in `OwnerWorkspace`) show a **location map card**. The owner cannot move
  past the location step / save the property without a confirmed coordinate pair.
  - **Case A — the address came from a GeoRef suggestion with coordinates**: the map opens centered
    on that point with the pin on it, for the owner to verify. They can correct it by dragging the
    pin or tapping the map.
  - **Case B — the address was typed by hand (or GeoRef returned no point)**: the map opens on the
    center of Argentina with no pin, and requires the owner to tap the map to place one.
- A new interactive map component reuses the existing map stack (Leaflet + react-leaflet +
  `AlquiaVectorLayer` brand basemap), as a counterpart to the read-only `RentEstimateMapCanvas`.

## Capabilities

### Modified Capabilities

- `propiedades`: property create and edit gain a location step that guarantees a confirmed
  coordinate pair before the property is saved.

## Impact

- Front: `src/lib/backend-types.ts`, `src/lib/geo.ts` (new), `src/components/dashboard/PropertyLocationMap.tsx`
  and `PropertyLocationMapCanvas.tsx` (new), `src/components/dashboard/CreationWizard.tsx`,
  `src/components/dashboard/OwnerWorkspace.tsx`, `src/components/dashboard/OwnerWorkspace.css`,
  and tests under `src/tests/`.
- Backend dependency: `alquia-backend` ALQ-92 (coordinates `@NotNull` + backfill). Both ship
  together because of the required-coordinates contract.
- Out of scope: the read-only `RentEstimateMapCanvas` (ALQ-45) and the mock prototype forms under
  `src/components/forms/` (`PropertyForm`/`PropertyFormCarousel`, which have no backend endpoint and
  use `@/lib/types`, not `backend-types`); validating that the point falls inside Argentina (the
  backend keeps only the global range check).
