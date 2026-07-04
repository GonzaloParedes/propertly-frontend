import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center overflow-hidden" style={{ background: "#1e1b2e" }}>
      {/* Resplandor decorativo */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(180,100,200,0.12) 0%, transparent 70%)",
        }}
      />

      <main
        className="relative flex flex-col items-center gap-8 text-center px-8"
        style={{ animation: "var(--animate-fade-up)" }}
      >
        {/* Logo */}
        <Image
          src="/logo.png"
          alt="alquia"
          width={320}
          height={120}
          priority
          className="select-none"
          style={{ animation: "var(--animate-fade-in)" }}
        />

        {/* Subtítulo */}
        <div
          className="flex flex-col items-center gap-3"
          style={{ animation: "var(--animate-fade-up)", animationDelay: "0.3s", animationFillMode: "both", opacity: 0 }}
        >
          <p className="text-base font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
            Estamos llegando...
          </p>

          {/* Puntos animados */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block w-1.5 h-1.5 rounded-full"
                style={{
                  background: "#b46cc8",
                  animation: "var(--animate-dot-bounce)",
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
