/**
 * URL pública del sitio en este entorno, sin barra final (p. ej.
 * `https://alquia.com.ar`). La necesitan el sitemap, el robots y las imágenes de
 * Open Graph, que piden URLs absolutas. Sin la variable devuelve `null`: un
 * preview o un entorno local no se anuncia a los buscadores.
 */
export function siteUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return url ? url.replace(/\/+$/, "") : null;
}
