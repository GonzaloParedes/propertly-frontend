interface SectionCardProps {
  id?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export default function SectionCard({ id, title, description, icon, children }: SectionCardProps) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className="scroll-mt-24 rounded-2xl border bg-white p-6 sm:p-8"
      style={{ borderColor: "var(--border)", boxShadow: "var(--shadow)" }}
    >
      <div className="mb-6 flex items-start gap-3">
        {icon && (
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
          >
            {icon}
          </div>
        )}
        <div>
          <h2 id={id ? `${id}-title` : undefined} className="font-heading text-[20px] font-bold">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[15px]" style={{ color: "var(--text-2)" }}>
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}
