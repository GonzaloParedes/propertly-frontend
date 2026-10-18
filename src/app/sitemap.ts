import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// Sólo las páginas públicas que tiene sentido encontrar desde un buscador. Las
// de auth que llegan con token (restablecer contraseña, confirmar correo) y todo
// lo que pide sesión quedan afuera; robots.ts las excluye.
const PAGINAS_PUBLICAS = ["/", "/registro", "/login"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  if (!base) return [];
  return PAGINAS_PUBLICAS.map((ruta) => ({ url: ruta === "/" ? base : `${base}${ruta}` }));
}
