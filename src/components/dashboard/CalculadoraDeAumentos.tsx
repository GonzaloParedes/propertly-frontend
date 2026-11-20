"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import Counter from "@/components/ui/Counter";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { RentIncreaseResponse } from "@/lib/backend-types";
import { copyDeError } from "@/lib/error-codes";
import {
  FRECUENCIA_INICIAL,
  FRECUENCIA_MAXIMA,
  FRECUENCIA_MINIMA,
  INDICES,
  PRIMER_MES,
  acotarMes,
  armarPedido,
  formatearMes,
  formatearMontoConCentavos,
  formatearPorcentaje,
  sumarMeses,
  ultimoAjusteMaximo,
  validarFormulario,
  type FormularioDeAumento,
} from "@/lib/calculadora-aumentos";

const FALLBACK = "No pudimos calcular el aumento ahora. Inténtelo de nuevo en unos minutos.";

/**
 * La calculadora de aumentos por ICL/IPC (ALQ-145). No usa la sesión ni el
 * workspace: hoy vive en Herramientas del panel, y la misma pieza va a ir a la
 * landing pública.
 */
export default function CalculadoraDeAumentos() {
  const [form, setForm] = useState<FormularioDeAumento>(() => ({
    indice: "ICL",
    monto: "",
    frecuencia: FRECUENCIA_INICIAL,
    ultimoAjuste: ultimoAjusteMaximo(FRECUENCIA_INICIAL),
  }));
  const [intento, setIntento] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RentIncreaseResponse | null>(null);

  const maximo = ultimoAjusteMaximo(form.frecuencia);
  const errorDeMonto = intento ? validarFormulario(form) : null;

  function cambiar(cambios: Partial<FormularioDeAumento>) {
    setForm((actual) => {
      const siguiente = { ...actual, ...cambios };
      return { ...siguiente, ultimoAjuste: acotarMes(siguiente.ultimoAjuste, ultimoAjusteMaximo(siguiente.frecuencia)) };
    });
    // Un resultado viejo junto a datos nuevos confunde: se vuelve a calcular.
    setResultado(null);
    setError(null);
  }

  async function calcular(event: React.FormEvent) {
    event.preventDefault();
    setIntento(true);
    if (validarFormulario(form)) return;
    setCalculando(true);
    setError(null);
    try {
      setResultado(await AlquiaBackendClient.tools.rentIncrease(armarPedido(form)));
    } catch (e) {
      setResultado(null);
      setError(copyDeError(e, { fallback: FALLBACK }));
    } finally {
      setCalculando(false);
    }
  }

  return (
    <div className="owner-card owner-calc">
      <form className="owner-calc__form" onSubmit={calcular} noValidate>
        <p className="owner-wizard-label">Índice</p>
        <div className="owner-wizard-chips" role="group" aria-label="Índice">
          {INDICES.map((indice) => (
            <button key={indice.valor} type="button" aria-pressed={form.indice === indice.valor}
              title={indice.detalle} onClick={() => cambiar({ indice: indice.valor })}>
              {indice.etiqueta}
            </button>
          ))}
        </div>
        <small className="owner-wizard-help">
          {INDICES.find((indice) => indice.valor === form.indice)?.detalle}
        </small>

        <p className="owner-wizard-label">Alquiler actual</p>
        <label className="owner-wizard-field">
          <span aria-hidden="true">$</span>
          <input inputMode="numeric" aria-label="Alquiler actual" placeholder="0"
            aria-invalid={errorDeMonto ? true : undefined}
            aria-describedby={errorDeMonto ? "calc-monto-error" : undefined}
            value={form.monto ? Number(form.monto).toLocaleString("es-AR") : ""}
            onChange={(e) => cambiar({ monto: e.target.value.replace(/\D/g, "") })} />
        </label>
        {errorDeMonto && <p id="calc-monto-error" className="owner-wizard-error" role="alert">{errorDeMonto}</p>}

        <div className="owner-calc__counters">
          <Counter label="Se actualiza cada" value={form.frecuencia}
            unit={form.frecuencia === 1 ? "mes" : "meses"}
            min={FRECUENCIA_MINIMA} max={FRECUENCIA_MAXIMA}
            onChange={(frecuencia) => cambiar({ frecuencia })} />

          <div className="owner-wizard-counter owner-calc__mes">
            <p className="owner-wizard-label" id="calc-mes-label">Último aumento o inicio del contrato</p>
            <div role="group" aria-labelledby="calc-mes-label">
              <button type="button" aria-label="Mes anterior" disabled={form.ultimoAjuste <= PRIMER_MES}
                onClick={() => cambiar({ ultimoAjuste: sumarMeses(form.ultimoAjuste, -1) })}>
                <ChevronLeft aria-hidden="true" size={21} />
              </button>
              <strong aria-live="polite">{formatearMes(form.ultimoAjuste)}</strong>
              <button type="button" aria-label="Mes siguiente" disabled={form.ultimoAjuste >= maximo}
                onClick={() => cambiar({ ultimoAjuste: sumarMeses(form.ultimoAjuste, 1) })}>
                <ChevronRight aria-hidden="true" size={21} />
              </button>
            </div>
          </div>
        </div>

        <button type="submit" className="owner-button owner-button--primary owner-calc__submit"
          disabled={calculando} aria-busy={calculando || undefined}>
          {calculando ? <><Spinner size="sm" />Calculando…</> : <><Icon name="calculator" size={18} />Calcular aumento</>}
        </button>
      </form>

      {error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={18} />{error}</p>}

      {resultado && <ResultadoDelAumento resultado={resultado} />}
    </div>
  );
}

function ResultadoDelAumento({ resultado }: Readonly<{ resultado: RentIncreaseResponse }>) {
  const estimado = resultado.months.find((mes) => mes.estimated);
  const primero = resultado.months[0]?.period ?? resultado.lastAdjustment;
  const ultimo = resultado.months.at(-1)?.period ?? resultado.lastAdjustment;

  return (
    <section className="owner-calc__result" aria-live="polite" aria-label="Resultado">
      <p className="owner-eyebrow">NUEVO ALQUILER DESDE {formatearMes(resultado.effectiveFrom).toUpperCase()}</p>
      <p className="owner-calc__amount">{formatearMontoConCentavos(resultado.newAmount)}</p>
      <p className="owner-calc__increase">
        Aumento de <b>{formatearPorcentaje(resultado.increasePercentage)}</b> ({formatearMontoConCentavos(resultado.increaseAmount)} más por mes)
      </p>

      <dl className="owner-definition owner-calc__months">
        <div><dt>Alquiler anterior</dt><dd>{formatearMontoConCentavos(resultado.amount)}</dd></div>
        {resultado.months.map((mes) => (
          <div key={mes.period}>
            <dt>{resultado.index} de {formatearMes(mes.period)}{mes.estimated && " (estimado)"}</dt>
            <dd>{formatearPorcentaje(mes.rate)}</dd>
          </div>
        ))}
      </dl>

      {estimado && (
        <p className="owner-calc__note">
          <Info size={15} aria-hidden="true" />
          El {resultado.index} de {formatearMes(estimado.period)} todavía no se publicó: se usó la tasa del mes anterior, igual que en los contratos de Alquia.
        </p>
      )}
      <p className="owner-calc__note">
        <Info size={15} aria-hidden="true" />
        Se acumula el {resultado.index} de {formatearMes(primero)} a {formatearMes(ultimo)}. Es una referencia: el aumento que corresponde es el que fija su contrato.
      </p>
    </section>
  );
}
