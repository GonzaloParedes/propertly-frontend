"use client";

import { useRef } from "react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  accentColor?: string;
}

export default function FeatureCard({
  icon,
  title,
  body,
  accentColor = "var(--primary)",
}: FeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotX = ((y - cy) / cy) * -5;
    const rotY = ((x - cx) / cx) * 5;
    el.style.transform = `perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
    el.style.setProperty("--glow-x", `${(x / rect.width) * 100}%`);
    el.style.setProperty("--glow-y", `${(y / rect.height) * 100}%`);
    el.style.setProperty("--glow-opacity", "1");
  }

  function handleMouseLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "";
    el.style.setProperty("--glow-opacity", "0");
  }

  return (
    <div
      ref={cardRef}
      className="relative flex flex-col gap-5 overflow-hidden rounded-2xl bg-white p-7 transition-transform duration-200"
      style={
        {
          border: "1px solid var(--border)",
          boxShadow: "0 2px 12px rgba(89,72,196,0.06), 0 1px 3px rgba(30,56,46,0.06)",
          "--glow-x": "50%",
          "--glow-y": "50%",
          "--glow-opacity": "0",
        } as React.CSSProperties
      }
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glow highlight */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(240px circle at var(--glow-x) var(--glow-y), rgba(89,72,196,0.07), transparent 70%)",
          opacity: "var(--glow-opacity)" as unknown as number,
        }}
      />

      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
      />

      <div
        className="flex size-12 items-center justify-center rounded-xl"
        style={{ background: "var(--primary-soft)" }}
      >
        {icon}
      </div>

      <div>
        <h3
          className="mb-2 text-[20px] font-bold"
          style={{
            fontFamily: "var(--font-quicksand), system-ui, sans-serif",
            color: "var(--text)",
          }}
        >
          {title}
        </h3>
        <p className="text-[16px] leading-[1.65]" style={{ color: "var(--text-2)" }}>
          {body}
        </p>
      </div>
    </div>
  );
}
