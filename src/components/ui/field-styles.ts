// Clases compartidas para inputs/selects/textareas — reflejan los mismos
// tokens y estados (focus, disabled, error) usados en login/registro.
export const inputClass =
  "min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 text-[17px] outline-offset-0 disabled:cursor-not-allowed disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[var(--primary)] focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]";

export const selectClass = `${inputClass} cursor-pointer`;

export function fieldBorderStyle(hasError?: boolean) {
  return {
    borderColor: hasError ? "var(--danger)" : "var(--border-strong)",
    color: "var(--text)",
  } as const;
}

export const labelClass = "font-bold text-[15.5px]";
