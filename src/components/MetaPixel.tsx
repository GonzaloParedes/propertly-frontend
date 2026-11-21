"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { loadMetaPixel, rutaSinPixel, trackMeta } from "@/lib/meta-pixel";

/**
 * Carga el píxel de Meta y manda un `PageView` por cada ruta (carga inicial y navegación SPA).
 * `fbq('init')` no dispara PageView solo: lo mandamos acá, una vez por ruta. No renderiza nada.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const ultimaRuta = useRef<string | null>(null);

  useEffect(() => {
    loadMetaPixel();
  }, []);

  useEffect(() => {
    // El ref sobrevive al doble efecto de Strict Mode: evita el PageView duplicado.
    if (ultimaRuta.current === pathname) return;
    ultimaRuta.current = pathname;
    if (rutaSinPixel(pathname)) return;
    trackMeta("PageView");
  }, [pathname]);

  return null;
}
