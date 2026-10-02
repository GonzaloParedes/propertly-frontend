"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Check, Eye, EyeOff, Mail, ShieldCheck } from "lucide-react";
import { apiPost, ApiError } from "@/lib/api";
import { cuitValido, formatearCuit, soloDigitos } from "@/lib/cuit";
import { errorDeTelefono, soloDigitosTelefono, telefonoValido } from "@/lib/telefono";

const BENEFITS = [
  "Configure sus propiedades en minutos",
  "Reciba avisos antes de cada vencimiento",
  "Guarde contratos y comprobantes en un lugar seguro",
];

function errorDeCuit(cuit: string): string {
  if (cuit.length === 0) return "Ingrese su CUIT o CUIL.";
  if (soloDigitos(cuit).length < 11) return "Faltan dígitos: son 11 en total.";
  return "El número no es válido. Revise que no haya un dígito cambiado.";
}

function mensajeDeErrorDeRegistro(err: unknown): string {
  if (err instanceof ApiError && err.message === "Tax ID already registered") {
    return "Ese CUIT ya tiene una cuenta. Inicie sesión o use otro.";
  }
  if (err instanceof ApiError && err.message === "Phone number already registered") {
    return "Ese teléfono ya tiene una cuenta. Inicie sesión o use otro.";
  }
  if (err instanceof ApiError && err.status === 400) {
    return "Verifique los datos ingresados e inténtelo de nuevo.";
  }
  return "No pudimos crear su cuenta. Inténtelo de nuevo más tarde.";
}

function CheckIcon() {
  return <Check aria-hidden="true" className="size-5 shrink-0" color="var(--lila)" strokeWidth={3} />;
}

function ShieldIcon() {
  return <ShieldCheck aria-hidden="true" className="size-[18px] shrink-0" color="var(--success)" />;
}

function MailIcon() {
  return <Mail aria-hidden="true" className="size-12" color="var(--primary)" strokeWidth={1.5} />;
}

function EyeIcon() {
  return <Eye aria-hidden="true" className="size-5" />;
}

function EyeOffIcon() {
  return <EyeOff aria-hidden="true" className="size-5" />;
}

function TaxIdField({
  value,
  touched,
  valid,
  error,
  disabled,
  onChange,
  onBlur,
}: Readonly<{
  value: string;
  touched: boolean;
  valid: boolean;
  error: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}>) {
  const invalid = touched && !valid;
  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <label htmlFor="rg-tax-id" className="font-bold">CUIT o CUIL</label>
      <input
        id="rg-tax-id"
        name="taxId"
        type="text"
        inputMode="numeric"
        placeholder="20-12345678-9"
        required
        disabled={disabled}
        value={value}
        aria-invalid={invalid}
        aria-describedby={invalid ? "rg-tax-id-error" : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 text-[17px] outline-offset-0 disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[var(--primary)] focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
        style={{ borderColor: invalid ? "var(--danger)" : "var(--border-strong)", color: "var(--text)" }}
      />
      {invalid && (
        <p id="rg-tax-id-error" className="text-[14px] font-semibold" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function PhoneField({
  value,
  touched,
  valid,
  disabled,
  onChange,
  onBlur,
}: Readonly<{
  value: string;
  touched: boolean;
  valid: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}>) {
  const invalid = touched && !valid;
  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <label htmlFor="rg-phone" className="font-bold">Teléfono</label>
      <input
        id="rg-phone"
        name="phoneNumber"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="11 44552210"
        required
        disabled={disabled}
        value={value}
        aria-invalid={invalid}
        aria-describedby={invalid ? "rg-phone-error" : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 text-[17px] outline-offset-0 disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[var(--primary)] focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
        style={{ borderColor: invalid ? "var(--danger)" : "var(--border-strong)", color: "var(--text)" }}
      />
      {invalid && (
        <p id="rg-phone-error" className="text-[14px] font-semibold" style={{ color: "var(--danger)" }}>
          {errorDeTelefono(value)}
        </p>
      )}
    </div>
  );
}

function PasswordField({ showPassword, disabled, onToggle }: Readonly<{
  showPassword: boolean;
  disabled: boolean;
  onToggle: () => void;
}>) {
  const inputType = showPassword ? "text" : "password";
  const toggleLabel = showPassword ? "Ocultar contraseña" : "Mostrar contraseña";
  const ToggleIcon = showPassword ? EyeOffIcon : EyeIcon;
  return (
    <div className="mb-2 flex flex-col gap-1.5">
      <label htmlFor="rg-pass" className="font-bold">Contraseña</label>
      <div className="relative">
        <input
          id="rg-pass"
          name="password"
          type={inputType}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          required
          disabled={disabled}
          className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 pr-12 text-[17px] outline-offset-0 disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[var(--primary)] focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        />
        <button
          type="button"
          aria-label={toggleLabel}
          onClick={onToggle}
          className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded p-1 focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
          style={{ color: "var(--text-2)" }}
        >
          <ToggleIcon />
        </button>
      </div>
    </div>
  );
}

export default function RegistroPage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [taxId, setTaxId] = useState("");
  const [taxIdTouched, setTaxIdTouched] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  const taxIdOk = cuitValido(taxId);
  const taxIdError = errorDeCuit(taxId);

  const phoneOk = telefonoValido(phone);
  const submitButtonLabel = isPending ? "Creando cuenta…" : "Crear cuenta";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    // El CUIT se valida acá y no con `required` porque el navegador no sabe
    // calcular el dígito verificador: sin esto el error llegaría como un 400
    // del backend que no dice qué campo está mal.
    if (!taxIdOk) {
      setTaxIdTouched(true);
      return;
    }
    if (!phoneOk) {
      setPhoneTouched(true);
      return;
    }
    setIsPending(true);
    const form = new FormData(e.currentTarget);
    try {
      await apiPost(
        "/auth/register",
        {
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          password: form.get("password"),
          // El backend lo exige: @NotBlank @ValidTaxId en RegisterRequest, y
          // User.tax_id es nullable = false y unique.
          taxId: soloDigitos(taxId),
          // Igual que el CUIT: @NotBlank @ValidPhoneNumber en RegisterRequest, y
          // User.phone_number es nullable = false y unique. En dígitos por
          // simplicidad, no porque el backend lo exija: su normalizador ya
          // reconstruye el número igual venga con espacios, guiones, el 0 de la
          // característica o el 15 del celular — ver src/lib/telefono.ts.
          phoneNumber: soloDigitosTelefono(phone),
        },
        { retry: false }
      );
      setSubmitted(true);
    } catch (err) {
      setError(mensajeDeErrorDeRegistro(err));
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
              Empiece gratis y tome el control de sus alquileres.
            </h1>
            <p className="max-w-[420px] text-[17.5px] text-[var(--on-dark-secondary)]">
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
              /* Success state */
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
                <h2 className="font-heading mb-2 text-center text-[22px] font-bold">
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
                        className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 text-[17px] outline-offset-0 disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[var(--primary)] focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
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
                        className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 text-[17px] outline-offset-0 disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[var(--primary)] focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
                        style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                      />
                    </div>
                  </div>

                  <TaxIdField
                    value={taxId}
                    touched={taxIdTouched}
                    valid={taxIdOk}
                    error={taxIdError}
                    disabled={isPending}
                    onChange={(value) => setTaxId(formatearCuit(value))}
                    onBlur={() => setTaxIdTouched(true)}
                  />

                  <PhoneField
                    value={phone}
                    touched={phoneTouched}
                    valid={phoneOk}
                    disabled={isPending}
                    onChange={setPhone}
                    onBlur={() => setPhoneTouched(true)}
                  />

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
                      placeholder="ejemplo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="min-h-[50px] w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 text-[17px] outline-offset-0 disabled:opacity-60 placeholder:text-[var(--border-strong)] focus-visible:border-[var(--primary)] focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
                      style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                    />
                  </div>

                  <PasswordField
                    showPassword={showPassword}
                    disabled={isPending}
                    onToggle={() => setShowPassword((value) => !value)}
                  />

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
                    {submitButtonLabel}
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
