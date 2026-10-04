"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, AuthExpiredError } from "@/lib/api";

const BENEFITS = [
  "Sepa al instante qué alquileres están pagos",
  "Reciba avisos antes de cada vencimiento",
  "Guarde contratos y comprobantes en un lugar seguro",
];

function CheckIcon() {
  return <Check aria-hidden="true" className="size-5 shrink-0" color="var(--lila)" strokeWidth={3} />;
}

function EyeIcon() {
  return <Eye aria-hidden="true" className="size-5" />;
}

function EyeOffIcon() {
  return <EyeOff aria-hidden="true" className="size-5" />;
}

function ShieldIcon() {
  return <ShieldCheck aria-hidden="true" className="size-[18px] shrink-0" color="var(--success)" />;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Correo o contraseña incorrectos. Intente nuevamente.");
      } else if (err instanceof AuthExpiredError) {
        // AuthExpiredError acá significa que /auth/login salió bien pero el
        // /auth/me posterior falló y el refresh tampoco pudo recuperar sesión.
        // Se muestra el mismo mensaje que credenciales inválidas a propósito,
        // para no filtrar detalles de la sesión a un intento de login fallido.
        setError("Correo o contraseña incorrectos. Intente nuevamente.");
      } else if (err instanceof ApiError && err.status >= 500) {
        setError("Error del servidor. Intente más tarde.");
      } else {
        setError("Ocurrió un error inesperado. Intente nuevamente.");
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
            <Link href="/">
              <Image
                src="/logos/lockup-oscuro.svg"
                alt="Alquia — volver al inicio"
                width={360}
                height={160}
                priority
                className="mb-10 block h-[108px] w-auto"
              />
            </Link>

            <h1 className="font-heading mb-3 max-w-[560px] text-[32px] leading-[1.25] font-bold tracking-[-0.01em]">
              Sus alquileres, en orden y a la vista.
            </h1>
            <p className="max-w-[420px] text-[17.5px] text-[var(--on-dark-secondary)]">
              Controle pagos, contratos y vencimientos de todas sus propiedades
              desde un solo lugar, sin planillas ni papeles sueltos.
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

            <h2 className="font-heading mb-2 text-center text-[22px] font-bold">
              Ingresar a su cuenta
            </h2>
            <p className="mb-6 text-center" style={{ color: "var(--text-2)" }}>
              Escriba su correo y su contraseña.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-4 flex flex-col gap-1.5">
                <label htmlFor="lg-mail" className="font-bold">
                  Correo electrónico
                </label>
                <input
                  id="lg-mail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isPending}
                  placeholder="ejemplo@ejemplo.com"
                  className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 text-[17px] outline-offset-0 disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[var(--primary)] focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
                  style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                />
              </div>

              <div className="mb-2 flex flex-col gap-1.5">
                <label htmlFor="lg-pass" className="font-bold">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="lg-pass"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    disabled={isPending}
                    placeholder="Su contraseña"
                    className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 pr-12 text-[17px] outline-offset-0 disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[var(--primary)] focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
                    style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
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
                <Link
                  href="/olvidar-contrasena"
                  className="mt-1 self-start text-[15px] underline"
                  style={{ color: "var(--primary)" }}
                >
                  ¿Olvidó su contraseña?
                </Link>
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
                aria-busy={isPending || undefined}
                className="mt-4 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-[10px] border-2 border-transparent px-6 text-[17px] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-[3px] focus-visible:outline-offset-2"
                style={{
                  background: "var(--primary)",
                  outlineColor: "var(--lila)",
                }}
                onMouseEnter={(e) =>
                  !isPending && ((e.currentTarget.style.background = "var(--primary-dark)"))
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--primary)")
                }
              >
                {isPending ? <span className="inline-flex items-center gap-2"><Spinner />Ingresando…</span> : "Ingresar"}
              </button>
            </form>

            <p className="mt-4 text-center" style={{ color: "var(--text-2)" }}>
              ¿Primera vez acá?{" "}
              <Link
                href="/registro"
                className="font-bold underline"
                style={{ color: "var(--primary)" }}
              >
                Crear una cuenta
              </Link>
            </p>

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
