"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatearCuit } from "@/lib/cuit";
import type { GuaranteeType } from "@/lib/backend-types";
import {
  CAMPOS_POR_TIPO,
  MAX_GARANTIAS,
  TIPOS_DE_GARANTIA,
  cambiarTipo,
  etiquetaDeCampo,
  garantiaVacia,
  nombreDelTipo,
  validarGarantia,
  type CampoGarantia,
  type GarantiaBorrador,
} from "@/lib/garantias";

type Props = Readonly<{
  value: GarantiaBorrador[];
  onChange: (garantias: GarantiaBorrador[]) => void;
  /** Mostrar ya todos los errores, también los de campos que no se tocaron: se intentó guardar. */
  mostrarErrores?: boolean;
  /** Errores que puso el backend, por «garantía.campo» (ver `erroresDelBackend`). */
  erroresDelBackend?: Record<string, string>;
}>;

const ICONO_DE_TIPO: Record<GuaranteeType, IconName> = {
  PERSONAL: "users",
  PROPERTY: "building",
  SURETY_INSURANCE: "file",
};

function inputModeDe(campo: CampoGarantia): "numeric" | "tel" | undefined {
  if (campo === "taxId") return "numeric";
  return campo === "phoneNumber" ? "tel" : undefined;
}

function tipoDeInput(campo: CampoGarantia): "email" | "tel" | "text" {
  if (campo === "email") return "email";
  return campo === "phoneNumber" ? "tel" : "text";
}

function OpcionDeTipo({ tipo, titulo, ayuda, onElegir }: Readonly<{ tipo: GuaranteeType; titulo: string; ayuda: string; onElegir: (tipo: GuaranteeType) => void }>) {
  return (
    <button type="button" className="owner-wizard-option" role="radio" aria-checked={false} onClick={() => onElegir(tipo)}>
      <span className="owner-wizard-option__icon"><Icon name={ICONO_DE_TIPO[tipo]} /></span>
      <span><b>{titulo}</b><small>{ayuda}</small></span>
    </button>
  );
}

/** Los obligatorios van siempre; el resto, detrás de «Agregar más datos». */
function tieneOpcionalesCargados(garantia: GarantiaBorrador): boolean {
  return CAMPOS_POR_TIPO[garantia.type].opcionales.some(({ campo }) => garantia[campo].trim() !== "");
}

export default function GarantiasSection({ value, onChange, mostrarErrores = false, erroresDelBackend = {} }: Props) {
  const [eligiendoTipo, setEligiendoTipo] = useState(false);
  const [cambiandoTipo, setCambiandoTipo] = useState<number | null>(null);
  const [confirmandoCambio, setConfirmandoCambio] = useState<{ indice: number; tipo: GuaranteeType; perdidos: CampoGarantia[] } | null>(null);
  // Por id de garantía: la fila sigue siendo la misma aunque cambie de lugar.
  const [conMasDatos, setConMasDatos] = useState<string[]>([]);
  const [tocados, setTocados] = useState<string[]>([]);

  const alLimite = value.length >= MAX_GARANTIAS;

  function reemplazar(indice: number, garantia: GarantiaBorrador) {
    onChange(value.map((actual, i) => (i === indice ? garantia : actual)));
  }
  function agregar(tipo: GuaranteeType) {
    onChange([...value, garantiaVacia(tipo)]);
    setEligiendoTipo(false);
  }
  function quitar(indice: number) {
    const { id } = value[indice];
    onChange(value.filter((_, i) => i !== indice));
    setConMasDatos((actuales) => actuales.filter((otro) => otro !== id));
    setTocados((actuales) => actuales.filter((clave) => !clave.startsWith(`${id}.`)));
    setCambiandoTipo(null);
    setConfirmandoCambio(null);
  }
  function mover(indice: number, hacia: -1 | 1) {
    const destino = indice + hacia;
    if (destino < 0 || destino >= value.length) return;
    const copia = [...value];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    onChange(copia);
    setCambiandoTipo(null);
    setConfirmandoCambio(null);
  }
  function elegirOtroTipo(indice: number, tipo: GuaranteeType) {
    const { garantia, perdidos } = cambiarTipo(value[indice], tipo);
    if (perdidos.length > 0) {
      setConfirmandoCambio({ indice, tipo, perdidos });
      return;
    }
    reemplazar(indice, garantia);
    setCambiandoTipo(null);
  }
  function confirmarCambio() {
    if (!confirmandoCambio) return;
    reemplazar(confirmandoCambio.indice, cambiarTipo(value[confirmandoCambio.indice], confirmandoCambio.tipo).garantia);
    setConfirmandoCambio(null);
    setCambiandoTipo(null);
  }
  function tocar(id: string, campo: CampoGarantia) {
    const clave = `${id}.${campo}`;
    setTocados((actuales) => (actuales.includes(clave) ? actuales : [...actuales, clave]));
  }

  return (
    <section className="owner-garantias" aria-label="Garantías">
      {value.length === 0 && !eligiendoTipo && <p className="owner-wizard-help">Si el contrato tiene un garante o un seguro de caución, anótelo acá. Puede dejarlo para después.</p>}

      {value.map((garantia, indice) => {
        const errores = validarGarantia(garantia);
        const definicion = CAMPOS_POR_TIPO[garantia.type];
        const masDatos = conMasDatos.includes(garantia.id) || tieneOpcionalesCargados(garantia);
        const campo = ({ campo: nombre, etiqueta, ejemplo }: { campo: CampoGarantia; etiqueta: string; ejemplo: string }) => {
          const errorLocal = mostrarErrores || tocados.includes(`${garantia.id}.${nombre}`) ? errores[nombre] : undefined;
          // El backend ubica sus errores por posición en la lista.
          const error = errorLocal ?? erroresDelBackend[`${indice}.${nombre}`];
          return (
            <div key={nombre}>
              <label className="owner-wizard-field">
                <span>{etiqueta}</span>
                <input
                  placeholder={ejemplo}
                  inputMode={inputModeDe(nombre)}
                  type={tipoDeInput(nombre)}
                  value={garantia[nombre]}
                  aria-invalid={error !== undefined}
                  onBlur={() => tocar(garantia.id, nombre)}
                  onChange={(event) => reemplazar(indice, { ...garantia, [nombre]: nombre === "taxId" ? formatearCuit(event.target.value) : event.target.value })}
                />
              </label>
              {error && <p className="owner-wizard-error" role="alert">{error}</p>}
            </div>
          );
        };
        return (
          <fieldset className="owner-fieldset owner-garantia" key={garantia.id}>
            <legend className="sr-only">{`Garantía ${indice + 1}: ${nombreDelTipo(garantia.type)}`}</legend>
            <div className="owner-garantia__cabecera">
              <b>Garantía {indice + 1} · {nombreDelTipo(garantia.type)}</b>
              <span className="owner-garantia__acciones">
                <button type="button" className="owner-wizard-quiet" disabled={indice === 0} aria-label={`Subir la garantía ${indice + 1}`} onClick={() => mover(indice, -1)}>Subir</button>
                <button type="button" className="owner-wizard-quiet" disabled={indice === value.length - 1} aria-label={`Bajar la garantía ${indice + 1}`} onClick={() => mover(indice, 1)}>Bajar</button>
                <button type="button" className="owner-wizard-quiet" aria-expanded={cambiandoTipo === indice} onClick={() => { setCambiandoTipo(cambiandoTipo === indice ? null : indice); setConfirmandoCambio(null); }}>Cambiar tipo</button>
                <button type="button" className="owner-wizard-quiet" aria-label={`Quitar la garantía ${indice + 1}`} onClick={() => quitar(indice)}>Quitar</button>
              </span>
            </div>

            {cambiandoTipo === indice && (
              <div className="owner-wizard-options" role="radiogroup" aria-label="Nuevo tipo de garantía">
                {TIPOS_DE_GARANTIA.filter((t) => t.type !== garantia.type).map((t) => (
                  <OpcionDeTipo key={t.type} tipo={t.type} titulo={t.titulo} ayuda={t.ayuda} onElegir={(tipo) => elegirOtroTipo(indice, tipo)} />
                ))}
              </div>
            )}
            {confirmandoCambio?.indice === indice && (
              <div className="owner-wizard-note" role="alert">
                <p>Al pasar a «{nombreDelTipo(confirmandoCambio.tipo)}» se borra: {confirmandoCambio.perdidos.map((c) => etiquetaDeCampo(garantia.type, c).toLowerCase()).join(", ")}.</p>
                <span className="owner-garantia__acciones">
                  <button type="button" className="owner-wizard-quiet" onClick={() => setConfirmandoCambio(null)}>Volver</button>
                  <button type="button" className="owner-wizard-quiet" onClick={confirmarCambio}>Cambiar igual</button>
                </span>
              </div>
            )}

            <div className="owner-wizard-stack">
              {definicion.obligatorios.map(campo)}
              {masDatos && definicion.opcionales.map(campo)}
            </div>
            {definicion.opcionales.length > 0 && !masDatos && (
              <button type="button" className="owner-wizard-quiet" aria-expanded={false} onClick={() => setConMasDatos((actuales) => [...actuales, garantia.id])}>Agregar más datos</button>
            )}
          </fieldset>
        );
      })}

      {eligiendoTipo && (
        <div className="owner-wizard-options" role="radiogroup" aria-label="Tipo de garantía">
          {TIPOS_DE_GARANTIA.map((t) => <OpcionDeTipo key={t.type} tipo={t.type} titulo={t.titulo} ayuda={t.ayuda} onElegir={agregar} />)}
        </div>
      )}

      {alLimite
        ? <p className="owner-wizard-help">Un contrato admite hasta {MAX_GARANTIAS} garantías.</p>
        : !eligiendoTipo && <button type="button" className="owner-wizard-quiet" onClick={() => setEligiendoTipo(true)}>Agregar una garantía</button>}
    </section>
  );
}
