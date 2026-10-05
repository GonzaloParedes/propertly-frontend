"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, CircleCheck, Mail, ShieldCheck } from "lucide-react";
import { ApiError } from "@/lib/api";
import { AlquiaBackendClient } from "@/lib/backend-client";
import { copyDeError, FALLBACK } from "@/lib/error-codes";
import { Spinner } from "@/components/ui/Spinner";

const BENEFITS = [
  "Confirmá tu correo para activar tu cuenta",
  "Así recibís avisos de vencimientos y pagos",
  "Es un solo paso y queda listo para siempre",
];

function CheckIcon() {
  return <Check aria-hidden="true" className="size-5 shrink-0" color="var(--lila)" strokeWidth={3} />;
}

function ShieldIcon() {
  return <ShieldCheck aria-hidden="true" className="size-[18px] shrink-0" color="var(--success)" />;
}

function CheckCircleIcon() {
  return <CircleCheck aria-hidden="true" className="size-12" color="var(--primary)" strokeWidth={1.5} />;
}

function MailIcon() {
  return <Mail aria-hidden="true" className="size-12" color="var(--primary)" strokeWidth={1.5} />;
}

type Status = "pending" | "success" | "error";

function ResendForm() {
  const [isPending, setIsPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const form = new FormData(e.currentTarget);
    try {
      await AlquiaBackendClient.auth.resendVerification({
        email: form.get("email") as string,
      });
      setSent(true);
    } catch {
      setError(FALLBACK);
      setIsPending(false);
    }
  }

  if (sent) {
    // Mensaje neutro a propósito, para no filtrar qué correos existen o ya están
    // verificados (misma lógica que «olvidé mi contraseña»).
    return (
      <p className="mt-6 text-center text-[15px]" style={{ color: "var(--text-2)" }}>
        Si tu cuenta todavía no está verificada, te enviamos un enlace nuevo. Revisá tu bandeja de
        entrada y la carpeta de spam.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div className="mb-4 flex flex-col gap-1.5">
        <label htmlFor="cc-mail" className="font-bold">
          Correo electrónico
        </label>
        <input
          id="cc-mail"
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
        className="mt-2 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-[10px] border-2 border-transparent px-6 text-[17px] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-[3px] focus-visible:outline-offset-2"
        style={{ background: "var(--primary)", outlineColor: "var(--lila)" }}
        onMouseEnter={(e) =>
          !isPending && (e.currentTarget.style.background = "var(--primary-dark)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--primary)")}
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <Spinner />
            Enviando…
          </span>
        ) : (
          "Reenviar enlace"
        )}
      </button>
    </form>
  );
}

function ConfirmarCorreoContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>(token ? "pending" : "error");
  const [errorMessage, setErrorMessage] = useState<string>(
    "El enlace es inválido o está incompleto. Pedí uno nuevo con tu correo."
  );
  const confirmed = useRef(false);

  useEffect(() => {
    if (!token || confirmed.current) {
      return;
    }
    confirmed.current = true;

    AlquiaBackendClient.auth
      .confirmEmail({ token })
      .then(() => setStatus("success"))
      .catch((err) => {
        setErrorMessage(
          err instanceof ApiError
            ? copyDeError(err, { fallback: "El enlace venció o no es válido. Pedí uno nuevo." })
            : FALLBACK
        );
        setStatus("error");
      });
  }, [token]);

  if (status === "pending") {
    return (
      <div className="flex flex-col items-center text-center">
        <Spinner />
        <p className="mt-4" style={{ color: "var(--text-2)" }}>
          Verificando tu correo…
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center text-center">
        <div
          className="mb-4 flex size-16 items-center justify-center rounded-full"
          style={{ background: "var(--primary-soft)" }}
        >
          <CheckCircleIcon />
        </div>
        <h2 className="font-heading mb-2 text-[22px] font-bold">¡Correo verificado!</h2>
        <p className="mb-6" style={{ color: "var(--text-2)" }}>
          Tu cuenta quedó activada. Ya podés iniciar sesión.
        </p>
        <Link
          href="/login"
          className="flex min-h-12 w-full items-center justify-center rounded-[10px] border-2 border-transparent px-6 text-[17px] font-bold text-white transition-colors focus-visible:outline-[3px] focus-visible:outline-offset-2"
          style={{ background: "var(--primary)", outlineColor: "var(--lila)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-dark)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--primary)")}
        >
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="mb-4 flex size-16 items-center justify-center rounded-full"
        style={{ background: "var(--primary-soft)" }}
      >
        <MailIcon />
      </div>
      <h2 className="font-heading mb-2 text-[22px] font-bold">No pudimos verificar tu correo</h2>
      <p
        role="alert"
        className="mb-2 w-full rounded-[8px] px-3 py-2 text-[15px] font-semibold"
        style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
      >
        {errorMessage}
      </p>
      <p style={{ color: "var(--text-2)" }}>Ingresá tu correo y te mandamos uno nuevo.</p>
      <div className="w-full">
        <ResendForm />
      </div>
    </div>
  );
}

export default function ConfirmarCorreoPage() {
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
              Confirmá tu correo y activá tu cuenta.
            </h1>
            <p className="max-w-[420px] text-[17.5px] text-[var(--on-dark-secondary)]">
              Verificamos tu correo para proteger tu cuenta y poder enviarte los avisos importantes.
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

        {/* Right panel */}
        <section className="flex items-center justify-center bg-[var(--bg)] p-6 sm:p-8 lg:bg-white">
          <div
            className="w-full max-w-[430px] rounded-2xl border bg-white p-6 sm:p-8"
            style={{ borderColor: "var(--border)", boxShadow: "var(--shadow)" }}
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
              <ConfirmarCorreoContent />
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
