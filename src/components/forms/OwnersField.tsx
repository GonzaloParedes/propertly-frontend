"use client";

import { useState } from "react";
import type { Owner, PropertyOwner } from "@/lib/types";
import { MOCK_OWNERS } from "@/lib/mock-data";
import { inputClass, fieldBorderStyle, labelClass } from "@/components/ui/field-styles";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";

interface OwnersFieldProps {
  owners: PropertyOwner[];
  onChange: (owners: PropertyOwner[]) => void;
  error?: string;
}

let ownerCounter = 0;

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// Buscador + "crear nuevo" sobre un directorio compartido de propietarios
// (mismo patrón que PropertySelector/TenantsField): evita retipear nombre,
// teléfono y email cada vez que un propietario ya cargado tiene otro inmueble.
export default function OwnersField({ owners, onChange, error }: OwnersFieldProps) {
  const [search, setSearch] = useState("");
  const [availableOwners, setAvailableOwners] = useState<Owner[]>(MOCK_OWNERS);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const selectedIds = new Set(owners.map((po) => po.owner.id));
  const results =
    search.trim().length >= 1
      ? availableOwners.filter((o) => !selectedIds.has(o.id) && o.name.toLowerCase().includes(search.trim().toLowerCase()))
      : [];

  const showPercent = owners.length > 1;
  const percentSum = owners.reduce(
    (sum, po) => sum + (Number.parseFloat(po.ownershipPercent) || 0),
    0
  );

  function addOwner(owner: Owner) {
    onChange([...owners, { owner, ownershipPercent: "" }]);
    setSearch("");
  }

  function removeOwner(ownerId: string) {
    onChange(owners.filter((po) => po.owner.id !== ownerId));
  }

  function updatePercent(ownerId: string, value: string) {
    onChange(owners.map((po) => (po.owner.id === ownerId ? { ...po, ownershipPercent: value } : po)));
  }

  function handleCreateOwner() {
    if (!newName.trim() || !newEmail.trim()) return;
    ownerCounter += 1;
    const owner: Owner = {
      id: `owner-${Date.now()}-${ownerCounter}`,
      name: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim(),
    };
    setAvailableOwners((prev) => [owner, ...prev]);
    addOwner(owner);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setIsCreateFormOpen(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Propietario/s"
        htmlFor="owner-search"
        required
        error={error}
        hint="Busque por nombre entre los propietarios ya cargados."
      >
        <input
          id="owner-search"
          type="text"
          placeholder="Buscar propietario…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputClass}
          style={fieldBorderStyle(!!error)}
        />
      </Field>

      {results.length > 0 && (
        <ul role="listbox" aria-label="Resultados de propietarios" className="overflow-hidden rounded-[10px] border bg-white" style={{ borderColor: "var(--border)" }}>
          {results.map((owner) => (
            <li key={owner.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => addOwner(owner)}
                className="flex w-full cursor-pointer flex-col items-start px-3.5 py-2.5 text-left hover:bg-[var(--bg)]"
              >
                <span className="font-bold">{owner.name}</span>
                <span className="text-[14px]" style={{ color: "var(--text-2)" }}>
                  {owner.email}
                  {owner.phone && ` · ${owner.phone}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {owners.length > 0 && (
        <ul className="flex flex-col gap-3">
          {owners.map((po) => (
            <li
              key={po.owner.id}
              className="rounded-[10px] border px-3.5 py-2.5"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold">{po.owner.name}</span>
                  <p className="text-[14px]" style={{ color: "var(--text-2)" }}>
                    {po.owner.email}
                    {po.owner.phone && ` · ${po.owner.phone}`}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Quitar a ${po.owner.name}`}
                  onClick={() => removeOwner(po.owner.id)}
                  className="shrink-0 cursor-pointer rounded-[8px] px-2 py-1 text-[14px] font-bold focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
                  style={{ color: "var(--danger)" }}
                >
                  Quitar
                </button>
              </div>

              {showPercent && (
                <div className="mt-3 max-w-[180px]">
                  <Field label="% participación" htmlFor={`owner-percent-${po.owner.id}`}>
                    <input
                      id={`owner-percent-${po.owner.id}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder="Ej: 50"
                      value={po.ownershipPercent}
                      onChange={(e) => updatePercent(po.owner.id, e.target.value)}
                      className={inputClass}
                      style={fieldBorderStyle(false)}
                    />
                  </Field>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {showPercent && (
        <p className="text-[14px]" style={{ color: percentSum === 100 ? "var(--success)" : "var(--warn)" }}>
          Suma de participación: {percentSum}%{percentSum !== 100 && " (debería sumar 100%)"}
        </p>
      )}

      {isCreateFormOpen ? (
        <div className="rounded-[12px] border p-4" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          <p className={`${labelClass} mb-3`}>Crear propietario nuevo</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Nombre completo" htmlFor="new-owner-name">
              <input
                id="new-owner-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={inputClass}
                style={fieldBorderStyle(false)}
              />
            </Field>
            <Field label="Correo electrónico" htmlFor="new-owner-email">
              <input
                id="new-owner-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={inputClass}
                style={fieldBorderStyle(false)}
              />
            </Field>
            <Field label="Teléfono" htmlFor="new-owner-phone">
              <input
                id="new-owner-phone"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className={inputClass}
                style={fieldBorderStyle(false)}
              />
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={() => setIsCreateFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOwner} disabled={!newName.trim() || !newEmail.trim()}>
              Agregar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setIsCreateFormOpen(true)} className="self-start">
          <PlusIcon />
          Crear propietario nuevo
        </Button>
      )}
    </div>
  );
}
