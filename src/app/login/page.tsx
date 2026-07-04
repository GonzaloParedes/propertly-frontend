"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const BENEFITS = [
  "Sepa al instante qué alquileres están pagos",
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

export default function LoginPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      // TODO: reemplazar con llamada real al backend
      await new Promise((r) => setTimeout(r, 800));
      router.push("/dashboard");
    } catch {
      setError("Correo o contraseña incorrectos. Intente nuevamente.");
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
              Sus alquileres, en orden y a la vista.
            </h1>
            <p className="max-w-[420px] text-[17.5px] text-[#DDD9F0]">
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

            <h2
              className="mb-2 text-center text-[22px] font-bold"
              style={{ fontFamily: "var(--font-quicksand), system-ui, sans-serif" }}
            >
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
                  defaultValue="ricardo.gomez@gmail.com"
                  autoComplete="email"
                  required
                  disabled={isPending}
                  className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 text-[17px] outline-offset-0 disabled:opacity-60 focus-visible:border-[#5948C4] focus-visible:outline-[3px] focus-visible:outline-[#E7E3F8]"
                  style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                />
              </div>

              <div className="mb-2 flex flex-col gap-1.5">
                <label htmlFor="lg-pass" className="font-bold">
                  Contraseña
                </label>
                <input
                  id="lg-pass"
                  name="password"
                  type="password"
                  defaultValue="0000000000"
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                  className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 text-[17px] outline-offset-0 disabled:opacity-60 focus-visible:border-[#5948C4] focus-visible:outline-[3px] focus-visible:outline-[#E7E3F8]"
                  style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                />
                <Link
                  href="/recuperar-contrasena"
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
                {isPending ? "Ingresando…" : "Ingresar"}
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
