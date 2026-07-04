export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white overflow-hidden">
      {/* Fondo decorativo */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.07) 0%, transparent 70%)",
        }}
      />

      <main
        className="relative flex flex-col items-center gap-8 text-center px-8"
        style={{ animation: "var(--animate-fade-up)" }}
      >
        {/* Ícono */}
        <div
          className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100"
          style={{ animation: "var(--animate-fade-in)", animationDelay: "0.1s", animationFillMode: "both", opacity: 0 }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-indigo-500"
          >
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
            <path d="M9 21V12h6v9" />
          </svg>
        </div>

        {/* Wordmark */}
        <h1
          className="text-7xl font-bold tracking-tighter text-zinc-900 select-none"
          style={{
            background: "linear-gradient(120deg, #3730a3 0%, #6366f1 45%, #818cf8 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundSize: "200% auto",
            animation: "var(--animate-shimmer)",
          }}
        >
          alquia
        </h1>

        {/* Subtítulo */}
        <div
          className="flex flex-col items-center gap-3"
          style={{ animation: "var(--animate-fade-up)", animationDelay: "0.3s", animationFillMode: "both", opacity: 0 }}
        >
          <p className="text-base font-medium tracking-widest uppercase text-zinc-400">
            En construcción
          </p>

          {/* Puntos animados */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block w-1.5 h-1.5 rounded-full bg-indigo-400"
                style={{
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
