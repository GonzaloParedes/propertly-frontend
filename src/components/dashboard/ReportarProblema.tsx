"use client";

import { useEffect, useRef, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { FeedbackType } from "@/lib/backend-types";
import { copyDeError, ERROR } from "@/lib/error-codes";
import { ApiError } from "@/lib/api";
import { abrirReporte, armarReporte, MAXIMO_DESCRIPCION, REPORTE_ABRIR, TIPOS_DE_CAPTURA, TIPOS_DE_REPORTE, validarCaptura, type ContextoDeReporte } from "@/lib/reportes";

const TIPO_POR_STATUS: Record<number, string> = {
  413: ERROR.FEEDBACK_SCREENSHOT_TOO_LARGE,
  415: ERROR.FEEDBACK_SCREENSHOT_UNSUPPORTED_TYPE,
};

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
  const [captura, setCaptura] = useState<{ file: File; url: string } | null>(null);
  const [errorDeCaptura, setErrorDeCaptura] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abierto = contexto !== null;
  const urlDeCaptura = captura?.url;

  // La miniatura es un object URL: se libera al cambiar o quitar la captura y al desmontar.
  useEffect(() => (urlDeCaptura ? () => URL.revokeObjectURL(urlDeCaptura) : undefined), [urlDeCaptura]);

  function elegirCaptura(file: File) {
    const rechazo = validarCaptura(file);
    if (rechazo) {
      setErrorDeCaptura(rechazo);
      return;
    }
    setErrorDeCaptura(null);
    setCaptura({ file, url: URL.createObjectURL(file) });
  }

  function quitarCaptura() {
    setCaptura(null);
    setErrorDeCaptura(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // Pegar desde el portapapeles (Ctrl/Cmd+V) con el diálogo abierto. Sólo se
  // interviene si el portapapeles trae una imagen; el texto pega normal en el textarea.
  useEffect(() => {
    if (!abierto) return;
    const pegar = (event: ClipboardEvent) => {
      const imagen = Array.from(event.clipboardData?.items ?? [])
        .find((item) => item.kind === "file" && item.type.startsWith("image/"))
        ?.getAsFile();
      if (!imagen) return;
      event.preventDefault();
      elegirCaptura(imagen);
    };
    document.addEventListener("paste", pegar);
    return () => document.removeEventListener("paste", pegar);
  }, [abierto]);

  useEffect(() => {
    const abrir = (event: Event) => {
      setContexto((event as CustomEvent<ContextoDeReporte | undefined>).detail ?? {});
      setTipo("BUG");
      setDescripcion("");
      setError(null);
      quitarCaptura();
    };
    window.addEventListener(REPORTE_ABRIR, abrir);
    return () => window.removeEventListener(REPORTE_ABRIR, abrir);
  }, []);

  if (!contexto) return null;
  const cerrar = () => {
    setContexto(null);
    quitarCaptura();
  };
  const puedeEnviar = descripcion.trim().length > 0 && !enviando;

  async function enviar() {
    if (!contexto) return;
    setEnviando(true);
    setError(null);
    try {
      const reporte = armarReporte(tipo, descripcion, contexto);
      // Sin captura la llamada es la de siempre (JSON plano); sólo con captura viaja multipart.
      if (captura) await AlquiaBackendClient.feedback.send(reporte, captura.file);
      else await AlquiaBackendClient.feedback.send(reporte);
      cerrar();
      toast.exito("¡Gracias! Recibimos su reporte. Si hace falta, le respondemos por correo.");
    } catch (err) {
      // Un 413/415 puede llegar sin cuerpo (tope de un proxy): con captura adjunta se lo trata como el del backend.
      const tipoPorStatus = err instanceof ApiError && !err.type && captura ? TIPO_POR_STATUS[err.status] : undefined;
      const rechazo = tipoPorStatus && err instanceof ApiError ? new ApiError(err.status, err.message, tipoPorStatus) : err;
      setError(copyDeError(rechazo, { fallback: "No pudimos enviar el reporte. Inténtelo de nuevo en un rato." }));
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
      <div className="owner-reporte__captura">
        <input ref={inputRef} type="file" hidden accept={TIPOS_DE_CAPTURA.join(",")} aria-label="Archivo de captura" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) elegirCaptura(file);
          event.target.value = "";
        }} />
        {captura ? <div className="owner-reporte__preview">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob: local, no hay nada que optimizar */}
          <img src={captura.url} alt="Vista previa de la captura adjunta" />
          <span className="owner-reporte__archivo">{captura.file.name}</span>
          <button type="button" className="owner-button owner-button--quiet" onClick={quitarCaptura} disabled={enviando}><Icon name="x" size={17} />Quitar</button>
        </div> : <button type="button" className="owner-button owner-button--quiet owner-reporte__adjuntar" onClick={() => inputRef.current?.click()} disabled={enviando}><Icon name="image" size={19} />Adjuntar captura</button>}
        {!captura && <p className="owner-dialog__hint">También puede pegarla con Ctrl+V. PNG, JPG o WebP, hasta 5 MB.</p>}
        {errorDeCaptura && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} /><span className="owner-wizard-alert__texto">{errorDeCaptura}</span></p>}
      </div>
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
