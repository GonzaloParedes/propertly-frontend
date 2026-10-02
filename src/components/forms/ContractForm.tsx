"use client";

import { useState } from "react";
import type {
  AdjustmentFrequency,
  CommissionPayer,
  Currency,
  IndexType,
  LateFeeType,
  Property,
  Tenant,
} from "@/lib/types";
import { Building2, Check, FileText, TrendingUp, Upload } from "lucide-react";
import { DEPOSIT_TYPES } from "@/lib/mock-data";
import { inputClass, selectClass, fieldBorderStyle, labelClass } from "@/components/ui/field-styles";
import Field from "@/components/ui/Field";
import SectionCard from "@/components/ui/SectionCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PropertySelector from "./PropertySelector";
import TenantsField from "./TenantsField";

type Errors = Record<string, string>;

interface ContractFormValues {
  property: Property | null;
  tenants: Tenant[];
  startDate: string;
  endDate: string;
  rentAmount: string;
  paymentDueDay: string;
  depositAmount: string;
  depositType: string;
  commissionPercent: string;
  commissionPayer: CommissionPayer | "";
  indexType: IndexType | "";
  customIndexPercent: string;
  adjustmentFrequency: AdjustmentFrequency | "";
  autoRenewal: boolean | null;
  terminationNoticeMonths: string;
  hasEarlyTerminationPenalty: boolean;
  earlyTerminationPenalty: string;
  lateFeeValue: string;
  lateFeeGraceDays: string;
}

function validarDatosBasicos(values: ContractFormValues, errors: Errors) {
  if (!values.property) errors.property = "Seleccione o cree un inmueble para el contrato.";
  if (values.tenants.length === 0) errors.tenants = "Agregue al menos un inquilino.";
  if (!values.startDate) errors.startDate = "Ingrese la fecha de inicio.";
  if (!values.endDate) errors.endDate = "Ingrese la fecha de fin.";
  if (values.startDate && values.endDate && values.endDate <= values.startDate) {
    errors.endDate = "La fecha de fin debe ser posterior a la de inicio.";
  }
  if (!values.rentAmount || Number(values.rentAmount) <= 0) {
    errors.rentAmount = "Ingrese un monto de alquiler válido.";
  }
  if (!values.paymentDueDay || Number(values.paymentDueDay) < 1 || Number(values.paymentDueDay) > 31) {
    errors.paymentDueDay = "Ingrese un día entre 1 y 31.";
  }
}

function validarGarantiasYComision(values: ContractFormValues, errors: Errors) {
  if (!values.depositAmount) errors.depositAmount = "Ingrese el monto del depósito.";
  if (!values.depositType) errors.depositType = "Seleccione el tipo de garantía.";
  if (!values.commissionPercent || Number(values.commissionPercent) < 0 || Number(values.commissionPercent) > 100) {
    errors.commissionPercent = "Ingrese un porcentaje entre 0 y 100.";
  }
  if (!values.commissionPayer) errors.commissionPayer = "Indique quién está a cargo de la comisión.";
}

function validarIndexacionYReglas(values: ContractFormValues, errors: Errors) {
  if (!values.indexType) errors.indexType = "Seleccione el tipo de índice.";
  if (values.indexType === "CUSTOM" && !values.customIndexPercent) {
    errors.customIndexPercent = "Ingrese el porcentaje de ajuste.";
  }
  if (!values.adjustmentFrequency) errors.adjustmentFrequency = "Seleccione la frecuencia de ajuste.";
  if (values.autoRenewal === null) errors.autoRenewal = "Indique si el contrato se renueva automáticamente.";
  if (!values.terminationNoticeMonths) errors.terminationNoticeMonths = "Ingrese el preaviso en meses.";
  if (values.hasEarlyTerminationPenalty && !values.earlyTerminationPenalty) {
    errors.earlyTerminationPenalty = "Ingrese el monto de la multa.";
  }
  if (!values.lateFeeValue) errors.lateFeeValue = "Ingrese el valor del punitorio.";
  if (!values.lateFeeGraceDays) errors.lateFeeGraceDays = "Ingrese los días de gracia.";
}

function validarContrato(values: ContractFormValues): Errors {
  const errors: Errors = {};
  validarDatosBasicos(values, errors);
  validarGarantiasYComision(values, errors);
  validarIndexacionYReglas(values, errors);
  return errors;
}

const SECTIONS = [
  { id: "section-inmueble", label: "Inmueble" },
  { id: "section-contrato", label: "Datos del contrato" },
  { id: "section-indexacion", label: "Indexación" },
  { id: "section-reglas", label: "Reglas y documentación" },
];

function BuildingIcon() {
  return <Building2 aria-hidden="true" className="size-5" />;
}

function TrendingUpIcon() {
  return <TrendingUp aria-hidden="true" className="size-5" />;
}

function DocumentIcon() {
  return <FileText aria-hidden="true" className="size-5" />;
}

function UploadIcon() {
  return <Upload aria-hidden="true" className="size-5" />;
}

function ToggleGroup<T extends string>({
  name,
  value,
  options,
  onChange,
  disabled,
}: {
  name: string;
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className="cursor-pointer rounded-[10px] border-2 px-4 py-2 text-[15.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
            style={{
              borderColor: isSelected ? "var(--primary)" : "var(--border-strong)",
              background: isSelected ? "var(--primary)" : "white",
              color: isSelected ? "white" : "var(--text)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ContractForm() {
  const [property, setProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [paymentDueDay, setPaymentDueDay] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositType, setDepositType] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("");
  const [commissionPayer, setCommissionPayer] = useState<CommissionPayer | "">("");

  const [indexType, setIndexType] = useState<IndexType | "">("");
  const [customIndexPercent, setCustomIndexPercent] = useState("");
  const [adjustmentFrequency, setAdjustmentFrequency] = useState<AdjustmentFrequency | "">("");

  const [autoRenewal, setAutoRenewal] = useState<boolean | null>(null);
  const [terminationNoticeMonths, setTerminationNoticeMonths] = useState("");
  const [hasEarlyTerminationPenalty, setHasEarlyTerminationPenalty] = useState(false);
  const [earlyTerminationPenalty, setEarlyTerminationPenalty] = useState("");
  const [lateFeeType, setLateFeeType] = useState<LateFeeType>("PORCENTAJE");
  const [lateFeeValue, setLateFeeValue] = useState("");
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState("");
  const [signedContractFile, setSignedContractFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");

  const [errors, setErrors] = useState<Errors>({});
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const usaIndicePublicado = ["IPC", "ICL"].includes(indexType);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.type !== "application/pdf") {
      setFileError("El archivo debe ser un PDF.");
      setSignedContractFile(null);
      return;
    }
    setFileError("");
    setSignedContractFile(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formErrors = validarContrato({
      property,
      tenants,
      startDate,
      endDate,
      rentAmount,
      paymentDueDay,
      depositAmount,
      depositType,
      commissionPercent,
      commissionPayer,
      indexType,
      customIndexPercent,
      adjustmentFrequency,
      autoRenewal,
      terminationNoticeMonths,
      hasEarlyTerminationPenalty,
      earlyTerminationPenalty,
      lateFeeValue,
      lateFeeGraceDays,
    });
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      const firstErrorField = document.querySelector(`[aria-invalid="true"], [id="${Object.keys(formErrors)[0]}"]`);
      firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    setIsPending(true);

    // Maqueta: no hay endpoint /contracts todavía — simula la latencia de guardado.
    await new Promise((resolve) => setTimeout(resolve, 600));

    setIsPending(false);
    setIsSuccess(true);
  }

  if (isSuccess) {
    return (
      <div
        className="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border bg-white p-8 text-center"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow)" }}
      >
        <div
          className="mb-4 flex size-16 items-center justify-center rounded-full"
          style={{ background: "var(--success-bg)", color: "var(--success)" }}
        >
          <Check aria-hidden="true" className="size-8" strokeWidth={2.5} />
        </div>
        <h2 className="font-heading mb-2 text-[22px] font-bold">Contrato creado</h2>
        <p className="mb-3" style={{ color: "var(--text-2)" }}>
          El contrato de {property?.address} quedó guardado con estado:
        </p>
        <Badge tone="info">Vigente</Badge>
        <Button
          className="mt-6"
          onClick={() => {
            window.location.href = "/dashboard";
          }}
        >
          Volver al panel
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <nav
        aria-label="Secciones del formulario"
        className="sticky top-16 z-20 -mx-1 flex gap-2 overflow-x-auto rounded-[12px] border bg-white/95 px-3 py-2 backdrop-blur"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow)" }}
      >
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 rounded-[8px] px-3 py-1.5 text-[14.5px] font-bold whitespace-nowrap hover:bg-[var(--bg)]"
            style={{ color: "var(--text-2)" }}
          >
            {s.label}
          </a>
        ))}
      </nav>

      <SectionCard
        id="section-inmueble"
        title="Inmueble"
        description="Seleccione un inmueble ya cargado o cree uno nuevo sin salir de este formulario."
        icon={<BuildingIcon />}
      >
        <PropertySelector selectedProperty={property} onSelect={setProperty} onClear={() => setProperty(null)} error={errors.property} />
      </SectionCard>

      <SectionCard id="section-contrato" title="Datos del contrato" icon={<DocumentIcon />}>
        <TenantsField tenants={tenants} onChange={setTenants} error={errors.tenants} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de inicio" htmlFor="start-date" required error={errors.startDate}>
            <input
              id="start-date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
              style={fieldBorderStyle(!!errors.startDate)}
            />
          </Field>
          <Field label="Fecha de fin" htmlFor="end-date" required error={errors.endDate}>
            <input
              id="end-date"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
              style={fieldBorderStyle(!!errors.endDate)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Monto inicial del alquiler" htmlFor="rent-amount" required error={errors.rentAmount} className="sm:col-span-2">
            <input
              id="rent-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="Ej: 520000"
              required
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
              className={inputClass}
              style={fieldBorderStyle(!!errors.rentAmount)}
            />
          </Field>
          <Field label="Moneda" htmlFor="currency" required>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className={selectClass}
              style={fieldBorderStyle(false)}
            >
              <option value="ARS">Peso argentino (ARS)</option>
              <option value="USD">Dólar estadounidense (USD)</option>
            </select>
          </Field>
        </div>

        <Field label="Día de vencimiento del pago" htmlFor="due-day" required error={errors.paymentDueDay} hint="Día del mes, entre 1 y 31.">
          <input
            id="due-day"
            type="number"
            min={1}
            max={31}
            placeholder="Ej: 10"
            required
            value={paymentDueDay}
            onChange={(e) => setPaymentDueDay(e.target.value)}
            className={`${inputClass} sm:max-w-[160px]`}
            style={fieldBorderStyle(!!errors.paymentDueDay)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Monto del depósito/garantía" htmlFor="deposit-amount" required error={errors.depositAmount}>
            <input
              id="deposit-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="Ej: 520000"
              required
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className={inputClass}
              style={fieldBorderStyle(!!errors.depositAmount)}
            />
          </Field>
          <Field label="Tipo de garantía" htmlFor="deposit-type" required error={errors.depositType}>
            <select
              id="deposit-type"
              required
              value={depositType}
              onChange={(e) => setDepositType(e.target.value)}
              className={selectClass}
              style={fieldBorderStyle(!!errors.depositType)}
            >
              <option value="">Seleccionar…</option>
              {DEPOSIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="% de comisión" htmlFor="commission-percent" required error={errors.commissionPercent}>
            <input
              id="commission-percent"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.01"
              placeholder="Ej: 5"
              required
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value)}
              className={inputClass}
              style={fieldBorderStyle(!!errors.commissionPercent)}
            />
          </Field>
          <Field label="Comisión a cargo de" htmlFor="commission-payer" required error={errors.commissionPayer}>
            <select
              id="commission-payer"
              required
              value={commissionPayer}
              onChange={(e) => setCommissionPayer(e.target.value as CommissionPayer)}
              className={selectClass}
              style={fieldBorderStyle(!!errors.commissionPayer)}
            >
              <option value="">Seleccionar…</option>
              <option value="PROPIETARIO">Propietario</option>
              <option value="INQUILINO">Inquilino</option>
              <option value="COMPARTIDA">Compartida (50/50)</option>
            </select>
          </Field>
        </div>
      </SectionCard>

      <SectionCard id="section-indexacion" title="Indexación" description="Defina cómo se ajusta el alquiler durante el contrato." icon={<TrendingUpIcon />}>
        <div className="flex flex-col gap-2">
          <span className={labelClass}>
            Tipo de índice <span aria-hidden="true" style={{ color: "var(--danger)" }}>*</span>
          </span>
          <ToggleGroup
            name="Tipo de índice"
            value={indexType}
            onChange={setIndexType}
            options={[
              { value: "IPC", label: "IPC" },
              { value: "ICL", label: "ICL" },
              { value: "CUSTOM", label: "Personalizado" },
            ]}
          />
          {errors.indexType && (
            <p role="alert" className="text-[14px] font-semibold" style={{ color: "var(--danger)" }}>
              {errors.indexType}
            </p>
          )}
        </div>

        {indexType === "CUSTOM" && (
          <Field label="% de ajuste manual" htmlFor="custom-index" required error={errors.customIndexPercent}>
            <input
              id="custom-index"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="Ej: 8"
              required
              value={customIndexPercent}
              onChange={(e) => setCustomIndexPercent(e.target.value)}
              className={`${inputClass} sm:max-w-[200px]`}
              style={fieldBorderStyle(!!errors.customIndexPercent)}
            />
          </Field>
        )}

        {usaIndicePublicado && (
          <p className="text-[15px]" style={{ color: "var(--text-2)" }}>
            El ajuste se calculará automáticamente según la variación del índice {indexType}.
          </p>
        )}

        <Field label="Frecuencia de ajuste" htmlFor="adjustment-frequency" required error={errors.adjustmentFrequency}>
          <select
            id="adjustment-frequency"
            required
            value={adjustmentFrequency}
            onChange={(e) => setAdjustmentFrequency(e.target.value as AdjustmentFrequency)}
            className={`${selectClass} sm:max-w-[280px]`}
            style={fieldBorderStyle(!!errors.adjustmentFrequency)}
          >
            <option value="">Seleccionar…</option>
            <option value="MENSUAL">Mensual</option>
            <option value="TRIMESTRAL">Trimestral</option>
            <option value="SEMESTRAL">Semestral</option>
            <option value="ANUAL">Anual</option>
          </select>
        </Field>
      </SectionCard>

      <SectionCard id="section-reglas" title="Reglas y documentación" icon={<DocumentIcon />}>
        <div className="flex flex-col gap-2">
          <span className={labelClass}>
            Renovación automática <span aria-hidden="true" style={{ color: "var(--danger)" }}>*</span>
          </span>
          <div role="radiogroup" aria-label="Renovación automática" className="flex gap-2">
            {[
              { value: true, label: "Sí" },
              { value: false, label: "No" },
            ].map((opt) => {
              const isSelected = autoRenewal === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setAutoRenewal(opt.value)}
                  className="cursor-pointer rounded-[10px] border-2 px-5 py-2 text-[15.5px] font-bold transition-colors focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
                  style={{
                    borderColor: isSelected ? "var(--primary)" : "var(--border-strong)",
                    background: isSelected ? "var(--primary)" : "white",
                    color: isSelected ? "white" : "var(--text)",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {errors.autoRenewal && (
            <p role="alert" className="text-[14px] font-semibold" style={{ color: "var(--danger)" }}>
              {errors.autoRenewal}
            </p>
          )}
        </div>

        <div className="rounded-[12px] border p-4" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          <p className={`${labelClass} mb-3`}>Cláusula de rescisión anticipada</p>
          <div className="flex flex-col gap-4">
            <Field
              label="Preaviso (meses)"
              htmlFor="termination-notice"
              required
              error={errors.terminationNoticeMonths}
              className="sm:max-w-[200px]"
            >
              <input
                id="termination-notice"
                type="number"
                min={0}
                placeholder="Ej: 1"
                required
                value={terminationNoticeMonths}
                onChange={(e) => setTerminationNoticeMonths(e.target.value)}
                className={inputClass}
                style={fieldBorderStyle(!!errors.terminationNoticeMonths)}
              />
            </Field>

            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={hasEarlyTerminationPenalty}
                onChange={(e) => setHasEarlyTerminationPenalty(e.target.checked)}
                className="size-[18px] cursor-pointer accent-[var(--primary)]"
              />
              <span className="font-bold">¿Aplica multa por rescisión anticipada?</span>
            </label>

            {hasEarlyTerminationPenalty && (
              <Field label="Monto de la multa" htmlFor="termination-penalty" required error={errors.earlyTerminationPenalty} className="sm:max-w-[240px]">
                <input
                  id="termination-penalty"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="Ej: 520000"
                  required
                  value={earlyTerminationPenalty}
                  onChange={(e) => setEarlyTerminationPenalty(e.target.value)}
                  className={inputClass}
                  style={fieldBorderStyle(!!errors.earlyTerminationPenalty)}
                />
              </Field>
            )}
          </div>
        </div>

        <div className="rounded-[12px] border p-4" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          <p className={`${labelClass} mb-3`}>Punitorios por mora</p>
          <div className="flex flex-col gap-4">
            <ToggleGroup
              name="Tipo de punitorio"
              value={lateFeeType}
              onChange={setLateFeeType}
              options={[
                { value: "PORCENTAJE", label: "% por día" },
                { value: "MONTO_FIJO", label: "Monto fijo" },
              ]}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={lateFeeType === "PORCENTAJE" ? "Porcentaje" : "Monto fijo"}
                htmlFor="late-fee-value"
                required
                error={errors.lateFeeValue}
              >
                <input
                  id="late-fee-value"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder={lateFeeType === "PORCENTAJE" ? "Ej: 2" : "Ej: 15000"}
                  required
                  value={lateFeeValue}
                  onChange={(e) => setLateFeeValue(e.target.value)}
                  className={inputClass}
                  style={fieldBorderStyle(!!errors.lateFeeValue)}
                />
              </Field>
              <Field label="Días de gracia" htmlFor="late-fee-grace" required error={errors.lateFeeGraceDays}>
                <input
                  id="late-fee-grace"
                  type="number"
                  min={0}
                  placeholder="Ej: 5"
                  required
                  value={lateFeeGraceDays}
                  onChange={(e) => setLateFeeGraceDays(e.target.value)}
                  className={inputClass}
                  style={fieldBorderStyle(!!errors.lateFeeGraceDays)}
                />
              </Field>
            </div>
          </div>
        </div>

        <Field
          label="Adjuntar contrato firmado (PDF)"
          htmlFor="signed-contract"
          hint={signedContractFile ? undefined : "Opcional en este momento: puede subirlo más tarde."}
          error={fileError}
        >
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="signed-contract"
              className="flex cursor-pointer items-center gap-2 rounded-[10px] border-2 px-5 py-2.5 text-[16px] font-bold transition-colors hover:bg-[var(--primary-soft)]"
              style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
            >
              <UploadIcon />
              {signedContractFile ? "Reemplazar archivo" : "Elegir archivo PDF"}
            </label>
            <input id="signed-contract" type="file" accept="application/pdf" onChange={handleFileChange} className="sr-only" />
            {signedContractFile && (
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold">{signedContractFile.name}</span>
                <button
                  type="button"
                  aria-label="Quitar archivo adjunto"
                  onClick={() => setSignedContractFile(null)}
                  className="cursor-pointer rounded-[8px] px-2 py-1 text-[14px] font-bold"
                  style={{ color: "var(--danger)" }}
                >
                  Quitar
                </button>
              </div>
            )}
          </div>
        </Field>
      </SectionCard>

      {Object.keys(errors).length > 0 && (
        <p role="alert" className="rounded-[8px] px-3 py-2 text-[15px] font-semibold" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
          Revise los campos marcados antes de guardar el contrato.
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar contrato"}
        </Button>
      </div>
    </form>
  );
}
