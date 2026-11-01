import { CircleAlert } from "lucide-react";

/**
 * Aviso de error sobre fondo rosado. El rojo va en el ícono y las palabras en
 * tinta: `--danger` sobre `--danger-bg` da 4,03:1 y no llega a AA (sistema-ui.md,
 * «El color semántico no toca el texto chico»). El ícono además dice «error» sin
 * depender del color.
 */
export function ErrorAlert({ children, className = "" }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <p
      role="alert"
      className={`flex items-start gap-2 rounded-[8px] px-3 py-2 text-left text-[15px] font-semibold ${className}`}
      style={{ background: "var(--danger-bg)", color: "var(--text)" }}
    >
      <CircleAlert aria-hidden="true" className="mt-[3px] size-[17px] shrink-0" color="var(--danger)" />
      <span>{children}</span>
    </p>
  );
}
