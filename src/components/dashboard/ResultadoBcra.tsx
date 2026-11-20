"use client";

import { Icon } from "@/components/ui/Icon";
import type { CreditCheckResponse } from "@/lib/backend-types";
import { formatearMonto } from "@/lib/formato";

/**
 * El resultado de la Central de Deudores del BCRA. Lo comparten el detalle del inquilino
 * (`/tenants/{id}/credit-check`, que además compara el nombre) y la consulta libre de
 * Herramientas (`/tools/credit-check`, que muestra el nombre informado porque no hay con qué
 * compararlo).
 */

export function formatPeriodoBcra(periodo: string): string {
  const [year, month] = periodo.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

export function situacionLabel(s: number): string {
  const labels: Record<number, string> = {
    1: "Normal",
    2: "Con seguimiento especial",
    3: "Con problemas",
    4: "Con alto riesgo de insolvencia",
    5: "Irrecuperable",
  };
  return labels[s] ?? `Situación ${s}`;
}

function claseDelPaso(n: number, sit: number): string {
  if (n > sit) return "";
  return `bcra-scale__step--${Math.min(sit, 5)}`;
}

export default function ResultadoBcra({
  data,
  denominacionMismatch = false,
  mostrarDenominacion = false,
  onReset,
}: Readonly<{
  data: CreditCheckResponse;
  /** El nombre informado no coincide con el del inquilino cargado. */
  denominacionMismatch?: boolean;
  /** Muestra el nombre informado (en la consulta libre, para confirmar a quién se consultó). */
  mostrarDenominacion?: boolean;
  onReset: () => void;
}>) {
  const volver = (
    <button type="button" className="owner-button owner-button--quiet owner-button--small" onClick={onReset}>
      Volver a consultar
    </button>
  );

  if (data.noDebtsReported) {
    return (
      <>
        <div className="bcra-ok">
          <div className="bcra-ok__icon"><Icon name="check" size={22} /></div>
          <div className="bcra-ok__body">
            <b>Sin deudas informadas</b>
            <small>No figura en la Central de Deudores del BCRA.</small>
          </div>
        </div>
        {volver}
      </>
    );
  }

  const sit = data.worstSituation ?? 1;
  let verdictClass = "bcra-verdict--bad";
  if (sit === 1) verdictClass = "bcra-verdict--ok";
  else if (sit === 2) verdictClass = "bcra-verdict--warn";

  return (
    <>
      {denominacionMismatch && (
        <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />El nombre en el BCRA (<b>{data.denominacion}</b>) no coincide con el registrado en Alquia.</p>
      )}
      <div className="bcra-scale">
        <p className="bcra-scale__label">Situación crediticia</p>
        <div className="bcra-scale__steps" role="meter" aria-valuenow={sit} aria-valuemin={1} aria-valuemax={5}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className={`bcra-scale__step${n <= sit ? ` ${claseDelPaso(n, sit)}` : ""}`} />
          ))}
        </div>
        <div className="bcra-scale__legend"><span>Normal</span><span>Irrecuperable</span></div>
      </div>
      <span className={`bcra-verdict ${verdictClass}`}>{situacionLabel(sit)}</span>
      <dl className="owner-definition">
        {mostrarDenominacion && data.denominacion && <div><dt>Nombre informado</dt><dd>{data.denominacion}</dd></div>}
        <div><dt>Entidades informantes</dt><dd>{data.entityCount}</dd></div>
        <div><dt>Monto total</dt><dd>{formatearMonto(data.totalAmountPesos ?? 0)}</dd></div>
        {data.hasLegalSituation && <div><dt>Situación jurídica</dt><dd>Sí</dd></div>}
        {data.hasJudicialProcess && <div><dt>Proceso judicial</dt><dd>Sí</dd></div>}
        {data.latestPeriod && <div><dt>Datos al</dt><dd>{formatPeriodoBcra(data.latestPeriod)}</dd></div>}
      </dl>
      <p className="owner-card__copy" style={{ fontSize: "0.78em", marginTop: "0.75rem" }}>Los datos los informan las entidades financieras. Su publicación no implica conformidad del BCRA. Para rectificar, comunicarse con la entidad que informó el dato.</p>
      {volver}
    </>
  );
}
