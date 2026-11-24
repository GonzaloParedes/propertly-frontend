"use client";

import { useEffect, useRef, useState } from "react";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { AblJurisdiction, AblPayer, AblPeriodResponse, AblResponse, AblStatus } from "@/lib/backend-types";
import { copyDeError, ERROR } from "@/lib/error-codes";
import { useToast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";

const ABL_LOOKUP_URLS: Record<AblJurisdiction, string> = {
  CABA_AGIP: "https://lb.agip.gob.ar/ConsultaABL/",
  PBA_ARBA: "https://app.arba.gov.ar/AvisoDeudas/",
};

const ABL_MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const ABL_RECEIPT_ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";
const ABL_RECEIPT_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

function formatPeriodo(period: string): string {
  const [year, month] = period.split("-");
  return `${month}/${year}`;
}

function formatPartidaDisplay(jurisdiction: AblJurisdiction | null, partida: string | null): string {
  if (!partida) return "";
  if (jurisdiction === "PBA_ARBA" && partida.length === 9) {
    return `${partida.slice(0, 3)}-${partida.slice(3)}`;
  }
  return partida;
}

function currentMonthStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function validatePartida(jurisdiction: AblJurisdiction, partida: string, dv: string): string | null {
  if (!partida) return "Ingresá la partida.";
  if (jurisdiction === "CABA_AGIP") {
    if (!/^\d{1,7}$/.test(partida)) return "La partida AGIP debe tener entre 1 y 7 dígitos.";
    if (dv && !/^\d$/.test(dv)) return "El dígito verificador debe ser un único dígito.";
  } else {
    const digits = partida.replace(/[-\s]/g, "");
    if (!/^\d{9}$/.test(digits)) return "La partida ARBA debe tener 9 dígitos (formato PPP-CCCCCC).";
  }
  return null;
}

const STATUS_DOT: Record<string, string> = {
  PAGO: "#16a34a",
  IMPAGO: "var(--error)",
  SIN_DATO: "var(--gris)",
};

function PeriodChip({
  period,
  selected,
  onClick,
}: Readonly<{ period: AblPeriodResponse; selected: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      role="tab"
      className={`owner-abl-chip${selected ? " owner-abl-chip--selected" : ""}`}
      aria-selected={selected}
      onClick={onClick}
    >
      <span
        className="owner-abl-chip__dot"
        style={{ background: STATUS_DOT[period.status] ?? "var(--gris)" }}
        aria-hidden="true"
      />
      {formatPeriodo(period.period)}
    </button>
  );
}

type DeleteConfirm = { period: AblPeriodResponse; busy: boolean; error: string | null };

type ReceiptState = { busy: boolean; error: string | null };

// --- PeriodRow ---

function PeriodRow({
  propertyId,
  period,
  onStatusChange,
  onPayerChange,
  onDeleted,
  onReceiptChanged,
}: Readonly<{
  propertyId: number;
  period: AblPeriodResponse;
  onStatusChange: (updated: AblPeriodResponse) => void;
  onPayerChange: (updated: AblPeriodResponse) => void;
  onDeleted: (period: AblPeriodResponse) => void;
  onReceiptChanged: (updated: AblPeriodResponse) => void;
}>) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [receipt, setReceipt] = useState<ReceiptState>({ busy: false, error: null });
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPayer, setSavingPayer] = useState(false);

  async function changeStatus(status: AblStatus) {
    if (status === period.status) return;
    setSavingStatus(true);
    try {
      const updated = await AlquiaBackendClient.abl.savePeriod(propertyId, period.period, {
        status,
        payer: period.payer,
      });
      onStatusChange(updated);
    } catch (err) {
      toast.error(copyDeError(err));
    } finally {
      setSavingStatus(false);
    }
  }

  async function changePayer(payer: AblPayer) {
    if (payer === period.payer) return;
    setSavingPayer(true);
    try {
      const updated = await AlquiaBackendClient.abl.savePeriod(propertyId, period.period, {
        status: period.status,
        payer,
      });
      onPayerChange(updated);
    } catch (err) {
      toast.error(copyDeError(err));
    } finally {
      setSavingPayer(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    e.target.value = "";
    if (!file) return;

    if (!ABL_RECEIPT_TYPES.includes(file.type)) {
      setReceipt({ busy: false, error: "Tipo de archivo no compatible. Use PDF, PNG, JPG o WebP." });
      return;
    }
    if (file.size > ABL_MAX_RECEIPT_BYTES) {
      setReceipt({ busy: false, error: "El archivo pesa más de 10 MB." });
      return;
    }

    setReceipt({ busy: true, error: null });
    try {
      const updated = await AlquiaBackendClient.abl.uploadReceipt(propertyId, period.period, file);
      onReceiptChanged(updated);
      setReceipt({ busy: false, error: null });
    } catch (err) {
      setReceipt({ busy: false, error: copyDeError(err, {
        overrides: {
          [ERROR.ABL_RECEIPT_TOO_LARGE]: "El comprobante pesa más de 10 MB.",
          [ERROR.ABL_RECEIPT_UNSUPPORTED_TYPE]: "Tipo de archivo no compatible. Use PDF, PNG, JPG o WebP.",
        },
      }) });
    }
  }

  async function downloadReceipt() {
    try {
      const blob = await AlquiaBackendClient.abl.downloadReceipt(propertyId, period.period);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = period.receiptFileName ?? "comprobante";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("No pudimos descargar el comprobante. Inténtelo de nuevo más tarde.");
    }
  }

  async function deleteReceipt() {
    setReceipt({ busy: true, error: null });
    try {
      await AlquiaBackendClient.abl.deleteReceipt(propertyId, period.period);
      onReceiptChanged({ ...period, hasReceipt: false, receiptFileName: null, receiptContentType: null, receiptSize: null });
      setReceipt({ busy: false, error: null });
    } catch (err) {
      setReceipt({ busy: false, error: copyDeError(err) });
    }
  }

  const statusOptions: { value: AblStatus; label: string }[] = [
    { value: "PAGO", label: "Pago" },
    { value: "IMPAGO", label: "Impago" },
    { value: "SIN_DATO", label: "Sin dato" },
  ];

  const payerOptions: { value: AblPayer; label: string }[] = [
    { value: "INQUILINO", label: "Inquilino" },
    { value: "PROPIETARIO", label: "Propietario" },
  ];

  return (
    <div className="owner-abl-period">
      <div className="owner-abl-period__head">
        <b>{formatPeriodo(period.period)}</b>
        <button
          type="button"
          className="owner-icon-button"
          aria-label={`Eliminar período ${formatPeriodo(period.period)}`}
          onClick={() => onDeleted(period)}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>

      <div className="owner-abl-period__body">
        <div>
          <span className="owner-abl-label">Estado</span>
          <div className="owner-abl-toggle" role="radiogroup" aria-label="Estado ABL" aria-busy={savingStatus}>
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={period.status === opt.value}
                disabled={savingStatus}
                onClick={() => void changeStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="owner-abl-label">Pagador</span>
          <div className="owner-abl-toggle" role="radiogroup" aria-label="Pagador ABL" aria-busy={savingPayer}>
            {payerOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={period.payer === opt.value}
                disabled={savingPayer}
                onClick={() => void changePayer(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="owner-abl-period__receipt">
          <span className="owner-abl-label">Comprobante</span>
          {period.hasReceipt ? (
            <div className="owner-abl-receipt-zone">
              <Icon name="receipt" size={15} />
              <button
                type="button"
                className="owner-abl-receipt-zone__name"
                onClick={() => void downloadReceipt()}
                disabled={receipt.busy}
                style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer" }}
              >
                {period.receiptFileName ?? "Comprobante"}
              </button>
              <label className="owner-icon-button" aria-label="Reemplazar comprobante" style={{ cursor: "pointer" }}>
                <Icon name="edit" size={14} />
                <input
                  ref={fileRef}
                  type="file"
                  accept={ABL_RECEIPT_ACCEPT}
                  className="sr-only"
                  onChange={(e) => void handleFileChange(e)}
                  disabled={receipt.busy}
                />
              </label>
              <button
                type="button"
                className="owner-icon-button"
                aria-label="Quitar comprobante"
                onClick={() => void deleteReceipt()}
                disabled={receipt.busy}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ) : (
            <label className="owner-abl-upload-zone">
              <Icon name="paperclip" size={16} />
              <span>{receipt.busy ? "Subiendo…" : "Arrastrá o hacé click para adjuntar"}</span>
              <input
                ref={fileRef}
                type="file"
                accept={ABL_RECEIPT_ACCEPT}
                className="sr-only"
                onChange={(e) => void handleFileChange(e)}
                disabled={receipt.busy}
              />
            </label>
          )}
          {receipt.error && (
            <p className="owner-abl-field-error" role="alert">{receipt.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// --- AblSection ---

export function AblSection({ propertyId }: Readonly<{ propertyId: number }>) {
  const toast = useToast();

  const [abl, setAbl] = useState<AblResponse | null | "error">(null);
  const [periods, setPeriods] = useState<AblPeriodResponse[] | null | "error">(null);

  // Partida form
  const [editing, setEditing] = useState(false);
  const [jurisdiction, setJurisdiction] = useState<AblJurisdiction | "">("");
  const [partida, setPartida] = useState("");
  const [dv, setDv] = useState("");
  const [partidaError, setPartidaError] = useState<string | null>(null);
  const [savingPartida, setSavingPartida] = useState(false);
  const [removingPartida, setRemovingPartida] = useState(false);

  // Clipboard
  const [clipboardCopied, setClipboardCopied] = useState(false);
  const [clipboardFallback, setClipboardFallback] = useState(false);

  // Add period
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [newPeriod, setNewPeriod] = useState(currentMonthStr());
  const [newStatus, setNewStatus] = useState<AblStatus>("SIN_DATO");
  const [newPayer, setNewPayer] = useState<AblPayer>("INQUILINO");
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [addPeriodError, setAddPeriodError] = useState<string | null>(null);

  // Selected period (chip carousel)
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(null);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);

  useEffect(() => {
    void AlquiaBackendClient.abl.get(propertyId).then(setAbl).catch(() => setAbl("error"));
    void AlquiaBackendClient.abl.listPeriods(propertyId).then((list) => {
      setPeriods(list);
      setSelectedPeriodKey((prev) => prev ?? (list.length > 0 ? list[0].period : null));
    }).catch(() => setPeriods("error"));
  }, [propertyId]);

  function startEditing() {
    if (!abl || abl === "error") return;
    setJurisdiction(abl.jurisdiction ?? "");
    setPartida(abl.partida ?? "");
    setDv(abl.dv ?? "");
    setPartidaError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setPartidaError(null);
  }

  async function savePartida() {
    if (!jurisdiction) {
      setPartidaError("Seleccioná la jurisdicción.");
      return;
    }
    const normalizedPartida = jurisdiction === "PBA_ARBA"
      ? partida.replace(/[-\s]/g, "")
      : partida;
    const err = validatePartida(jurisdiction, normalizedPartida, dv);
    if (err) {
      setPartidaError(err);
      return;
    }
    setSavingPartida(true);
    setPartidaError(null);
    try {
      const updated = await AlquiaBackendClient.abl.save(propertyId, {
        jurisdiction,
        partida: normalizedPartida,
        ...(jurisdiction === "CABA_AGIP" && dv ? { dv } : {}),
      });
      setAbl(updated);
      setEditing(false);
      toast.exito("Partida guardada.");
    } catch (err) {
      setPartidaError(copyDeError(err));
    } finally {
      setSavingPartida(false);
    }
  }

  async function removePartida() {
    setRemovingPartida(true);
    try {
      await AlquiaBackendClient.abl.remove(propertyId);
      setAbl({ jurisdiction: null, partida: null, dv: null, unpaidAbl: abl !== "error" && abl !== null ? abl.unpaidAbl : false });
      setEditing(false);
      toast.exito("Partida eliminada.");
    } catch (err) {
      toast.error(copyDeError(err));
    } finally {
      setRemovingPartida(false);
    }
  }

  async function consultarAbl() {
    if (!abl || abl === "error" || !abl.jurisdiction || !abl.partida) return;
    const url = ABL_LOOKUP_URLS[abl.jurisdiction];
    const digits = abl.partida;
    try {
      await navigator.clipboard.writeText(digits);
      setClipboardCopied(true);
      setClipboardFallback(false);
      setTimeout(() => setClipboardCopied(false), 3000);
    } catch {
      setClipboardFallback(true);
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function addPeriod() {
    if (!newPeriod) {
      setAddPeriodError("Elegí un mes.");
      return;
    }
    setAddingPeriod(true);
    setAddPeriodError(null);
    try {
      const created = await AlquiaBackendClient.abl.savePeriod(propertyId, newPeriod, {
        status: newStatus,
        payer: newPayer,
      });
      setPeriods((prev) => {
        if (!prev || prev === "error") return [created];
        // Replace if already exists, else prepend
        const idx = prev.findIndex((p) => p.period === created.period);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = created;
          return next;
        }
        return [created, ...prev];
      });
      setSelectedPeriodKey(created.period);
      setShowAddPeriod(false);
      setNewPeriod(currentMonthStr());
      setNewStatus("SIN_DATO");
      setNewPayer("INQUILINO");
    } catch (err) {
      setAddPeriodError(copyDeError(err));
    } finally {
      setAddingPeriod(false);
    }
  }

  function requestDelete(period: AblPeriodResponse) {
    setDeleteConfirm({ period, busy: false, error: null });
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleteConfirm((prev) => prev ? { ...prev, busy: true, error: null } : null);
    try {
      await AlquiaBackendClient.abl.deletePeriod(propertyId, deleteConfirm.period.period);
      const deletedKey = deleteConfirm.period.period;
      setPeriods((prev) => {
        if (!prev || prev === "error") return prev;
        const next = prev.filter((p) => p.period !== deletedKey);
        if (selectedPeriodKey === deletedKey) {
          const idx = prev.findIndex((p) => p.period === deletedKey);
          setSelectedPeriodKey(next.length > 0 ? next[Math.min(idx, next.length - 1)].period : null);
        }
        return next;
      });
      setDeleteConfirm(null);
    } catch (err) {
      setDeleteConfirm((prev) => prev ? { ...prev, busy: false, error: copyDeError(err) } : null);
    }
  }

  function updatePeriod(updated: AblPeriodResponse) {
    setPeriods((prev) => {
      if (!prev || prev === "error") return prev;
      return prev.map((p) => p.period === updated.period ? updated : p);
    });
  }

  if (abl === "error") {
    return (
      <div className="owner-card owner-abl">
        <h2>ABL</h2>
        <p className="owner-card__copy">No pudimos cargar los datos de ABL.</p>
      </div>
    );
  }

  const hasPartida = abl !== null && abl.jurisdiction !== null && abl.partida !== null;
  const lookupLabel = abl?.jurisdiction === "PBA_ARBA" ? "Consultar en ARBA" : "Consultar en AGIP";
  const jurisdiccionLabel = abl?.jurisdiction === "PBA_ARBA" ? "PBA / ARBA" : "CABA / AGIP";

  const statusAddOptions: { value: AblStatus; label: string }[] = [
    { value: "PAGO", label: "Pago" },
    { value: "IMPAGO", label: "Impago" },
    { value: "SIN_DATO", label: "Sin dato" },
  ];

  const payerAddOptions: { value: AblPayer; label: string }[] = [
    { value: "INQUILINO", label: "Inquilino" },
    { value: "PROPIETARIO", label: "Propietario" },
  ];

  return (
    <div className="owner-card owner-abl">
      <h2>ABL</h2>

      {/* Partida */}
      <div className="owner-abl__partida">
        {!editing ? (
          <div className="owner-abl__partida-view">
            {hasPartida ? (
              <>
                <dl className="owner-definition">
                  <div>
                    <dt>Jurisdicción</dt>
                    <dd>{jurisdiccionLabel}</dd>
                  </div>
                  <div>
                    <dt>Partida</dt>
                    <dd>
                      {formatPartidaDisplay(abl!.jurisdiction, abl!.partida)}
                      {abl!.dv ? `-${abl!.dv}` : ""}
                    </dd>
                  </div>
                </dl>
                <div className="owner-abl__partida-actions">
                  <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={startEditing}>
                    <Icon name="edit" size={16} />Editar partida
                  </button>
                  <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={() => void consultarAbl()}>
                    <Icon name="link" size={16} />
                    {clipboardCopied ? "¡Copiado!" : lookupLabel}
                  </button>
                </div>
                {clipboardFallback && abl?.partida && (
                  <div className="owner-abl__clipboard-fallback">
                    <p className="owner-card__copy">
                      No pudimos copiar al portapapeles. Copiá la partida manualmente:
                    </p>
                    <div className="owner-abl__clipboard-copy">
                      <input
                        type="text"
                        readOnly
                        value={abl.partida}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        aria-label="Partida para copiar"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {abl !== null ? (
                  <p className="owner-card__copy">No hay partida cargada.</p>
                ) : (
                  <p className="owner-card__copy">Cargando…</p>
                )}
                {abl !== null && (
                  <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={startEditing}>
                    <Icon name="plus" size={16} />Cargar partida
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="owner-abl__partida-form">
            <div className="owner-abl__form-group">
              <span className="owner-abl-label">Jurisdicción</span>
              <div
                className="owner-abl-toggle"
                role="radiogroup"
                aria-label="Jurisdicción"
              >
                {(["CABA_AGIP", "PBA_ARBA"] as AblJurisdiction[]).map((j) => (
                  <button
                    key={j}
                    type="button"
                    role="radio"
                    aria-checked={jurisdiction === j}
                    onClick={() => { setJurisdiction(j); setPartida(""); setDv(""); setPartidaError(null); }}
                  >
                    {j === "CABA_AGIP" ? "CABA / AGIP" : "PBA / ARBA"}
                  </button>
                ))}
              </div>
            </div>

            {jurisdiction && (
              <div className="owner-abl__form-group">
                <label className="owner-wizard-field">
                  <span>
                    {jurisdiction === "CABA_AGIP"
                      ? "Partida AGIP (1 a 7 dígitos)"
                      : "Partida ARBA (9 dígitos, formato PPP-CCCCCC)"}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={jurisdiction === "CABA_AGIP" ? "Ej: 1234567" : "Ej: 123-456789"}
                    value={partida}
                    aria-invalid={!!partidaError}
                    onChange={(e) => { setPartida(e.target.value); setPartidaError(null); }}
                  />
                </label>
                {jurisdiction === "CABA_AGIP" && (
                  <label className="owner-wizard-field">
                    <span>Dígito verificador (opcional)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      placeholder="Ej: 5"
                      value={dv}
                      aria-invalid={!!partidaError}
                      onChange={(e) => { setDv(e.target.value); setPartidaError(null); }}
                    />
                  </label>
                )}
              </div>
            )}

            {partidaError && (
              <p className="owner-wizard-error" role="alert">{partidaError}</p>
            )}

            <div className="owner-abl__form-actions">
              <button type="button" className="owner-button owner-button--quiet" onClick={cancelEditing} disabled={savingPartida || removingPartida}>
                Cancelar
              </button>
              {hasPartida && (
                <button type="button" className="owner-button owner-button--danger owner-button--small" onClick={() => void removePartida()} disabled={removingPartida || savingPartida} aria-busy={removingPartida || undefined}>
                  Eliminar partida
                </button>
              )}
              <button type="button" className="owner-button owner-button--primary" onClick={() => void savePartida()} disabled={!jurisdiction || !partida || savingPartida || removingPartida} aria-busy={savingPartida || undefined}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Períodos */}
      <div className="owner-abl__periods">
        <div className="owner-abl__periods-head">
          <h3>Períodos</h3>
          {!showAddPeriod && (
            <button type="button" className="owner-button owner-button--secondary owner-button--small" onClick={() => setShowAddPeriod(true)}>
              <Icon name="plus" size={16} />Agregar período
            </button>
          )}
        </div>

        {showAddPeriod && (
          <div className="owner-abl__add-period">
            <div className="owner-abl__form-group">
              <label className="owner-wizard-field">
                <span>Mes</span>
                <input
                  type="month"
                  min="2000-01"
                  max={currentMonthStr()}
                  value={newPeriod}
                  onChange={(e) => { setNewPeriod(e.target.value); setAddPeriodError(null); }}
                />
              </label>
            </div>
            <div className="owner-abl__form-group">
              <span className="owner-abl-label">Estado</span>
              <div className="owner-abl-toggle" role="radiogroup" aria-label="Estado del período">
                {statusAddOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={newStatus === opt.value}
                    onClick={() => setNewStatus(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="owner-abl__form-group">
              <span className="owner-abl-label">Pagador</span>
              <div className="owner-abl-toggle" role="radiogroup" aria-label="Pagador del período">
                {payerAddOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={newPayer === opt.value}
                    onClick={() => setNewPayer(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {addPeriodError && (
              <p className="owner-wizard-error" role="alert">{addPeriodError}</p>
            )}
            <div className="owner-abl__form-actions">
              <button type="button" className="owner-button owner-button--quiet" onClick={() => { setShowAddPeriod(false); setAddPeriodError(null); }} disabled={addingPeriod}>
                Cancelar
              </button>
              <button type="button" className="owner-button owner-button--primary" onClick={() => void addPeriod()} disabled={!newPeriod || addingPeriod} aria-busy={addingPeriod || undefined}>
                Guardar período
              </button>
            </div>
          </div>
        )}

        {periods === null && (
          <p className="owner-card__copy">Cargando períodos…</p>
        )}
        {periods === "error" && (
          <p className="owner-card__copy">No pudimos cargar los períodos.</p>
        )}
        {periods !== null && periods !== "error" && periods.length === 0 && !showAddPeriod && (
          <div className="owner-abl__empty">
            <p>No hay períodos registrados. Usá «Agregar período» para registrar el estado mensual del ABL.</p>
          </div>
        )}
        {periods !== null && periods !== "error" && periods.length > 0 && (() => {
          const selectedPeriod = periods.find((p) => p.period === selectedPeriodKey) ?? periods[0];
          return (
            <>
              <div className="owner-abl__period-tabs" role="tablist" aria-label="Períodos ABL">
                {periods.map((p) => (
                  <PeriodChip
                    key={p.period}
                    period={p}
                    selected={selectedPeriod.period === p.period}
                    onClick={() => setSelectedPeriodKey(p.period)}
                  />
                ))}
              </div>
              <PeriodRow
                key={selectedPeriod.period}
                propertyId={propertyId}
                period={selectedPeriod}
                onStatusChange={updatePeriod}
                onPayerChange={updatePeriod}
                onReceiptChanged={updatePeriod}
                onDeleted={requestDelete}
              />
            </>
          );
        })()}
      </div>

      {/* Confirm delete dialog */}
      {deleteConfirm && (
        <dialog className="owner-dialog" open aria-modal="true">
          <div className="owner-dialog__backdrop" onClick={() => !deleteConfirm.busy && setDeleteConfirm(null)} />
          <div className="owner-dialog__panel" role="alertdialog" aria-labelledby="abl-delete-title">
            <div className="owner-dialog__head">
              <h2 id="abl-delete-title">Borrar período</h2>
            </div>
            <div className="owner-dialog__body">
              <p>
                ¿Borrar el período {formatPeriodo(deleteConfirm.period.period)}? También se borra el comprobante.
              </p>
              {deleteConfirm.error && (
                <p className="owner-list-note" role="alert">{deleteConfirm.error}</p>
              )}
              <div className="owner-dialog__actions">
                <button
                  type="button"
                  className="owner-button owner-button--quiet"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleteConfirm.busy}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="owner-button owner-button--danger"
                  aria-busy={deleteConfirm.busy || undefined}
                  disabled={deleteConfirm.busy}
                  onClick={() => void confirmDelete()}
                >
                  Borrar período
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
