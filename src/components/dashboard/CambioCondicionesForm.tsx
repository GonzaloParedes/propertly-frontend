"use client";

import { useState } from "react";
import Counter from "@/components/ui/Counter";
import { AlquiaBackendClient } from "@/lib/backend-client";
import { ApiError, AuthExpiredError } from "@/lib/api";
import type { ContractResponse } from "@/lib/backend-types";
import {
  armarPedido,
  condicionesIniciales,
  mesesElegibles,
  resumenDeCondiciones,
  validarCondiciones,
  type CondicionesNuevas,
  type MetodoActualizacion,
} from "@/lib/cambio-condiciones";
import { formatearPeriodo } from "@/lib/formato";

/**
 * El backend rechaza con 400 y un mensaje en inglés que no le sirve al
 * propietario. Los que el formulario no puede prevenir —una cuota ya paga, un
 * cambio que otra pestaña programó antes— se dicen acá; el resto es un caso que
 * el selector de meses ya evita y cae en el mensaje general.
 */
function mensajeDeError(err: unknown): string {
  if (err instanceof AuthExpiredError) return "Su sesión expiró. Vuelva a iniciar sesión.";
  if (err instanceof ApiError && err.status === 400) {
    if (/paid/i.test(err.message)) {
      return "Hay una cuota ya paga desde ese mes. Elija un mes posterior a la última cuota cobrada.";
    }
    if (/already has a scheduled/i.test(err.message)) {
      return "Este contrato ya tiene un cambio programado.";
    }
    return "El cambio no se pudo programar con esos datos. Revise el mes y las condiciones.";
  }
  return "No pudimos programar el cambio. Inténtelo de nuevo más tarde.";
}

const METODOS: [MetodoActualizacion, string][] = [
  ["FIXED_PERCENTAGE", "Porcentaje fijo"],
  ["ICL", "Según el ICL"],
  ["IPC", "Según el IPC"],
];

export default function CambioCondicionesForm({
  contrato,
  hoyISO,
  onCancelar,
  onProgramado,
}: Readonly<{
  contrato: ContractResponse;
  hoyISO: string;
  onCancelar: () => void;
  onProgramado: () => void;
}>) {
  const meses = mesesElegibles(contrato, hoyISO);
  const [c, setC] = useState<CondicionesNuevas>(() => condicionesIniciales(contrato, meses));
  const [revisando, setRevisando] = useState(false);
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errores = validarCondiciones(c, meses);
  const hayErrores = Object.keys(errores).length > 0;
  const cambiar = (parcial: Partial<CondicionesNuevas>) => setC((actual) => ({ ...actual, ...parcial }));

  if (meses.length === 0) {
    return <>
      <div className="owner-dialog__body">
        <p>Este contrato termina este mes, así que no queda un período posterior desde el cual cambiar las condiciones.</p>
      </div>
      <div className="owner-dialog__foot">
        <button type="button" className="owner-button owner-button--secondary" onClick={onCancelar}>Cerrar</button>
      </div>
    </>;
  }

  function revisar() {
    setIntento(true);
    if (!hayErrores) setRevisando(true);
  }

  async function confirmar() {
    setError(null);
    setGuardando(true);
    try {
      await AlquiaBackendClient.contracts.scheduleSchemaChange(contrato.id, armarPedido(c));
      onProgramado();
    } catch (err) {
      setError(mensajeDeError(err));
      setRevisando(false);
      setGuardando(false);
    }
  }

  const campoError = (clave: keyof typeof errores) =>
    intento && errores[clave] ? <p className="owner-wizard-error" role="alert">{errores[clave]}</p> : null;

  if (revisando) {
    return <>
      <div className="owner-dialog__body">
        <p>Desde <b>{formatearPeriodo(c.mes)}</b> rigen estas condiciones:</p>
        <ul>{resumenDeCondiciones(c).map((linea) => <li key={linea}>{linea}</li>)}</ul>
        <p>Las cuotas anteriores a ese mes no cambian, estén pagas o no: el contrato actual
          sigue vigente hasta entonces.</p>
      </div>
      <div className="owner-dialog__foot">
        <button type="button" className="owner-button owner-button--quiet" disabled={guardando}
          onClick={() => setRevisando(false)}>Volver</button>
        <button type="button" className="owner-button owner-button--primary" disabled={guardando}
          onClick={() => void confirmar()}>{guardando ? "Programando…" : "Programar cambio"}</button>
      </div>
    </>;
  }

  return <>
    <div className="owner-dialog__body">
      <p className="owner-dialog__lead">Elija desde qué mes rigen las condiciones nuevas. Lo anterior no se toca.</p>

      <div className="owner-wizard-stack">
        <label className="owner-wizard-field">
          <span>Rige desde</span>
          <select value={c.mes} onChange={(e) => cambiar({ mes: e.target.value })}>
            {meses.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
          </select>
        </label>
        {campoError("mes")}

        <label className="owner-wizard-field">
          <span>Nuevo alquiler por mes</span>
          <div className="owner-dialog-money">
            <i aria-hidden="true">$</i>
            <input inputMode="numeric" aria-label="Nuevo alquiler mensual"
              value={c.alquiler ? Number(c.alquiler).toLocaleString("es-AR") : ""}
              onChange={(e) => cambiar({ alquiler: e.target.value.replace(/\D/g, "") })} />
          </div>
        </label>
        {campoError("alquiler")}
      </div>

      <div className="owner-dialog-counters">
        <Counter label="Día de vencimiento" value={c.diaVencimiento} unit="del mes" min={1} max={28}
          onChange={(dia) => cambiar({ diaVencimiento: dia })} />
        <Counter label="Se actualiza cada" value={c.frecuencia} unit={c.frecuencia === 1 ? "mes" : "meses"} min={1}
          onChange={(n) => cambiar({ frecuencia: n })} />
      </div>
      {campoError("diaVencimiento")}
      {campoError("frecuencia")}

      <p className="owner-wizard-label">Actualización</p>
      <div className="owner-wizard-chips">
        {METODOS.map(([valor, texto]) => (
          <button key={valor} type="button" aria-pressed={c.metodo === valor}
            onClick={() => cambiar({ metodo: valor })}>{texto}</button>
        ))}
      </div>
      {c.metodo === "FIXED_PERCENTAGE" && <>
        <label className="owner-wizard-field owner-dialog-percent">
          <span>Porcentaje de aumento</span>
          <div className="owner-dialog-money">
            <input inputMode="decimal" aria-label="Porcentaje de aumento"
              value={c.porcentaje}
              onChange={(e) => cambiar({ porcentaje: e.target.value.replace(",", ".").replace(/[^\d.]/g, "") })} />
            <i aria-hidden="true">%</i>
          </div>
        </label>
        {campoError("porcentaje")}
      </>}

      {error && <p className="owner-wizard-alert" role="alert">{error}</p>}
    </div>
    <div className="owner-dialog__foot">
      <button type="button" className="owner-button owner-button--quiet" onClick={onCancelar}>Cancelar</button>
      <button type="button" className="owner-button owner-button--primary" onClick={revisar}>Revisar cambio</button>
    </div>
  </>;
}
