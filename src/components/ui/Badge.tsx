export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

// Los semánticos sobre su propio fondo no llegan a 4,5:1 (sistema-ui.md, «El
// color semántico no toca el texto chico»): la palabra va en tinta y el color
// queda en el contorno y en el ícono. Índigo sobre su fondo sí llega (5,15:1).
const TONE_STYLES: Record<BadgeTone, { color: string; background: string; borderColor: string }> = {
  success: { color: "var(--text)", background: "var(--success-bg)", borderColor: "var(--success)" },
  warning: { color: "var(--text)", background: "var(--warn-bg)", borderColor: "var(--warn)" },
  danger: { color: "var(--text)", background: "var(--danger-bg)", borderColor: "var(--danger)" },
  info: { color: "var(--primary)", background: "var(--primary-soft)", borderColor: "var(--primary)" },
  neutral: { color: "var(--text-2)", background: "var(--bg)", borderColor: "var(--text-2)" },
};

interface BadgeProps {
  tone: BadgeTone;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export default function Badge({ tone, children, icon }: BadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-[7px] rounded-full border-[1.5px] px-3 py-[5px] text-[15px] font-bold whitespace-nowrap"
      style={TONE_STYLES[tone]}
    >
      {icon && <span className="contents" style={{ color: TONE_STYLES[tone].borderColor }}>{icon}</span>}
      {children}
    </span>
  );
}
