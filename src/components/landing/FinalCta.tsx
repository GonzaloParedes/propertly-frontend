import Link from "next/link";
import Reveal from "./Reveal";
import FloatingBlobs from "./FloatingBlobs";

export default function FinalCta() {
  return (
    <section
      className="relative overflow-hidden px-6 pt-32 pb-32 sm:px-10"
      style={{
        background:
          "linear-gradient(135deg, #1A1050 0%, #2C1B6E 40%, #5B4BC4 100%)",
      }}
    >
      <FloatingBlobs dark />

      {/* Fundido corto desde la sección clara anterior */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32"
        style={{
          background:
            "linear-gradient(180deg, var(--bg) 0%, rgba(246,245,252,0.55) 35%, transparent 100%)",
        }}
      />

      <Reveal className="relative z-10 mx-auto max-w-2xl text-center">
        <h2 className="font-heading mb-5 text-[36px] font-bold leading-[1.18] tracking-[-0.015em] text-white sm:text-[44px]">
          Empiece a gestionar sus alquileres hoy
        </h2>
        <p
          className="mb-10 text-[18px] leading-[1.6]"
          style={{ color: "var(--on-dark-secondary)" }}
        >
          Sin tarjeta. Sin planillas. Todo en un solo lugar.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/registro"
            className="inline-flex min-h-[56px] items-center justify-center rounded-[14px] bg-white px-10 text-[17px] font-bold transition-all hover:opacity-90 hover:scale-[1.02]"
            style={{
              color: "var(--primary)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            }}
          >
            Crear cuenta gratis
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-[56px] items-center justify-center rounded-[14px] px-10 text-[17px] font-bold text-white transition-all hover:bg-white/10"
            style={{ border: "2px solid rgba(255,255,255,0.3)" }}
          >
            Ya tengo cuenta
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
