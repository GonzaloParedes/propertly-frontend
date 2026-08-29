export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_STYLES: Record<BadgeTone, { color: string; background: string }> = {
  success: { color: "var(--success)", background: "var(--success-bg)" },
  warning: { color: "var(--warn)", background: "var(--warn-bg)" },
  danger: { color: "var(--danger)", background: "var(--danger-bg)" },
  info: { color: "var(--primary)", background: "var(--primary-soft)" },
  neutral: { color: "var(--text-2)", background: "var(--bg)" },
};

interface BadgeProps {
  tone: BadgeTone;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export default function Badge({ tone, children, icon }: BadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-[7px] rounded-full border-[1.5px] border-current px-3 py-[5px] text-[15px] font-bold whitespace-nowrap"
      style={TONE_STYLES[tone]}
    >
      {icon}
      {children}
    </span>
  );
}
