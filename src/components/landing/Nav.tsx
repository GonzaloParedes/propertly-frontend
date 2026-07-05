"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5 sm:px-10 transition-all duration-300"
      style={
        scrolled
          ? {
              background: "rgba(255,255,255,0.90)",
              backdropFilter: "blur(24px) saturate(1.4)",
              WebkitBackdropFilter: "blur(24px) saturate(1.4)",
              borderBottom: "1px solid var(--border)",
            }
          : {
              background: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(24px) saturate(1.4)",
              WebkitBackdropFilter: "blur(24px) saturate(1.4)",
              borderBottom: "1px solid rgba(255,255,255,0.12)",
            }
      }
    >
      <Link href="/" aria-label="Alquia — inicio" className="flex items-center">
        <Image
          src={scrolled ? "/logos/lockup.svg" : "/logos/lockup-oscuro.svg"}
          alt="Alquia"
          width={100}
          height={46}
          priority
          className="h-7 w-auto"
        />
      </Link>

      <nav className="flex items-center gap-3">
        <Link
          href="/login"
          className="hidden rounded-[10px] px-4 py-2 text-[15px] font-bold transition-colors hover:opacity-80 sm:inline-flex"
          style={{ color: scrolled ? "var(--primary)" : "rgba(220,215,245,0.9)" }}
        >
          Iniciar sesión
        </Link>
        <Link
          href="/registro"
          className="inline-flex items-center rounded-[10px] px-4 py-2.5 text-[15px] font-bold text-white transition-all hover:opacity-90"
          style={{
            background: "var(--primary)",
            boxShadow: "0 2px 12px rgba(89,72,196,0.4)",
          }}
        >
          Crear cuenta
        </Link>
      </nav>
    </header>
  );
}
