"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { ContractDraft } from "@/lib/backend-types";
import { contenidoCanonico, type ContenidoDeBorrador } from "@/lib/borradores";
import { ERROR, versionActualDelBorrador } from "@/lib/error-codes";

export type EstadoDeGuardado =
  | "inactivo"
  | "guardando"
  | "guardado"
  | "error"
  /** El propietario ya tiene el máximo de borradores: este contrato no puede serlo. */
  | "limite"
  /** Otro dispositivo guardó antes: no se pisa sin preguntar. */
  | "conflicto"
  /** El borrador se descartó o venció en otro lado. */
  | "desaparecido";

/** Cuánto se espera sin cambios antes de guardar lo que se está escribiendo. */
const ESPERA_AL_ESCRIBIR_MS = 2000;
/** Si guardar falla, se reintenta cada vez más tarde y, desde la cuarta vez, cada 30 s. */
const REINTENTOS_MS = [2000, 5000, 15000, 30000];

type Inicial = { id: number; version: number; contenido: ContenidoDeBorrador };

/**
 * Una clave por sesión del asistente: el backend la usa para no crear dos veces el mismo borrador si el
 * alta se repite (se perdió la respuesta, se reintenta, o se manda otra vez al cerrar la pestaña).
 * `randomUUID` sólo existe en contextos seguros; `getRandomValues` está siempre.
 */
function nuevaClaveDeAlta(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Guarda solo el contrato a medio cargar como borrador en el backend.
 *
 * - **Nace** cuando `activo` pasa a ser verdadero (el propietario cargó algo propio): antes no
 *   se crea nada, así abrir el asistente por error no ocupa un lugar de los pocos que hay. Nace
 *   de inmediato si a la vez cambió la `posicion`, y si no, cuando deja de escribir.
 * - **Guarda** de inmediato en cada cambio de `posicion`, a los 2 s de que dejó de escribir, y una
 *   última vez al cerrar o esconder la página (`keepalive`, que sí deja mandar el header
 *   anti-CSRF que `sendBeacon` no permite). Si todavía no nació, esa última vez es el alta.
 * - **El alta se puede repetir:** lleva siempre la misma clave de idempotencia, así un reintento o el
 *   alta al cerrar la pestaña no ocupan un segundo lugar. Si el backend contesta con un borrador que
 *   ya existía, el hook compara con lo que ese borrador tiene, no con lo que mandó, y guarda la diferencia.
 * - **De a un pedido por vez:** si algo cambia mientras viaja otro, al terminar se manda lo más
 *   nuevo con la versión que devolvió, así el hook nunca choca consigo mismo.
 * - **Falla:** reintenta con espera creciente y deja el contenido en pantalla. Un 409 de versión,
 *   de límite o un 404 frenan el guardado: no se insiste contra algo que no va a cambiar solo.
 */
export function useAutoguardado({ activo, contenido, posicion, inicial = null, esperaMs = ESPERA_AL_ESCRIBIR_MS }: Readonly<{
  /** Si el contrato ya tiene que ser un borrador. */
  activo: boolean;
  contenido: ContenidoDeBorrador;
  /** Dónde está el propietario (paso, desvío, ubicación completa…): cada cambio guarda enseguida, sin esperar. */
  posicion: string;
  /** El borrador que se está retomando, tal como lo devolvió el backend. */
  inicial?: Inicial | null;
  esperaMs?: number;
}>) {
  const [estado, setEstado] = useState<EstadoDeGuardado>("inactivo");
  const [id, setId] = useState<number | null>(inicial?.id ?? null);
  const [conflicto, setConflicto] = useState<{ versionActual: number | null } | null>(null);

  const canonico = contenidoCanonico(contenido);
  const ultimo = useRef({ contenido, canonico });
  const idRef = useRef<number | null>(inicial?.id ?? null);
  const versionRef = useRef(inicial?.version ?? 0);
  // Lo último que el backend confirmó. null: nada todavía (o hay que volver a mandar todo).
  const guardado = useRef<string | null>(inicial ? contenidoCanonico(inicial.contenido) : null);
  const enVuelo = useRef<Promise<void> | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reintento = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const intentos = useRef(0);
  const nacio = useRef(inicial !== null);
  const detenido = useRef(false);
  const congelado = useRef(false);
  const frenado = useRef(false);
  const posicionAnterior = useRef(posicion);
  const claveDeAlta = useRef<string | null>(null);
  const desmontado = useRef(false);
  const drenarRef = useRef<(keepalive?: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    ultimo.current = { contenido, canonico };
  });

  const limpiarTemporizadores = useCallback(() => {
    clearTimeout(espera.current);
    clearTimeout(reintento.current);
  }, []);

  const frenar = useCallback((nuevo: EstadoDeGuardado) => {
    frenado.current = true;
    setEstado(nuevo);
  }, []);

  /** Qué hacer con un pedido que falló: frenar si no va a cambiar solo, o reintentar más tarde. */
  const alFallar = useCallback((err: unknown): void => {
    if (err instanceof ApiError) {
      if (err.type === ERROR.CONTRACT_DRAFT_VERSION_CONFLICT) {
        setConflicto({ versionActual: versionActualDelBorrador(err) });
        return frenar("conflicto");
      }
      if (err.type === ERROR.CONTRACT_DRAFT_LIMIT_REACHED) return frenar("limite");
      if (err.status === 404) return frenar("desaparecido");
    }
    setEstado("error");
    // El asistente ya se cerró: el último guardado salió una vez y no se sigue insistiendo en segundo plano,
    // porque quien salió igual, tras el aviso, no espera que el borrador aparezca después.
    if (desmontado.current) return;
    const demora = REINTENTOS_MS[Math.min(intentos.current, REINTENTOS_MS.length - 1)];
    intentos.current += 1;
    clearTimeout(reintento.current);
    reintento.current = setTimeout(() => void drenarRef.current(), demora);
  }, [frenar]);

  /** Guarda hasta que lo confirmado coincide con lo que hay en pantalla. De a un pedido por vez. */
  const drenar = useCallback((keepalive = false): Promise<void> => {
    if (enVuelo.current) return enVuelo.current;
    const guardarHastaEstarAlDia = async (): Promise<void> => {
      while (!detenido.current && !congelado.current && !frenado.current) {
        const { contenido: objetivo, canonico: texto } = ultimo.current;
        if (idRef.current === null ? !nacio.current : texto === guardado.current) return;
        setEstado("guardando");
        try {
          if (idRef.current === null) {
            claveDeAlta.current ??= nuevaClaveDeAlta();
            const creado = await AlquiaBackendClient.contractDrafts.create(objetivo, {
              idempotencyKey: claveDeAlta.current,
              ...(keepalive ? { keepalive: true } : {}),
            });
            idRef.current = creado.id;
            versionRef.current = creado.version;
            setId(creado.id);
            // Si ya existía (un alta anterior llegó aunque no se vio la respuesta), tiene lo de aquel
            // pedido, no necesariamente lo de ahora: se compara con lo que realmente guarda.
            guardado.current = contenidoCanonico({ label: creado.label, payload: creado.payload });
          } else {
            const guardadoAhora = await AlquiaBackendClient.contractDrafts.update(
              idRef.current,
              { ...objetivo, version: versionRef.current },
              keepalive ? { keepalive: true } : undefined
            );
            versionRef.current = guardadoAhora.version;
            guardado.current = texto;
          }
          intentos.current = 0;
          setEstado("guardado");
        } catch (err) {
          alFallar(err);
          return;
        }
      }
    };
    const vuelo = guardarHastaEstarAlDia();
    enVuelo.current = vuelo;
    // Se suelta recién después de asignarlo: un ciclo que termina sin esperar nada (todo guardado,
    // o congelado) acabaría antes de la asignación y dejaría ahí una promesa vieja para siempre.
    void vuelo.finally(() => {
      if (enVuelo.current === vuelo) enVuelo.current = null;
    });
    return vuelo;
  }, [alFallar]);

  useEffect(() => {
    drenarRef.current = drenar;
  }, [drenar]);

  // Cada cambio: lo primero propio que se carga crea el borrador; un cambio de posición guarda ya;
  // lo demás espera a que el propietario deje de escribir.
  useEffect(() => {
    clearTimeout(espera.current);
    const cambioDePosicion = posicionAnterior.current !== posicion;
    posicionAnterior.current = posicion;
    if (!activo && idRef.current === null) return;
    nacio.current = true;
    if (idRef.current !== null && canonico === guardado.current) return;
    if (cambioDePosicion) {
      void drenar();
      return;
    }
    espera.current = setTimeout(() => void drenar(), esperaMs);
  }, [activo, canonico, posicion, id, esperaMs, drenar]);

  // Al cerrar o esconder la página: un último pedido que sobreviva a la página. Si el borrador todavía
  // no nació (el alta esperaba a que el propietario dejara de escribir, o falló), esa vez es el alta.
  useEffect(() => {
    const guardarAlSalir = () => {
      const sinNacer = idRef.current === null && nacio.current;
      if (sinNacer || (idRef.current !== null && ultimo.current.canonico !== guardado.current)) void drenar(true);
    };
    const alOcultar = () => {
      if (document.visibilityState === "hidden") guardarAlSalir();
    };
    window.addEventListener("pagehide", guardarAlSalir);
    document.addEventListener("visibilitychange", alOcultar);
    return () => {
      window.removeEventListener("pagehide", guardarAlSalir);
      document.removeEventListener("visibilitychange", alOcultar);
    };
  }, [drenar]);

  // Si el asistente se desmonta con cambios sin guardar (el propietario se fue a otra sección), se
  // manda lo último: el temporizador de los 2 s no llegaría a correr.
  useEffect(() => {
    // En desarrollo React monta, desmonta y vuelve a montar: el montaje tiene que dejarlo en pie.
    desmontado.current = false;
    return () => {
      clearTimeout(espera.current);
      clearTimeout(reintento.current);
      const sinNacer = idRef.current === null && nacio.current;
      const sinGuardar = sinNacer || (idRef.current !== null && ultimo.current.canonico !== guardado.current);
      desmontado.current = true;
      if (sinGuardar && !detenido.current && !frenado.current) void drenarRef.current(true);
    };
  }, []);

  /** Guarda lo pendiente y espera a que termine. Devuelve si quedó todo guardado. */
  const guardarAhora = useCallback(async (): Promise<boolean> => {
    clearTimeout(espera.current);
    await drenar();
    return idRef.current === null ? !nacio.current : ultimo.current.canonico === guardado.current;
  }, [drenar]);

  /** Frena el guardado y espera el pedido que viaja: para crear el contrato sin que se pise. */
  const congelar = useCallback(async (): Promise<void> => {
    congelado.current = true;
    limpiarTemporizadores();
    await enVuelo.current;
  }, [limpiarTemporizadores]);

  const descongelar = useCallback((): void => {
    congelado.current = false;
    void drenar();
  }, [drenar]);

  /** Para siempre: el contrato ya se creó o el borrador se descartó. */
  const detener = useCallback((): void => {
    detenido.current = true;
    limpiarTemporizadores();
  }, [limpiarTemporizadores]);

  const descartar = useCallback(async (): Promise<void> => {
    detener();
    await enVuelo.current;
    if (idRef.current !== null) await AlquiaBackendClient.contractDrafts.remove(idRef.current);
    idRef.current = null;
    setId(null);
  }, [detener]);

  /** Tras un conflicto: dejar la versión de acá y pisar la del otro dispositivo. */
  const conservarEsta = useCallback(async (): Promise<boolean> => {
    if (conflicto?.versionActual != null) versionRef.current = conflicto.versionActual;
    frenado.current = false;
    guardado.current = null;
    setConflicto(null);
    await drenar();
    return ultimo.current.canonico === guardado.current;
  }, [conflicto, drenar]);

  /** Tras un conflicto: traer la del otro dispositivo. El asistente la carga en pantalla. */
  const cargarLaOtra = useCallback(async (): Promise<ContractDraft> => {
    if (idRef.current === null) throw new Error("No hay borrador que cargar");
    const otro = await AlquiaBackendClient.contractDrafts.get(idRef.current);
    versionRef.current = otro.version;
    guardado.current = contenidoCanonico({ label: otro.label, payload: otro.payload });
    frenado.current = false;
    setConflicto(null);
    setEstado("guardado");
    return otro;
  }, []);

  /** Subir o quitar el PDF también sube la versión del borrador: sin esto el próximo guardado chocaría. */
  const adoptarVersion = useCallback((version: number): void => {
    versionRef.current = version;
  }, []);

  return { estado, id, conflicto, guardarAhora, congelar, descongelar, detener, descartar, conservarEsta, cargarLaOtra, adoptarVersion };
}
