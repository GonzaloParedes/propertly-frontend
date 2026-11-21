/**
 * Píxel de Meta (ALQ-146). Sólo eventos: nada de advanced matching ni datos personales.
 *
 * El píxel existe únicamente si el build es de producción Y hay ID configurado
 * (`NEXT_PUBLIC_META_PIXEL_ID`, que Next inlinea en build). En local, tests y cualquier build sin
 * la variable, `metaPixelId()` da null y ni se inyecta el script ni se dispara nada.
 */

export type MetaStandardEvent = "PageView" | "CompleteRegistration";
export type MetaCustomEvent = "FirstPropertyCreated";
export type MetaEvent = MetaStandardEvent | MetaCustomEvent;

/** Sólo valores simples sin datos del usuario (ej. `{ status: true }`). */
export type MetaParams = Record<string, string | number | boolean>;

const CUSTOM_EVENTS: ReadonlySet<MetaEvent> = new Set<MetaEvent>(["FirstPropertyCreated"]);

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  loaded: boolean;
  version: string;
  push: Fbq;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const SCRIPT_URL = "https://connect.facebook.net/en_US/fbevents.js";

/** ID del píxel, o null si hay que mantenerlo apagado (no production o variable vacía/inválida). */
export function metaPixelId(): string | null {
  if (process.env.NODE_ENV !== "production") return null;
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  // Sólo dígitos: el ID termina en un `fbq('init', …)`, no dejamos pasar cualquier cosa.
  return id && /^\d{5,20}$/.test(id) ? id : null;
}

/**
 * Inyecta `fbevents.js` e inicializa el píxel. No-op fuera de production, sin ID, en el server o si
 * ya está cargado (Strict Mode). Devuelve true sólo si lo cargó en esta llamada.
 */
export function loadMetaPixel(): boolean {
  const id = metaPixelId();
  if (!id || typeof window === "undefined" || window.fbq) return false;

  // Stub oficial del snippet de Meta: encola las llamadas hasta que fbevents.js termina de cargar.
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = SCRIPT_URL;
  document.head.appendChild(script);

  // Sin autoConfig: el píxel no mira botones ni campos de formularios (fuente del advanced
  // matching automático). El `init` va sin segundo argumento: no se le pasa user data.
  fbq("set", "autoConfig", false, id);
  fbq("init", id);
  return true;
}

/** Dispara un evento. No-op si el píxel está apagado o todavía no se cargó. */
export function trackMeta(event: MetaEvent, params?: MetaParams): void {
  if (!metaPixelId() || typeof window === "undefined" || typeof window.fbq !== "function") return;
  const method = CUSTOM_EVENTS.has(event) ? "trackCustom" : "track";
  if (params) window.fbq(method, event, params);
  else window.fbq(method, event);
}

/**
 * Rutas cuyo link lleva un token en la URL (confirmar correo, recupero de contraseña, portal del
 * inquilino). El píxel manda la URL completa con cada evento, así que ahí no se dispara nada.
 */
const RUTAS_CON_TOKEN = ["/confirmar-correo", "/restablecer-contrasena", "/reset-password", "/tenant-portal"];

export function rutaSinPixel(pathname: string): boolean {
  return RUTAS_CON_TOKEN.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Marca local de «ya avisamos la primera propiedad» (sin ID ni dato del usuario). */
const FIRST_PROPERTY_KEY = "alquia:meta:first-property";

/**
 * ¿La cuenta ya tenía propiedades? Se consulta antes del alta, y sólo con el píxel activo (no suma
 * un GET en local/dev). `null` = no aplica o no se pudo consultar.
 */
export function teniaPropiedadesAntes(listar: () => Promise<readonly unknown[]>): Promise<boolean | null> {
  if (!metaPixelId()) return Promise.resolve(null);
  return listar().then((l) => l.length > 0, () => null);
}

/**
 * Dispara `FirstPropertyCreated` sólo si la cuenta no tenía propiedades antes de crear esta
 * (`teniaPropiedades === false`, dato del API) y este navegador no lo avisó ya. Con `null`
 * (no pudimos consultar) no dispara. Es un cálculo previo al alta: ver `CreationWizard`.
 */
export function trackFirstProperty(teniaPropiedades: boolean | null): void {
  if (teniaPropiedades !== false || !metaPixelId()) return;
  try {
    if (window.localStorage.getItem(FIRST_PROPERTY_KEY)) return;
    window.localStorage.setItem(FIRST_PROPERTY_KEY, "1");
  } catch {
    // Storage bloqueado: seguimos igual, el conteo del API ya filtró a quien tenía propiedades.
  }
  trackMeta("FirstPropertyCreated");
}
