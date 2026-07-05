"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const BENEFITS = [
  "Le enviamos un enlace seguro a su correo electrónico",
  "El enlace expira en 30 minutos",
  "Su contraseña actual no se modifica hasta que confirme",
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

function MailIcon() {
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
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 7 10-7" />
    </svg>
  );
}

export default function OlvidarContrasenaPage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      // TODO: reemplazar con llamada real al backend
      // POST /api/auth/forgot-password  Body: { email: string }
      await new Promise((r) => setTimeout(r, 800));
      setSubmitted(true);
    } catch {
      setError("Ocurrió un error inesperado. Intente nuevamente más tarde.");
      setIsPending(false);
    }
  }

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
              Recupere el acceso a su cuenta.
            </h1>
            <p className="max-w-[420px] text-[17.5px] text-[var(--on-dark-secondary)]">
              Ingrese su correo y le enviaremos un enlace para restablecer su
              contraseña de forma segura.
            </p>

            <ul className="mt-8 flex flex-col gap-3.5">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2.5">
                  <CheckIcon />
                  <span>{benefit}</span>
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

            {submitted ? (
              /* Success state — mismo mensaje siempre para evitar user enumeration */
              <div className="flex flex-col items-center text-center">
                <div
                  className="mb-4 flex size-16 items-center justify-center rounded-full"
                  style={{ background: "var(--primary-soft)" }}
                >
                  <MailIcon />
                </div>
                <h2 className="font-heading mb-2 text-[22px] font-bold">
                  Revise su correo
                </h2>
                <p className="mb-6" style={{ color: "var(--text-2)" }}>
                  Si existe una cuenta asociada a ese correo, recibirá un enlace
                  en breve. Revise su bandeja de entrada y la carpeta de spam.
                </p>
                <Link
                  href="/login"
                  className="text-[15px] font-bold underline"
                  style={{ color: "var(--primary)" }}
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            ) : (
              /* Form state */
              <>
                <h2 className="font-heading mb-2 text-center text-[22px] font-bold">
                  Recuperar contraseña
                </h2>
                <p className="mb-6 text-center" style={{ color: "var(--text-2)" }}>
                  Ingrese su correo y le enviaremos un enlace para restablecer su
                  contraseña.
                </p>

                <form onSubmit={handleSubmit}>
                  <div className="mb-4 flex flex-col gap-1.5">
                    <label htmlFor="fp-mail" className="font-bold">
                      Correo electrónico
                    </label>
                    <input
                      id="fp-mail"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="ejemplo@ejemplo.com"
                      required
                      disabled={isPending}
                      className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 text-[17px] outline-offset-0 disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[var(--primary)] focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
                      style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                    />
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
                    {isPending ? "Enviando…" : "Enviar enlace"}
                  </button>
                </form>

                <p className="mt-4 text-center" style={{ color: "var(--text-2)" }}>
                  ¿Recordó su contraseña?{" "}
                  <Link
                    href="/login"
                    className="font-bold underline"
                    style={{ color: "var(--primary)" }}
                  >
                    Iniciar sesión
                  </Link>
                </p>
              </>
            )}

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
