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
              background: "#ffffff",
              borderBottom: "1px solid var(--border)",
              boxShadow: "0 1px 8px rgba(30,27,46,0.06)",
            }
          : {
              background: "#ffffff",
              borderBottom: "1px solid transparent",
            }
      }
    >
      <Link href="/" aria-label="Alquia — inicio" className="flex items-center">
        <Image
          src="/logos/lockup.svg"
          alt="Alquia"
          width={360}
          height={160}
          priority
          className="h-7 w-auto"
        />
      </Link>

      <nav className="flex items-center gap-3">
        <Link
          href="/login"
          className="hidden rounded-[10px] px-4 py-2 text-[15px] font-bold transition-colors hover:opacity-80 sm:inline-flex"
          style={{ color: "var(--primary)" }}
        >
          Iniciar sesión
        </Link>
        <Link
          href="/registro"
          className="inline-flex items-center rounded-[10px] px-4 py-2.5 text-[15px] font-bold text-white transition-all hover:opacity-90"
          style={{
            background: "var(--primary)",
            boxShadow: "0 2px 12px rgba(91,75,196,0.4)",
          }}
        >
          Crear cuenta
        </Link>
      </nav>
    </header>
  );
}
