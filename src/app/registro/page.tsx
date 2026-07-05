"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { apiPost, ApiError } from "@/lib/api";

const BENEFITS = [
  "Configure sus propiedades en minutos",
  "Reciba avisos antes de cada vencimiento",
  "Guarde contratos y comprobantes en un lugar seguro",
];

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#A679F0"
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

export default function RegistroPage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const form = new FormData(e.currentTarget);
    try {
      await apiPost("/auth/register", {
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        password: form.get("password"),
      });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError("Verifique los datos ingresados e inténtelo de nuevo.");
      } else {
        setError("No pudimos crear su cuenta. Inténtelo de nuevo más tarde.");
      }
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
          width={130}
          height={48}
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
              width={280}
              height={108}
              priority
              className="mb-10 block h-[108px] w-auto"
            />

            <h1
              className="mb-3 max-w-[560px] text-[32px] leading-[1.25] font-bold tracking-[-0.01em]"
              style={{ fontFamily: "var(--font-quicksand), system-ui, sans-serif" }}
            >
              Empiece gratis y tome el control de sus alquileres.
            </h1>
            <p className="max-w-[420px] text-[17.5px] text-[#DDD9F0]">
              Regístrese en minutos y gestione todas sus propiedades desde un
              solo lugar, sin planillas ni papeles sueltos.
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
        <section className="flex items-center justify-center bg-[#F6F5FC] p-6 sm:p-8 lg:bg-white">
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
              /* Success state */
              <div className="flex flex-col items-center text-center">
                <div
                  className="mb-4 flex size-16 items-center justify-center rounded-full"
                  style={{ background: "var(--primary-soft)" }}
                >
                  <MailIcon />
                </div>
                <h2
                  className="mb-2 text-[22px] font-bold"
                  style={{ fontFamily: "var(--font-quicksand), system-ui, sans-serif" }}
                >
                  Revisá tu correo
                </h2>
                <p className="mb-1" style={{ color: "var(--text-2)" }}>
                  Le enviamos un link a
                </p>
                <p className="mb-4 font-bold break-all">{email}</p>
                <p className="mb-6" style={{ color: "var(--text-2)" }}>
                  Haga click en él para activar su cuenta.
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
              /* Registration form */
              <>
                <h2
                  className="mb-2 text-center text-[22px] font-bold"
                  style={{ fontFamily: "var(--font-quicksand), system-ui, sans-serif" }}
                >
                  Crear una cuenta
                </h2>
                <p className="mb-6 text-center" style={{ color: "var(--text-2)" }}>
                  Complete sus datos para comenzar.
                </p>

                <form onSubmit={handleSubmit}>
                  {/* Nombre + Apellido */}
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="rg-first-name" className="font-bold">
                        Nombre
                      </label>
                      <input
                        id="rg-first-name"
                        name="firstName"
                        type="text"
                        autoComplete="given-name"
                        placeholder="Ej: María"
                        required
                        disabled={isPending}
                        className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 text-[17px] outline-offset-0 disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[#5948C4] focus-visible:outline-[3px] focus-visible:outline-[#E7E3F8]"
                        style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="rg-last-name" className="font-bold">
                        Apellido
                      </label>
                      <input
                        id="rg-last-name"
                        name="lastName"
                        type="text"
                        autoComplete="family-name"
                        placeholder="Ej: González"
                        required
                        disabled={isPending}
                        className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 text-[17px] outline-offset-0 disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[#5948C4] focus-visible:outline-[3px] focus-visible:outline-[#E7E3F8]"
                        style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="mb-4 flex flex-col gap-1.5">
                    <label htmlFor="rg-mail" className="font-bold">
                      Correo electrónico
                    </label>
                    <input
                      id="rg-mail"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      disabled={isPending}
                      placeholder="Ej: maria.gonzalez@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 text-[17px] outline-offset-0 disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[#5948C4] focus-visible:outline-[3px] focus-visible:outline-[#E7E3F8]"
                      style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                    />
                  </div>

                  {/* Contraseña */}
                  <div className="mb-2 flex flex-col gap-1.5">
                    <label htmlFor="rg-pass" className="font-bold">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        id="rg-pass"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Mínimo 8 caracteres"
                        required
                        disabled={isPending}
                        className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 pr-12 text-[17px] outline-offset-0 disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[#5948C4] focus-visible:outline-[3px] focus-visible:outline-[#E7E3F8]"
                        style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded p-1 focus-visible:outline-[3px] focus-visible:outline-[#E7E3F8]"
                        style={{ color: "var(--text-2)" }}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
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
                    {isPending ? "Creando cuenta…" : "Crear cuenta"}
                  </button>
                </form>

                <p className="mt-4 text-center" style={{ color: "var(--text-2)" }}>
                  ¿Ya tiene cuenta?{" "}
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
