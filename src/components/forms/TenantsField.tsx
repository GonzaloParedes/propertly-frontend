"use client";

import { useState } from "react";
import type { Tenant } from "@/lib/types";
import { MOCK_TENANTS } from "@/lib/mock-data";
import { inputClass, fieldBorderStyle, labelClass } from "@/components/ui/field-styles";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface TenantsFieldProps {
  tenants: Tenant[];
  onChange: (tenants: Tenant[]) => void;
  error?: string;
}

let guarantorCounter = 0;

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export default function TenantsField({ tenants, onChange, error }: TenantsFieldProps) {
  const [search, setSearch] = useState("");
  const [isGuarantorFormOpen, setIsGuarantorFormOpen] = useState(false);
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorEmail, setGuarantorEmail] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");

  const selectedIds = new Set(tenants.map((t) => t.id));
  const results =
    search.trim().length >= 1
      ? MOCK_TENANTS.filter((t) => !selectedIds.has(t.id) && t.name.toLowerCase().includes(search.trim().toLowerCase()))
      : [];

  function addTenant(tenant: Tenant) {
    onChange([...tenants, tenant]);
    setSearch("");
  }

  function removeTenant(id: string) {
    onChange(tenants.filter((t) => t.id !== id));
  }

  function handleAddGuarantor() {
    if (!guarantorName.trim() || !guarantorEmail.trim()) return;
    guarantorCounter += 1;
    addTenant({
      id: `guarantor-${Date.now()}-${guarantorCounter}`,
      name: guarantorName.trim(),
      email: guarantorEmail.trim(),
      phone: guarantorPhone.trim(),
      isGuarantor: true,
    });
    setGuarantorName("");
    setGuarantorEmail("");
    setGuarantorPhone("");
    setIsGuarantorFormOpen(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="Inquilino/s" htmlFor="tenant-search" required error={error} hint="Busque por nombre entre los inquilinos ya cargados.">
        <input
          id="tenant-search"
          type="text"
          placeholder="Buscar inquilino…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputClass}
          style={fieldBorderStyle(!!error)}
        />
      </Field>

      {results.length > 0 && (
        <ul
          role="listbox"
          aria-label="Resultados de inquilinos"
          className="overflow-hidden rounded-[10px] border bg-white"
          style={{ borderColor: "var(--border)" }}
        >
          {results.map((tenant) => (
            <li key={tenant.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => addTenant(tenant)}
                className="flex w-full cursor-pointer flex-col items-start px-3.5 py-2.5 text-left hover:bg-[var(--bg)]"
              >
                <span className="font-bold">{tenant.name}</span>
                <span className="text-[14px]" style={{ color: "var(--text-2)" }}>
                  {tenant.email}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tenants.length > 0 && (
        <ul className="flex flex-col gap-2">
          {tenants.map((tenant) => (
            <li
              key={tenant.id}
              className="flex items-center justify-between gap-3 rounded-[10px] border px-3.5 py-2.5"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <div className="flex items-center gap-2.5">
                <span className="font-bold">{tenant.name}</span>
                {tenant.isGuarantor && <Badge tone="info">Garante</Badge>}
              </div>
              <button
                type="button"
                aria-label={`Quitar a ${tenant.name}`}
                onClick={() => removeTenant(tenant.id)}
                className="cursor-pointer rounded-[8px] px-2 py-1 text-[14px] font-bold focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
                style={{ color: "var(--danger)" }}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {isGuarantorFormOpen ? (
        <div className="rounded-[12px] border p-4" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          <p className={`${labelClass} mb-3`}>Agregar garante</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Nombre" htmlFor="guarantor-name">
              <input
                id="guarantor-name"
                type="text"
                value={guarantorName}
                onChange={(e) => setGuarantorName(e.target.value)}
                className={inputClass}
                style={fieldBorderStyle(false)}
              />
            </Field>
            <Field label="Correo electrónico" htmlFor="guarantor-email">
              <input
                id="guarantor-email"
                type="email"
                value={guarantorEmail}
                onChange={(e) => setGuarantorEmail(e.target.value)}
                className={inputClass}
                style={fieldBorderStyle(false)}
              />
            </Field>
            <Field label="Teléfono" htmlFor="guarantor-phone">
              <input
                id="guarantor-phone"
                type="tel"
                value={guarantorPhone}
                onChange={(e) => setGuarantorPhone(e.target.value)}
                className={inputClass}
                style={fieldBorderStyle(false)}
              />
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={() => setIsGuarantorFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddGuarantor} disabled={!guarantorName.trim() || !guarantorEmail.trim()}>
              Agregar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setIsGuarantorFormOpen(true)} className="self-start">
          <PlusIcon />
          Agregar garante
        </Button>
      )}
    </div>
  );
}
