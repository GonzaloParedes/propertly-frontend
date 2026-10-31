import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// Lo que pide sesión, lo que llega con un token en la URL y lo que es interno.
// Disallow sólo evita que se rastree; no es un control de acceso.
const PRIVADAS = [
  "/dashboard",
  "/tenant-portal",
  "/prototipo",
  "/api/",
  "/sentry-example-page",
  "/confirmar-correo",
  "/restablecer-contrasena",
  "/reset-password",
];

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  // Sin URL configurada es un preview o un entorno local: que no se indexe nada.
  if (!base) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVADAS },
    sitemap: `${base}/sitemap.xml`,
  };
}
