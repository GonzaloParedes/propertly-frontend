import Reveal from "./Reveal";

const STEPS = [
  {
    num: "01",
    title: "Creá tu cuenta gratis",
    body: "Solo necesitás tu correo. Sin tarjeta, sin burocracia. Listo en menos de 2 minutos.",
  },
  {
    num: "02",
    title: "Cargá tus propiedades",
    body: "Añadí inquilinos, montos y fechas de vencimiento. Fácil de configurar desde cualquier dispositivo.",
  },
  {
    num: "03",
    title: "Cobrá tranquilo",
    body: "Alquia te avisa antes de cada vencimiento para que nunca pierdas un cobro por descuido.",
  },
];

export default function Steps() {
  return (
    <section
      className="px-6 py-24 sm:px-10"
      style={{ background: "linear-gradient(180deg, #ffffff 0%, var(--bg) 100%)" }}
    >
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-14 text-center">
          <h2
            className="text-[34px] font-bold tracking-[-0.01em]"
            style={{
              fontFamily: "var(--font-quicksand), system-ui, sans-serif",
              color: "var(--text)",
            }}
          >
            Empezá en 3 pasos
          </h2>
          <p className="mt-3 text-[17px]" style={{ color: "var(--text-2)" }}>
            Sin instalaciones. Sin capacitaciones. Solo entrás y empezás.
          </p>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.num} delay={i * 110} className="h-full">
              <div
                className="relative flex h-full flex-col gap-5 overflow-hidden rounded-2xl bg-white p-7"
                style={{
                  border: "1px solid var(--border)",
                  boxShadow: "0 2px 12px rgba(89,72,196,0.06), 0 1px 3px rgba(30,56,46,0.06)",
                }}
              >
                {/* Accent top line — mismo estilo que FeatureCard */}
                <div
                  className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                  style={{ background: "linear-gradient(90deg, var(--primary), transparent)" }}
                />

                <span
                  className="text-[52px] font-bold leading-none"
                  style={{
                    fontFamily: "var(--font-quicksand), system-ui, sans-serif",
                    color: "transparent",
                    WebkitTextStroke: "2.5px var(--primary)",
                  }}
                >
                  {s.num}
                </span>

                <div>
                  <h3
                    className="mb-2 text-[20px] font-bold"
                    style={{
                      fontFamily: "var(--font-quicksand), system-ui, sans-serif",
                      color: "var(--text)",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p className="text-[16px] leading-[1.65]" style={{ color: "var(--text-2)" }}>
                    {s.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
