import Link from "next/link";
import FloatingBlobs from "./FloatingBlobs";
import HeroPreview from "./HeroPreview";

export default function Hero() {
  return (
    <section
      className="relative overflow-hidden px-6 py-24 sm:py-32 sm:px-10"
      style={{
        background:
          "linear-gradient(135deg, #1A1050 0%, #2C1B6E 35%, #3D2B91 65%, #5B4BC4 100%)",
      }}
    >
      <FloatingBlobs dark />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-16 lg:flex-row lg:items-center">
        {/* Copy */}
        <div className="flex-1 text-center lg:text-left">
          <span
            className="mb-5 inline-block rounded-full px-4 py-1.5 text-[12px] font-bold uppercase tracking-widest"
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            Plataforma de gestión de alquileres
          </span>

          <h1
            className="font-heading mb-6 text-[42px] leading-[1.15] font-bold tracking-[-0.025em] text-white sm:text-[54px] lg:text-[58px]"
            style={{ textWrap: "pretty" } as React.CSSProperties}
          >
            Sus alquileres,
            <br className="hidden lg:block" />{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #C4A8FF, #A79AF0)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              en orden
            </span>{" "}
            <span className="whitespace-nowrap">y a la vista.</span>
          </h1>

          <p
            className="mb-10 max-w-[500px] text-[18px] leading-[1.65] lg:mx-0 mx-auto"
            style={{ color: "var(--on-dark-secondary)" }}
          >
            Controle pagos, contratos y vencimientos de todas sus propiedades
            desde un solo lugar. Sin planillas ni papeles sueltos.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row lg:justify-start justify-center">
            <Link
              href="/registro"
              className="inline-flex min-h-[54px] items-center justify-center rounded-[12px] px-8 text-[17px] font-bold transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{
                background: "white",
                color: "var(--primary)",
              }}
            >
              Crear cuenta gratis
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-[54px] items-center justify-center rounded-[12px] px-8 text-[17px] font-bold text-white transition-all hover:bg-white/10"
              style={{
                border: "2px solid rgba(255,255,255,0.35)",
              }}
            >
              Ya tengo cuenta
            </Link>
          </div>

        </div>

        {/* Preview mockup */}
        <div className="flex flex-1 justify-center lg:justify-end">
          <HeroPreview />
        </div>
      </div>

      {/* Fundido corto hacia la sección clara siguiente */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(246,245,252,0.55) 65%, var(--bg) 100%)",
        }}
      />
    </section>
  );
}
