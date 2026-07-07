"use client";

import { useEffect, useRef, useState } from "react";

interface Property {
  address: string;
  amount: number;
  dueDay: number;
}

const PROPERTIES: Property[] = [
  { address: "Rivadavia 2340, 5.º A",  amount: 185_000, dueDay: 4  },
  { address: "Corrientes 1180, 2.º B", amount: 150_000, dueDay: 8  },
  { address: "Soler 3450, Palermo",    amount: 220_000, dueDay: 13 },
  { address: "Lavalle 890, 3.º C",     amount: 95_000,  dueDay: 18 },
  { address: "Belgrano 2100, 1.º A",   amount: 175_000, dueDay: 24 },
];

const TOTAL = PROPERTIES.reduce((s, p) => s + p.amount, 0);
const MONTH_DAYS = 31;
const TICK_MS = 500;

function formatAmount(n: number): string {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function daysLabel(daysLeft: number): string {
  if (daysLeft <= 0) return "hoy";
  if (daysLeft === 1) return "mañana";
  return `en ${daysLeft} días`;
}

function useCountUp(target: number, duration = 480) {
  const [display, setDisplay] = useState(target);
  const animRef = useRef<number | null>(null);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (prevTarget.current === target) return;
    const start = prevTarget.current;
    prevTarget.current = target;
    const startTime = performance.now();

    if (animRef.current !== null) cancelAnimationFrame(animRef.current);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current !== null) cancelAnimationFrame(animRef.current); };
  }, [target, duration]);

  return display;
}

export default function HeroPreview() {
  const [day, setDay] = useState(1);
  const [paid, setPaid] = useState<Set<number>>(new Set());
  const [newlyPaid, setNewlyPaid] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const [entered, setEntered] = useState(false);
  const prevPaidRef = useRef<Set<number>>(new Set());

  // Entrance animation completes after 750 ms → start continuous animations
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 750);
    return () => clearTimeout(t);
  }, []);

  // Advance the day ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setDay((d) => (d >= MONTH_DAYS ? d : d + 1));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // Mark properties as paid when their due day arrives
  useEffect(() => {
    if (day === 1) return;
    setPaid((prev) => {
      const next = new Set(prev);
      PROPERTIES.forEach((p, i) => { if (day >= p.dueDay) next.add(i); });
      return next;
    });
  }, [day]);

  // Detect newly-paid items → flash animations + toast
  useEffect(() => {
    const justPaid: number[] = [];
    paid.forEach((i) => { if (!prevPaidRef.current.has(i)) justPaid.push(i); });
    prevPaidRef.current = paid;

    if (justPaid.length === 0) return;

    setNewlyPaid(new Set(justPaid));
    const prop = PROPERTIES[justPaid[justPaid.length - 1]];
    setToast({ text: `+${formatAmount(prop.amount)} cobrado`, key: Date.now() });

    const t1 = setTimeout(() => setNewlyPaid(new Set()), 700);
    const t2 = setTimeout(() => setToast(null), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [paid]);

  const cobrado = PROPERTIES.filter((_, i) => paid.has(i)).reduce((s, p) => s + p.amount, 0);
  const pendiente = TOTAL - cobrado;
  const pendienteCount = PROPERTIES.length - paid.size;
  const allPaid = pendienteCount === 0;
  const progressPct = Math.round((day / MONTH_DAYS) * 100);

  const cobradoAnim = useCountUp(cobrado);
  const pendienteAnim = useCountUp(pendiente);

  return (
    <>
      <style>{`
        @keyframes hp-fadeUp {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes hp-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes hp-shimmer {
          0%   { transform: translateX(-180%); }
          100% { transform: translateX(380%); }
        }
        @keyframes hp-row-flash {
          0%   { background: transparent; }
          30%  { background: rgba(107,232,163,0.18); }
          100% { background: transparent; }
        }
        @keyframes hp-dot-pop {
          0%   { transform: scale(1); box-shadow: 0 0 0 0 rgba(107,232,163,0); }
          35%  { transform: scale(2.1); box-shadow: 0 0 0 5px rgba(107,232,163,0.2); }
          65%  { transform: scale(0.8); box-shadow: 0 0 0 2px rgba(107,232,163,0.1); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(107,232,163,0); }
        }
        @keyframes hp-toast {
          0%   { opacity: 0; transform: translateX(14px) scale(0.92); }
          14%  { opacity: 1; transform: translateX(0)    scale(1); }
          74%  { opacity: 1; transform: translateX(0)    scale(1); }
          100% { opacity: 0; transform: translateX(14px) scale(0.92); }
        }
      `}</style>

      {/* Float wrapper — only active after entrance */}
      <div style={{ animation: entered ? "hp-float 5s ease-in-out infinite" : "none" }}>
        {/* Card */}
        <div
          className="relative w-[400px] shrink-0 rounded-3xl p-6 overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.10)",
            backdropFilter: "blur(28px) saturate(1.4)",
            WebkitBackdropFilter: "blur(28px) saturate(1.4)",
            border: "1px solid rgba(255,255,255,0.20)",
            animation: entered
              ? allPaid
                ? "hp-glow-success 2.5s ease-in-out infinite"
                : "hp-glow 3.5s ease-in-out infinite"
              : "hp-fadeUp 0.75s cubic-bezier(0.22,1,0.36,1) forwards",
          }}
        >
          {/* Shimmer sweep */}
          <div
            className="pointer-events-none absolute inset-y-0 rounded-3xl"
            style={{
              left: 0,
              width: "55%",
              background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.07) 50%, transparent 70%)",
              animation: "hp-shimmer 3.8s ease-in-out infinite",
            }}
          />

          {/* Payment toast */}
          {toast && (
            <div
              key={toast.key}
              className="absolute top-3.5 right-3.5 flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-bold"
              style={{
                background: "rgba(18,110,55,0.7)",
                color: "var(--success-on-dark)",
                border: "1px solid rgba(107,232,163,0.45)",
                backdropFilter: "blur(10px)",
                animation: "hp-toast 2.3s ease forwards",
                zIndex: 20,
              }}
            >
              ✓ {toast.text}
            </div>
          )}

          {/* Header */}
          <div className="relative z-10 mb-5 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-widest tabular-nums" style={{ color: "rgba(200,190,240,0.7)" }}>
                Julio {day}
              </p>
              <p className="font-heading text-[18px] font-bold text-white">
                Resumen mensual
              </p>
            </div>
            <span
              className="rounded-full px-3 py-1 text-[12px] font-bold transition-all duration-300"
              style={{
                ...(allPaid
                  ? { background: "rgba(30,135,75,0.35)", color: "var(--success-on-dark)", border: "1px solid rgba(107,232,163,0.3)" }
                  : { background: "rgba(160,100,0,0.30)", color: "var(--warn-on-dark)", border: "1px solid rgba(255,209,102,0.3)" }),
                opacity: toast ? 0 : 1,
              }}
            >
              {allPaid ? "✓ Al día" : `${pendienteCount} pendiente${pendienteCount > 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Month progress bar */}
          <div className="relative z-10 mb-5">
            <div className="mb-1.5 flex text-[10px] font-medium" style={{ color: "rgba(200,190,240,0.5)" }}>
              <span>Día {day} de {MONTH_DAYS}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.10)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  background: allPaid
                    ? "linear-gradient(90deg, #6BE8A3, #38d9a9)"
                    : "linear-gradient(90deg, #9B7AF5, #C4A8FF)",
                  boxShadow: allPaid
                    ? "0 0 8px rgba(107,232,163,0.6)"
                    : "0 0 8px rgba(155,122,245,0.6)",
                }}
              />
            </div>
          </div>

          {/* KPIs */}
          <div className="relative z-10 mb-5 grid grid-cols-2 gap-3">
            <div
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
            >
              <p className="mb-1 text-[12px]" style={{ color: "rgba(200,190,240,0.65)" }}>Cobrado</p>
              <p className="font-heading text-[24px] font-bold text-white tabular-nums">
                {formatAmount(cobradoAnim)}
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: "rgba(107,232,163,0.9)" }}>
                {paid.size} de {PROPERTIES.length} propiedades
              </p>
            </div>
            <div
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
            >
              <p className="mb-1 text-[12px]" style={{ color: "rgba(200,190,240,0.65)" }}>Pendiente</p>
              <p
                className="font-heading text-[24px] font-bold tabular-nums transition-colors duration-500"
                style={{ color: allPaid ? "var(--success-on-dark)" : "var(--warn-on-dark)" }}
              >
                {formatAmount(pendienteAnim)}
              </p>
              <p
                className="mt-0.5 text-[11px] transition-all duration-500"
                style={{ color: allPaid ? "rgba(107,232,163,0.9)" : "rgba(255,209,102,0.8)" }}
              >
                {allPaid
                  ? "Todo cobrado ✓"
                  : `${pendienteCount} alquiler${pendienteCount > 1 ? "es" : ""} pendiente${pendienteCount > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="relative z-10" style={{ height: 1, background: "rgba(255,255,255,0.10)", marginBottom: 16 }} />

          {/* Properties list */}
          <p
            className="relative z-10 mb-3 text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "rgba(200,190,240,0.55)" }}
          >
            Propiedades · Julio
          </p>
          <ul className="relative z-10 flex flex-col gap-2.5">
            {PROPERTIES.map((prop, i) => {
              const isPaid = paid.has(i);
              const isNew = newlyPaid.has(i);
              const daysLeft = prop.dueDay - day;
              const dotColor = isPaid
                ? "var(--success-on-dark)"
                : daysLeft <= 2
                ? "var(--warn-on-dark)"
                : "rgba(200,190,240,0.45)";
              const label = isPaid ? "Cobrado ✓" : daysLabel(daysLeft);
              return (
                <li
                  key={prop.address}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-0.5 text-[13px]"
                  style={{ animation: isNew ? "hp-row-flash 0.7s ease forwards" : "none" }}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{
                        background: dotColor,
                        transition: "background 0.4s",
                        animation: isNew ? "hp-dot-pop 0.55s ease forwards" : "none",
                      }}
                    />
                    <span
                      className="truncate transition-all duration-500"
                      style={{ color: isPaid ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.85)" }}
                    >
                      {prop.address}
                    </span>
                  </span>
                  <span
                    className="shrink-0 text-[12px] font-bold transition-all duration-500"
                    style={{ color: dotColor }}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
