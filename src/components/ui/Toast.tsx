"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type Tipo = "exito" | "error";
type Aviso = { id: number; tipo: Tipo; mensaje: string };

type ToastApi = { exito: (mensaje: string) => void; error: (mensaje: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

/** El éxito se va solo; el error espera a que el usuario lo cierre. */
const DURACION_EXITO_MS = 6000;
const MAXIMO_VISIBLES = 3;

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  // Un no-op silencioso escondería un toast que nunca se ve.
  if (!api) throw new Error("useToast debe usarse dentro de <ToastProvider>.");
  return api;
}

export function ToastProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguienteId = useRef(0);

  const agregar = useCallback((tipo: Tipo, mensaje: string) => {
    siguienteId.current += 1;
    const aviso = { id: siguienteId.current, tipo, mensaje };
    setAvisos((actuales) => [...actuales, aviso].slice(-MAXIMO_VISIBLES));
  }, []);
  const cerrar = useCallback((id: number) => {
    setAvisos((actuales) => actuales.filter((aviso) => aviso.id !== id));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ exito: (mensaje) => agregar("exito", mensaje), error: (mensaje) => agregar("error", mensaje) }),
    [agregar]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Las dos regiones están siempre montadas y vacías al inicio: si se
          montaran junto con el mensaje, varios lectores no lo anunciarían.
          Llevan sólo aria-live y no role="status"/"alert": el rol permanente
          chocaría con los avisos inline de las pantallas, que ya lo usan. */}
      <div className="alquia-toasts">
        <div aria-live="polite" data-toasts="exito" className="alquia-toasts__region">
          {avisos.filter((aviso) => aviso.tipo === "exito").map((aviso) => (
            <Toast key={aviso.id} aviso={aviso} onClose={cerrar} />
          ))}
        </div>
        <div aria-live="assertive" data-toasts="error" className="alquia-toasts__region">
          {avisos.filter((aviso) => aviso.tipo === "error").map((aviso) => (
            <Toast key={aviso.id} aviso={aviso} onClose={cerrar} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ aviso, onClose }: Readonly<{ aviso: Aviso; onClose: (id: number) => void }>) {
  const [pausado, setPausado] = useState(false);
  const { id, tipo, mensaje } = aviso;

  useEffect(() => {
    if (tipo !== "exito" || pausado) return;
    const timer = setTimeout(() => onClose(id), DURACION_EXITO_MS);
    return () => clearTimeout(timer);
  }, [id, tipo, pausado, onClose]);

  const esExito = tipo === "exito";
  return (
    <div
      className={`alquia-toast alquia-toast--${tipo}`}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <span className="alquia-toast__icon" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          {esExito ? <path d="m20 6.5-10.5 10L4 11.5" /> : <><path d="M12 3.5 2.5 20.5h19L12 3.5Z" /><path d="M12 10v4.5M12 17.8v.1" /></>}
        </svg>
      </span>
      <p><span className="sr-only">{esExito ? "Listo: " : "Error: "}</span>{mensaje}</p>
      <button type="button" aria-label="Cerrar aviso" onClick={() => onClose(id)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="m6.5 6.5 11 11m0-11-11 11" />
        </svg>
      </button>
    </div>
  );
}
