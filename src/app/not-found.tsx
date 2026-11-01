import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

// Next agrega `noindex` por su cuenta a toda respuesta 404; acá sólo falta el título.
export const metadata: Metadata = {
  title: "Página no encontrada | Alquia",
};

// Canal de contacto de «Escríbanos». Pendiente de definir: reemplazar por la
// dirección real (o un wa.me) — es el único lugar que lo usa.
const CONTACTO_HREF = "mailto:hola@alquia.com";

export default function NotFound() {
  return (
    <main
      className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center text-[17px] leading-[1.55]"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <Image
        src="/logos/lockup.svg"
        alt="Alquia"
        width={360}
        height={160}
        priority
        className="mb-10 h-20 w-auto"
      />

      <p className="font-heading mb-2 text-[15px] font-bold tracking-[0.04em] uppercase" style={{ color: "var(--primary)" }}>
        Error 404
      </p>
      <h1 className="font-heading mb-3 text-[28px] leading-[1.25] font-bold tracking-[-0.01em] sm:text-[32px]">
        Esta página no existe
      </h1>
      <p className="mb-8 max-w-[420px]" style={{ color: "var(--text-2)" }}>
        Puede que el enlace esté mal escrito o que la página se haya movido.
      </p>

      <div className="flex w-full max-w-[420px] flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
        <Link
          href="/"
          className="flex min-h-12 items-center justify-center rounded-[10px] border-2 border-transparent bg-[var(--primary)] px-6 text-[17px] font-bold text-white transition-colors hover:bg-[var(--primary-dark)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--lila)]"
        >
          Volver al inicio
        </Link>
        <a
          href={CONTACTO_HREF}
          className="flex min-h-12 items-center justify-center rounded-[10px] border-2 border-[var(--primary)] bg-[var(--elev)] px-6 text-[17px] font-bold text-[var(--primary)] transition-colors hover:bg-[var(--primary-soft)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--lila)]"
        >
          Escríbanos
        </a>
      </div>
    </main>
  );
}
