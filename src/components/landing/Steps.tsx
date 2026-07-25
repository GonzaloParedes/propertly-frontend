import Reveal from "./Reveal";

const STEPS = [
  {
    num: "01",
    title: "Cree su cuenta gratis",
    body: "Solo necesita su correo. Sin tarjeta, sin burocracia. Listo en menos de 2 minutos.",
  },
  {
    num: "02",
    title: "Cargue sus propiedades",
    body: "Añada inquilinos, montos y fechas de vencimiento. Fácil de configurar desde cualquier dispositivo.",
  },
  {
    num: "03",
    title: "Cobre tranquilo",
    body: "Alquia le avisa antes de cada vencimiento para que nunca pierda un cobro por descuido.",
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
            className="font-heading text-[34px] font-bold tracking-[-0.01em]"
            style={{ color: "var(--text)" }}
          >
            Empiece en 3 pasos
          </h2>
          <p className="mt-3 text-[17px]" style={{ color: "var(--text-2)" }}>
            Sin instalaciones. Sin capacitaciones. Solo ingrese y empiece.
          </p>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.num} delay={i * 110} className="h-full">
              <div
                className="relative flex h-full flex-col gap-5 overflow-hidden rounded-2xl bg-white p-7"
                style={{
                  border: "1px solid var(--border)",
                  boxShadow: "0 2px 12px rgba(91,75,196,0.06), 0 1px 3px rgba(30,27,46,0.06)",
                }}
              >
                {/* Accent top line — mismo estilo que FeatureCard */}
                <div
                  className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                  style={{ background: "linear-gradient(90deg, var(--primary), transparent)" }}
                />

                <span
                  className="font-heading text-[52px] font-bold leading-none"
                  style={{
                    color: "transparent",
                    WebkitTextStroke: "2.5px var(--primary)",
                  }}
                >
                  {s.num}
                </span>

                <div>
                  <h3
                    className="font-heading mb-2 text-[20px] font-bold"
                    style={{ color: "var(--text)" }}
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
