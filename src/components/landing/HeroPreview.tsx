function StatusDot({ color }: { color: string }) {
  return <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: color }} />;
}

export default function HeroPreview() {
  return (
    <div
      className="w-full max-w-[400px] rounded-3xl p-6"
      style={{
        background: "rgba(255,255,255,0.10)",
        backdropFilter: "blur(28px) saturate(1.4)",
        WebkitBackdropFilter: "blur(28px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.20)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
        animation: "float 7s ease-in-out infinite",
      }}
    >
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "rgba(200,190,240,0.7)" }}>
            Julio 2026
          </p>
          <p className="text-[18px] font-bold text-white" style={{ fontFamily: "var(--font-quicksand), system-ui, sans-serif" }}>
            Resumen mensual
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[12px] font-bold"
          style={{ background: "rgba(30,135,75,0.35)", color: "var(--success-on-dark)", border: "1px solid rgba(107,232,163,0.3)" }}
        >
          Al día
        </span>
      </div>

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
        >
          <p className="mb-1 text-[12px]" style={{ color: "rgba(200,190,240,0.65)" }}>Cobrado</p>
          <p
            className="text-[24px] font-bold text-white"
            style={{ fontFamily: "var(--font-quicksand), system-ui, sans-serif" }}
          >
            $2.4M
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: "rgba(107,232,163,0.9)" }}>↑ 8% vs mes anterior</p>
        </div>
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
        >
          <p className="mb-1 text-[12px]" style={{ color: "rgba(200,190,240,0.65)" }}>Pendiente</p>
          <p
            className="text-[24px] font-bold"
            style={{
              fontFamily: "var(--font-quicksand), system-ui, sans-serif",
              color: "var(--warn-on-dark)",
            }}
          >
            $320K
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: "rgba(255,209,102,0.8)" }}>1 alquiler atrasado</p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.10)", marginBottom: 16 }} />

      {/* Vencimientos */}
      <p
        className="mb-3 text-[11px] font-bold uppercase tracking-widest"
        style={{ color: "rgba(200,190,240,0.55)" }}
      >
        Próximos vencimientos
      </p>
      <ul className="flex flex-col gap-3">
        {[
          { address: "Rivadavia 2340, 5.º A", days: "en 3 días", color: "var(--warn-on-dark)" },
          { address: "Corrientes 1180, 2.º B", days: "en 12 días", color: "var(--success-on-dark)" },
          { address: "Soler 3450, Palermo", days: "en 18 días", color: "var(--success-on-dark)" },
        ].map((row) => (
          <li
            key={row.address}
            className="flex items-center justify-between gap-3 text-[13px]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <StatusDot color={row.color} />
              <span className="truncate text-white/80">{row.address}</span>
            </span>
            <span className="shrink-0 font-bold text-[13px]" style={{ color: row.color }}>
              {row.days}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
