/**
 * EventSource falso para los tests. jsdom no trae uno: sin esto, un stream abierto
 * por la pantalla no tiene forma de recibir un evento durante el test.
 */
type Escucha = (evento: Event) => void;

export class FakeEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  static instancias: FakeEventSource[] = [];

  readyState: number = FakeEventSource.CONNECTING;
  onerror: ((evento: Event) => void) | null = null;
  private escuchas = new Map<string, Escucha[]>();

  constructor(
    readonly url: string,
    readonly init?: EventSourceInit,
  ) {
    FakeEventSource.instancias.push(this);
  }

  addEventListener(tipo: string, escucha: Escucha) {
    this.escuchas.set(tipo, [...(this.escuchas.get(tipo) ?? []), escucha]);
  }

  close() {
    this.readyState = FakeEventSource.CLOSED;
  }

  /** Simula que llega un evento del servidor con ese `event:` y ese JSON en `data:`. */
  emitir(tipo: string, datos: unknown = {}) {
    this.emitirCrudo(tipo, JSON.stringify(datos));
  }

  /** Igual que `emitir`, pero con el texto tal cual llega por la red. */
  emitirCrudo(tipo: string, texto: string) {
    const evento = new MessageEvent(tipo, { data: texto });
    this.escuchas.get(tipo)?.forEach((escucha) => escucha(evento));
  }

  /** Simula un error del navegador con el readyState que dejó (CONNECTING reintenta, CLOSED no). */
  fallar(readyState: number) {
    this.readyState = readyState;
    this.onerror?.(new Event("error"));
  }
}

/** Reemplaza EventSource global por el falso y limpia las instancias previas. */
export function instalarEventSourceFalso() {
  FakeEventSource.instancias = [];
  vi.stubGlobal("EventSource", FakeEventSource);
  return FakeEventSource;
}
