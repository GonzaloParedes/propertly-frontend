"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

const TIPS = [
  "Use al menos 8 caracteres",
  "Combine letras, números y símbolos",
  "No comparta su contraseña con nadie",
];

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--lila)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-[18px] shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--success)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2.5 20 5.5v6c0 5.2-3.4 8.8-8 10-4.6-1.2-8-4.8-8-10v-6z" />
      <path d="m8.5 12 2.5 2.5 4.5-4.5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--primary)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function RestablecerContrasenaForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirm?: string;
  }>({});

  if (!token) {
    return (
      <div className="flex flex-col items-center text-center">
        <h2 className="font-heading mb-3 text-[22px] font-bold">
          Enlace inválido
        </h2>
        <p
          role="alert"
          className="mb-4 w-full rounded-[8px] px-3 py-2 text-[15px] font-semibold"
          style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
        >
          El enlace es inválido o ya expiró.
        </p>
        <Link
          href="/olvidar-contrasena"
          className="text-[15px] font-bold underline"
          style={{ color: "var(--primary)" }}
        >
          Solicitar un nuevo enlace
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center">
        <div
          className="mb-4 flex size-16 items-center justify-center rounded-full"
          style={{ background: "var(--primary-soft)" }}
        >
          <CheckCircleIcon />
        </div>
        <h2 className="font-heading mb-2 text-[22px] font-bold">
          Contraseña actualizada
        </h2>
        <p className="mb-6" style={{ color: "var(--text-2)" }}>
          Su contraseña fue guardada correctamente. Ya puede ingresar a su
          cuenta.
        </p>
        <Link
          href="/login"
          className="flex min-h-12 w-full items-center justify-center rounded-[10px] border-2 border-transparent px-6 text-[17px] font-bold text-white transition-colors focus-visible:outline-[3px] focus-visible:outline-offset-2"
          style={{
            background: "var(--primary)",
            outlineColor: "var(--lila)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--primary-dark)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--primary)")
          }
        >
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const errors: { password?: string; confirm?: string } = {};
    if (password.length < 8) {
      errors.password = "La contraseña debe tener al menos 8 caracteres.";
    }
    if (password !== confirm) {
      errors.confirm = "Las contraseñas no coinciden.";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsPending(true);

    try {
      // TODO: reemplazar con llamada real al backend
      // POST /api/auth/reset-password  Body: { token: string, password: string }
      await new Promise((r) => setTimeout(r, 800));
      setSubmitted(true);
    } catch {
      setError("Ocurrió un error inesperado. Intente nuevamente más tarde.");
      setIsPending(false);
    }
  }

  return (
    <>
      <h2 className="font-heading mb-2 text-center text-[22px] font-bold">
        Nueva contraseña
      </h2>
      <p className="mb-6 text-center" style={{ color: "var(--text-2)" }}>
        Ingrese y confirme su nueva contraseña.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mb-4 flex flex-col gap-1.5">
          <label htmlFor="rp-pass" className="font-bold">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              id="rp-pass"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              required
              disabled={isPending}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 pr-12 text-[17px] outline-offset-0 disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[var(--primary)] focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
              style={{
                borderColor: fieldErrors.password
                  ? "var(--danger)"
                  : "var(--border-strong)",
                color: "var(--text)",
              }}
            />
            <button
              type="button"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded p-1 focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
              style={{ color: "var(--text-2)" }}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-[14px] font-semibold" style={{ color: "var(--danger)" }}>
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div className="mb-2 flex flex-col gap-1.5">
          <label htmlFor="rp-confirm" className="font-bold">
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              id="rp-confirm"
              name="confirm"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repita la contraseña"
              required
              disabled={isPending}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 pr-12 text-[17px] outline-offset-0 disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[var(--primary)] focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
              style={{
                borderColor: fieldErrors.confirm
                  ? "var(--danger)"
                  : "var(--border-strong)",
                color: "var(--text)",
              }}
            />
            <button
              type="button"
              aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded p-1 focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
              style={{ color: "var(--text-2)" }}
            >
              {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {fieldErrors.confirm && (
            <p className="text-[14px] font-semibold" style={{ color: "var(--danger)" }}>
              {fieldErrors.confirm}
            </p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mb-2 rounded-[8px] px-3 py-2 text-[15px] font-semibold"
            style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="mt-4 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-[10px] border-2 border-transparent px-6 text-[17px] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-[3px] focus-visible:outline-offset-2"
          style={{
            background: "var(--primary)",
            outlineColor: "var(--lila)",
          }}
          onMouseEnter={(e) =>
            !isPending &&
            (e.currentTarget.style.background = "var(--primary-dark)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--primary)")
          }
        >
          {isPending ? "Guardando…" : "Guardar nueva contraseña"}
        </button>
      </form>
    </>
  );
}

export default function RestablecerContrasenaPage() {
  return (
    <>
      {/* Mobile-only brand header */}
      <header
        className="flex items-center px-6 py-5 lg:hidden"
        style={{ background: "var(--primary)" }}
      >
        <Image
          src="/logos/lockup-oscuro.svg"
          alt="Alquia"
          width={360}
          height={160}
          priority
          className="h-10 w-auto"
        />
      </header>

      <main
        className="grid flex-1 text-[17px] leading-[1.55] lg:grid-cols-2"
        style={{ color: "var(--text)" }}
      >
        {/* Left brand panel — desktop only */}
        <section
          className="hidden flex-col p-16 text-white lg:flex"
          style={{ background: "var(--primary)" }}
        >
          <div className="my-auto">
            <Image
              src="/logos/lockup-oscuro.svg"
              alt="Alquia"
              width={360}
              height={160}
              priority
              className="mb-10 block h-[108px] w-auto"
            />

            <h1 className="font-heading mb-3 max-w-[560px] text-[32px] leading-[1.25] font-bold tracking-[-0.01em]">
              Cree una nueva contraseña segura.
            </h1>
            <p className="max-w-[420px] text-[17.5px] text-[var(--on-dark-secondary)]">
              Elija una contraseña fuerte para proteger su cuenta y sus datos.
            </p>

            <ul className="mt-8 flex flex-col gap-3.5">
              {TIPS.map((tip) => (
                <li key={tip} className="flex items-center gap-2.5">
                  <CheckIcon />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right form panel */}
        <section className="flex items-center justify-center bg-[var(--bg)] p-6 sm:p-8 lg:bg-white">
          <div
            className="w-full max-w-[430px] rounded-2xl border bg-white p-6 sm:p-8"
            style={{
              borderColor: "var(--border)",
              boxShadow: "var(--shadow)",
            }}
          >
            <Image
              src="/logos/isotipo.svg"
              alt=""
              aria-hidden="true"
              width={48}
              height={48}
              className="mx-auto mb-4 h-12 w-auto"
            />

            <Suspense fallback={null}>
              <RestablecerContrasenaForm />
            </Suspense>

            <p
              className="mt-6 flex items-center justify-center gap-2 text-center text-[15px]"
              style={{ color: "var(--text-2)" }}
            >
              <ShieldIcon />
              <span>Sus datos están protegidos y cifrados.</span>
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
