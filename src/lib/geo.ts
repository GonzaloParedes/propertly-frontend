/**
 * Centro geográfico de Argentina (34°41′56″S, 64°45′35″O). Es el encuadre inicial
 * del mapa de ubicación cuando una propiedad todavía no tiene coordenadas (Caso B,
 * dirección tipeada a mano). ALQ-92.
 *
 * Es sólo la vista inicial del mapa: nunca se guarda como la coordenada de una
 * propiedad. El backfill de propiedades viejas sin coordenadas lo hace el backend.
 */
export const CENTRO_DE_ARGENTINA = { latitude: -34.6989, longitude: -64.7597 } as const;

/** Zoom con el que se ve todo el país (sin pin todavía). */
export const ZOOM_PAIS = 4;

/** Zoom de calle cuando ya hay un punto para verificar/corregir. */
export const ZOOM_UBICACION = 16;
