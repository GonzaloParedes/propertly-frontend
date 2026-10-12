"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import GarantiasSection from "@/components/dashboard/GarantiasSection";
import { hayErrores, validarGarantias } from "@/lib/garantias";
import {
  GRUPOS,
  METODOS_DE_PUNITORIOS,
  QUIEN_PAGA,
  definicionDeMetodo,
  resumenDeGrupo,
  soloDecimal,
  validarOtrasCondiciones,
  type GrupoDeCondiciones,
  type OtrasCondiciones as Condiciones,
} from "@/lib/otras-condiciones";

const ICONOS: Record<GrupoDeCondiciones, IconName> = { deposito: "card", comision: "users", punitorios: "clock", garantias: "file" };

const soloDigitos = (texto: string) => texto.replace(/\D/g, "");
const conSeparadores = (digitos: string) => (digitos ? Number(digitos).toLocaleString("es-AR") : "");

function ErrorDeCampo({ children }: Readonly<{ children?: string }>) {
  return children ? <p className="owner-wizard-error" role="alert">{children}</p> : null;
}

/** El primer error del backend que corresponda a alguno de estos campos del contrato. */
function delBackend(erroresDelBackend: Record<string, string>, ...campos: string[]): string | undefined {
  const ruta = Object.keys(erroresDelBackend).find((r) => campos.some((c) => r === `contract.${c}`));
  return ruta ? erroresDelBackend[ruta] : undefined;
}

/** ¿Este grupo tiene un error que el backend rechazó? Sirve para abrirlo solo y mostrar el aviso junto a su campo. */
export function grupoConErrorDelBackend(grupo: GrupoDeCondiciones, erroresDelBackend: Record<string, string>): boolean {
  switch (grupo) {
    case "deposito":
      return delBackend(erroresDelBackend, "depositAmount") !== undefined;
    case "comision":
      return delBackend(erroresDelBackend, "commissionPercent", "commissionPayer") !== undefined;
    case "punitorios":
      return delBackend(erroresDelBackend, "lateFeeMethod", "lateFeeValue", "lateFeeGraceDays") !== undefined;
    case "garantias":
      return Object.keys(erroresDelBackend).some((r) => r.startsWith("contract.guarantees"));
  }
}

/**
 * Los campos de un grupo de «Otras condiciones». Se usa en el paso a mano y en la revisión del
 * contrato leído desde el PDF: es el mismo formulario, así que lo que se puede cargar es lo mismo.
 */
export function EditorDeGrupo({ grupo, value, onChange, mostrarErrores, erroresDelBackend }: Readonly<{
  grupo: GrupoDeCondiciones;
  value: Condiciones;
  onChange: (value: Condiciones) => void;
  /** Se intentó seguir: mostrar ya los errores, también los de campos que no se tocaron. */
  mostrarErrores: boolean;
  /** Errores del backend por ruta (`contract.depositAmount`, `contract.guarantees[0].fullName`…). */
  erroresDelBackend: Record<string, string>;
}>) {
  const errores = validarOtrasCondiciones(value);
  const actualizarPunitorios = (cambio: Partial<Condiciones["punitorios"]>) => onChange({ ...value, punitorios: { ...value.punitorios, ...cambio } });
  const aviso = (...campos: string[]) => (delBackend(erroresDelBackend, ...campos) ? "Revise este dato." : undefined);

  if (grupo === "deposito") {
    return <>
      <label className="owner-wizard-field owner-wizard-field--amount">
        <span>$</span>
        <input inputMode="numeric" aria-label="Monto del depósito" placeholder="Ej. 900.000" value={conSeparadores(value.deposito)} onChange={(event) => onChange({ ...value, deposito: soloDigitos(event.target.value) })} />
      </label>
      <ErrorDeCampo>{aviso("depositAmount")}</ErrorDeCampo>
      <small className="owner-wizard-help">Lo que el inquilino deja al firmar. Si no hubo, déjelo vacío.</small>
    </>;
  }

  if (grupo === "comision") {
    return <>
      <label className="owner-wizard-field owner-wizard-field--amount">
        <span className="sr-only">Porcentaje de comisión</span>
        <input inputMode="decimal" aria-label="Porcentaje de comisión" placeholder="Ej. 3" aria-invalid={mostrarErrores && errores.comision !== undefined} value={value.comision} onChange={(event) => onChange({ ...value, comision: soloDecimal(event.target.value) })} />
        <span>% del alquiler</span>
      </label>
      <ErrorDeCampo>{(mostrarErrores ? errores.comision : undefined) ?? aviso("commissionPercent")}</ErrorDeCampo>
      <p className="owner-wizard-label">Quién la paga</p>
      <div className="owner-wizard-chips" role="group" aria-label="Quién paga la comisión">
        {QUIEN_PAGA.map(({ valor, etiqueta }) => <button key={valor} type="button" aria-pressed={value.quienPagaComision === valor} onClick={() => onChange({ ...value, quienPagaComision: value.quienPagaComision === valor ? null : valor })}>{etiqueta}</button>)}
      </div>
      <ErrorDeCampo>{aviso("commissionPayer")}</ErrorDeCampo>
    </>;
  }

  if (grupo === "punitorios") {
    return <>
      <p className="owner-wizard-label">¿Cómo se cobra el atraso?</p>
      <div className="owner-wizard-options" role="radiogroup" aria-label="Cómo se cobra el atraso">
        {METODOS_DE_PUNITORIOS.map(({ method, titulo, ejemplo, unidad }) => {
          const elegido = value.punitorios.method === method;
          const cambiaUnidad = value.punitorios.method !== null && definicionDeMetodo(value.punitorios.method).unidad !== unidad;
          return (
            <button key={method} type="button" className="owner-wizard-option" role="radio" aria-checked={elegido}
              onClick={() => actualizarPunitorios(elegido ? { method: null, value: "", graceDays: "" } : { method, value: cambiaUnidad ? "" : value.punitorios.value })}>
              <span className="owner-wizard-option__icon"><Icon name="clock" /></span>
              <span><b>{titulo}</b><small>{ejemplo}</small></span>
              <span className="owner-wizard-option__check"><Icon name="check" /></span>
            </button>
          );
        })}
      </div>
      {value.punitorios.method !== null && <>
        <label className="owner-wizard-field owner-wizard-field--amount">
          <span>{definicionDeMetodo(value.punitorios.method).unidad}</span>
          <input
            inputMode="decimal"
            aria-label={definicionDeMetodo(value.punitorios.method).unidad === "%" ? "Porcentaje del recargo" : "Monto del recargo"}
            placeholder={definicionDeMetodo(value.punitorios.method).unidad === "%" ? "Ej. 0,5" : "Ej. 5.000"}
            aria-invalid={mostrarErrores && errores.punitorios !== undefined}
            value={value.punitorios.value}
            onChange={(event) => actualizarPunitorios({ value: definicionDeMetodo(value.punitorios.method!).unidad === "%" ? soloDecimal(event.target.value) : soloDigitos(event.target.value) })}
          />
          <span>{definicionDeMetodo(value.punitorios.method).sufijo.replace(/^% /, "")}</span>
        </label>
        <ErrorDeCampo>{(mostrarErrores ? errores.punitorios : undefined) ?? aviso("lateFeeValue", "lateFeeMethod")}</ErrorDeCampo>
        <label className="owner-wizard-field owner-wizard-field--medium">
          <span>Días de gracia después del vencimiento</span>
          <input inputMode="numeric" placeholder="0" value={value.punitorios.graceDays} onChange={(event) => actualizarPunitorios({ graceDays: soloDigitos(event.target.value) })} />
        </label>
        <ErrorDeCampo>{aviso("lateFeeGraceDays")}</ErrorDeCampo>
        <small className="owner-wizard-help">Días en los que todavía puede pagar sin recargo. Si el contrato dice «del 1 al 10», el vencimiento es el 10 y los días de gracia son 0.</small>
      </>}
    </>;
  }

  // Los errores de una garantía llegan como `contract.guarantees[0].fullName`: se pasan como `0.fullName`.
  const garantiasDelBackend = Object.fromEntries(
    Object.entries(erroresDelBackend)
      .filter(([ruta]) => ruta.startsWith("contract.guarantees["))
      .map(([ruta]) => [ruta.replace(/^contract\.guarantees\[(\d+)\]\.(\w+)$/, "$1.$2"), "Revise este dato."])
  );
  return <GarantiasSection value={value.garantias} onChange={(garantias) => onChange({ ...value, garantias })} mostrarErrores={mostrarErrores} erroresDelBackend={garantiasDelBackend} />;
}

/**
 * El paso opcional del alta: depósito, comisión, punitorios y garantías. Un grupo a la vez, para que
 * el formulario nunca sea largo; lo que queda vacío no se manda. «Saltear este paso» sólo aparece
 * mientras no hay nada cargado, porque saltear con datos escritos sería descartarlos en silencio.
 */
export default function OtrasCondiciones({ value, onChange, onSkip, mostrarErrores, erroresDelBackend }: Readonly<{
  value: Condiciones;
  onChange: (value: Condiciones) => void;
  onSkip: () => void;
  /** Se intentó seguir: mostrar ya los errores, también los de campos que no se tocaron. */
  mostrarErrores: boolean;
  /** Errores del backend por ruta (`contract.depositAmount`, `contract.guarantees[0].fullName`…). */
  erroresDelBackend: Record<string, string>;
}>) {
  const [abierto, setAbierto] = useState<GrupoDeCondiciones | null>(null);
  const errores = validarOtrasCondiciones(value);
  const hayAlgo = GRUPOS.some(({ grupo }) => resumenDeGrupo(value, grupo) !== "Sin cargar");
  // Un grupo con un error del backend se abre solo: el aviso tiene que verse junto a su campo.
  const conErrorLocal: Record<GrupoDeCondiciones, boolean> = {
    deposito: false,
    comision: mostrarErrores && errores.comision !== undefined,
    punitorios: mostrarErrores && errores.punitorios !== undefined,
    garantias: mostrarErrores && hayErrores(validarGarantias(value.garantias)),
  };
  const grupoAbierto = abierto ?? GRUPOS.find(({ grupo }) => grupoConErrorDelBackend(grupo, erroresDelBackend) || conErrorLocal[grupo])?.grupo ?? null;

  return <>
    <h1>¿Hay otras condiciones?</h1>
    <p>Todo esto es opcional: lo que deje vacío no se guarda. Puede completarlo ahora o más adelante.</p>
    <div className="owner-wizard-options">
      {GRUPOS.map(({ grupo, titulo }) => {
        const resumen = resumenDeGrupo(value, grupo);
        const esteAbierto = grupoAbierto === grupo;
        return (
          <div key={grupo} className="owner-wizard-stack">
            <button type="button" className="owner-wizard-option" aria-expanded={esteAbierto} onClick={() => setAbierto(esteAbierto ? null : grupo)}>
              <span className="owner-wizard-option__icon"><Icon name={ICONOS[grupo]} /></span>
              <span><b>{titulo}</b><small>{resumen}</small></span>
            </button>
            {esteAbierto && <div className="owner-wizard-stack" role="group" aria-label={titulo}>
              <EditorDeGrupo grupo={grupo} value={value} onChange={onChange} mostrarErrores={mostrarErrores} erroresDelBackend={erroresDelBackend} />
            </div>}
          </div>
        );
      })}
    </div>
    {!hayAlgo && <button type="button" className="owner-wizard-skip" onClick={onSkip}>Saltear este paso</button>}
  </>;
}
