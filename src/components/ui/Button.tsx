"use client";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export default function Button({ variant = "primary", className = "", style, children, disabled, ...rest }: ButtonProps) {
  if (variant === "primary") {
    return (
      <button
        type="button"
        disabled={disabled}
        className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[10px] border-2 border-transparent px-6 text-[17px] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-[3px] focus-visible:outline-offset-2 ${className}`}
        style={{ background: "var(--primary)", outlineColor: "var(--lila)", ...style }}
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.style.background = "var(--primary-dark)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--primary)";
        }}
        {...rest}
      >
        {children}
      </button>
    );
  }

  if (variant === "secondary") {
    return (
      <button
        type="button"
        disabled={disabled}
        className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border-2 px-5 text-[16px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)] ${className}`}
        style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "white", ...style }}
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.style.background = "var(--primary-soft)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "white";
        }}
        {...rest}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] px-3 text-[15.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[var(--bg)] focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)] ${className}`}
      style={{ color: "var(--text-2)", ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
