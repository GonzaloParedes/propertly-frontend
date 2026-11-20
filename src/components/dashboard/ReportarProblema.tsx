"use client";

import { useEffect, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { FeedbackType } from "@/lib/backend-types";
import { copyDeError } from "@/lib/error-codes";
import { abrirReporte, armarReporte, MAXIMO_DESCRIPCION, REPORTE_ABRIR, TIPOS_DE_REPORTE, type ContextoDeReporte } from "@/lib/reportes";

const PREGUNTA: Record<FeedbackType, string> = {
  BUG: "¿Qué pasó?",
  SUGGESTION: "¿Qué le gustaría que cambiemos o agreguemos?",
  OTHER: "¿Qué nos quiere contar?",
};

/**
 * Diálogo «Reportar un problema» (ALQ-184). Se monta una vez en el panel y lo
 * abre `abrirReporte()`. El reporte llega por correo al equipo con la página,
 * el navegador, el error y su ID de Sentry; la respuesta va al correo del propietario.
 */
export default function ReportarProblema() {
  const toast = useToast();
  const [contexto, setContexto] = useState<ContextoDeReporte | null>(null);
  const [tipo, setTipo] = useState<FeedbackType>("BUG");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abrir = (event: Event) => {
      setContexto((event as CustomEvent<ContextoDeReporte | undefined>).detail ?? {});
      setTipo("BUG");
      setDescripcion("");
      setError(null);
    };
    window.addEventListener(REPORTE_ABRIR, abrir);
    return () => window.removeEventListener(REPORTE_ABRIR, abrir);
  }, []);

  if (!contexto) return null;
  const cerrar = () => setContexto(null);
  const puedeEnviar = descripcion.trim().length > 0 && !enviando;

  async function enviar() {
    if (!contexto) return;
    setEnviando(true);
    setError(null);
    try {
      await AlquiaBackendClient.feedback.send(armarReporte(tipo, descripcion, contexto));
      setContexto(null);
      toast.exito("¡Gracias! Recibimos su reporte. Si hace falta, le respondemos por correo.");
    } catch (err) {
      setError(copyDeError(err, { fallback: "No pudimos enviar el reporte. Inténtelo de nuevo en un rato." }));
    } finally {
      setEnviando(false);
    }
  }

  return <Dialog title="Reportar un problema" onClose={enviando ? undefined : cerrar}>
    <div className="owner-dialog__body owner-reporte">
      <div className="owner-wizard-chips" role="radiogroup" aria-label="Tipo de reporte">
        {TIPOS_DE_REPORTE.map(({ valor, etiqueta }) => (
          <button key={valor} type="button" role="radio" aria-checked={tipo === valor} onClick={() => setTipo(valor)}>{etiqueta}</button>
        ))}
      </div>
      <label className="owner-wizard-field owner-reporte__descripcion">
        <span>{PREGUNTA[tipo]}</span>
        <textarea
          rows={5}
          maxLength={MAXIMO_DESCRIPCION}
          value={descripcion}
          placeholder={tipo === "BUG" ? "Ej.: quise confirmar una cuota y no pasó nada." : undefined}
          onChange={(event) => setDescripcion(event.target.value)}
        />
      </label>
      {contexto.mensajeDeError && <p className="owner-reporte__adjunto"><Icon name="paperclip" size={17} /><span>Adjuntamos el error que vio: «{contexto.mensajeDeError}»</span></p>}
      <p className="owner-dialog__hint">Junto con su mensaje enviamos la página en la que está y su navegador, para poder reproducir el problema. Le respondemos a su correo.</p>
      {error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}
    </div>
    <div className="owner-dialog__foot">
      <button type="button" className="owner-button owner-button--quiet" onClick={cerrar} disabled={enviando}>Cancelar</button>
      <button type="button" className="owner-button owner-button--primary" onClick={() => void enviar()} disabled={!puedeEnviar} aria-busy={enviando || undefined}>
        {enviando ? <><Spinner />Enviando…</> : "Enviar"}
      </button>
    </div>
  </Dialog>;
}

/**
 * Alerta de error del panel con el atajo para reportarlo: abre el mismo
 * diálogo con el mensaje ya adjunto. Reemplaza al `<p class="owner-wizard-alert">` suelto.
 */
export function AlertaDeError({ mensaje }: Readonly<{ mensaje: string }>) {
  return <p className="owner-wizard-alert" role="alert">
    <Icon name="alert" size={19} />
    <span className="owner-wizard-alert__texto">{mensaje}</span>
    <button type="button" className="owner-alert-reporte" aria-haspopup="dialog" onClick={() => abrirReporte({ mensajeDeError: mensaje })}>Avisanos de este error</button>
  </p>;
}
