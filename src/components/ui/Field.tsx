import { labelClass } from "./field-styles";

interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: Readonly<FieldProps>) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="inline-flex items-baseline gap-0.5">
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
        {required && (
          <span aria-hidden="true" className={labelClass} style={{ color: "var(--danger)" }}>
            *
          </span>
        )}
      </span>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-[14px]" style={{ color: "var(--text-2)" }}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[14px] font-semibold" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export function describedBy(htmlFor: string, hint?: string, error?: string) {
  const ids: string[] = [];
  if (error) ids.push(`${htmlFor}-error`);
  else if (hint) ids.push(`${htmlFor}-hint`);
  return ids.length ? ids.join(" ") : undefined;
}
