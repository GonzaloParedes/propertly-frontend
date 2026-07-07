"use client";

import { useEffect, useState } from "react";

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
const MONTH_DAYS = 28;
const TICK_MS = 900;

function formatAmount(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function daysLabel(daysLeft: number): string {
  if (daysLeft <= 0) return "hoy";
  if (daysLeft === 1) return "mañana";
  return `en ${daysLeft} días`;
}

export default function HeroPreview() {
  const [day, setDay] = useState(1);
  const [paid, setPaid] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timer = setInterval(() => {
      setDay((d) => {
        if (d >= MONTH_DAYS) return d;
        return d + 1;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (day === 1) return;
    setPaid((prev) => {
      const next = new Set(prev);
      PROPERTIES.forEach((p, i) => {
        if (day >= p.dueDay) next.add(i);
      });
      return next;
    });
  }, [day]);

  const cobrado = PROPERTIES.filter((_, i) => paid.has(i)).reduce((s, p) => s + p.amount, 0);
  const pendiente = TOTAL - cobrado;
  const pendienteCount = PROPERTIES.length - paid.size;
  const allPaid = pendienteCount === 0;

  return (
    <div
      className="w-[400px] shrink-0 rounded-3xl p-6"
      style={{
        background: "rgba(255,255,255,0.10)",
        backdropFilter: "blur(28px) saturate(1.4)",
        WebkitBackdropFilter: "blur(28px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.20)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
      }}
    >
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest tabular-nums" style={{ color: "rgba(200,190,240,0.7)" }}>
            Julio {day}
          </p>
          <p className="font-heading text-[18px] font-bold text-white">
            Resumen mensual
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[12px] font-bold transition-all duration-500"
          style={
            allPaid
              ? { background: "rgba(30,135,75,0.35)", color: "var(--success-on-dark)", border: "1px solid rgba(107,232,163,0.3)" }
              : { background: "rgba(160,100,0,0.30)", color: "var(--warn-on-dark)", border: "1px solid rgba(255,209,102,0.3)" }
          }
        >
          {allPaid ? "Al día" : `${pendienteCount} pendiente${pendienteCount > 1 ? "s" : ""}`}
        </span>
      </div>

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
        >
          <p className="mb-1 text-[12px]" style={{ color: "rgba(200,190,240,0.65)" }}>Cobrado</p>
          <p className="font-heading text-[24px] font-bold text-white tabular-nums">
            {formatAmount(cobrado)}
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
            className="font-heading text-[24px] font-bold tabular-nums transition-all duration-500"
            style={{ color: allPaid ? "var(--success-on-dark)" : "var(--warn-on-dark)" }}
          >
            {formatAmount(pendiente)}
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
      <div style={{ height: 1, background: "rgba(255,255,255,0.10)", marginBottom: 16 }} />

      {/* Properties list */}
      <p
        className="mb-3 text-[11px] font-bold uppercase tracking-widest"
        style={{ color: "rgba(200,190,240,0.55)" }}
      >
        Propiedades · Julio
      </p>
      <ul className="flex flex-col gap-2.5">
        {PROPERTIES.map((prop, i) => {
          const isPaid = paid.has(i);
          const daysLeft = prop.dueDay - day;
          const dotColor = isPaid
            ? "var(--success-on-dark)"
            : daysLeft <= 2
            ? "var(--warn-on-dark)"
            : "rgba(200,190,240,0.45)";
          const label = isPaid ? "Cobrado ✓" : daysLabel(daysLeft);
          return (
            <li key={prop.address} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-full transition-all duration-500"
                  style={{ background: dotColor }}
                />
                <span
                  className="truncate transition-all duration-500"
                  style={{ color: isPaid ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.85)" }}
                >
                  {prop.address}
                </span>
              </span>
              <span
                className="shrink-0 font-bold text-[12px] transition-all duration-500"
                style={{ color: dotColor }}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
