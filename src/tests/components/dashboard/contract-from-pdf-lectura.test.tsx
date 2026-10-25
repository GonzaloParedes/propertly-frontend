import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContractFromPdf from "@/components/dashboard/ContractFromPdf";
import { ApiError } from "@/lib/api";
import { ERROR } from "@/lib/error-codes";
import type { ContractImportResponse } from "@/lib/backend-types";
import { lectura } from "@/tests/lectura-de-contrato";

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    contractImports: { quota: vi.fn(), upload: vi.fn(), get: vi.fn(), retry: vi.fn(), complete: vi.fn(), discard: vi.fn(), document: vi.fn() },
    contracts: { onboard: vi.fn() },
    properties: { get: vi.fn() },
    tenants: { get: vi.fn() },
  },
}));

// El visor de pdf.js tiene su propio test: acá sólo importa qué página se le pide.
vi.mock("@/components/dashboard/PdfPageViewer", () => ({
  default: ({ pagina }: { pagina: number }) => <div data-testid="visor">Visor en la página {pagina}</div>,
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const importaciones = vi.mocked(AlquiaBackendClient.contractImports);

let onBack: ReturnType<typeof vi.fn>;
let onManual: ReturnType<typeof vi.fn>;
let onClose: ReturnType<typeof vi.fn>;
let onComplete: ReturnType<typeof vi.fn>;

const enCola = (extra: Partial<ContractImportResponse> = {}): ContractImportResponse =>
  ({ id: 41, status: "QUEUED", stage: null, pagesDone: null, pagesTotal: null, fileName: "contrato.pdf", pages: 6, failureReason: null, fields: null, unsupported: null, matches: null, ...extra });
const procesando = (stage: ContractImportResponse["stage"], extra: Partial<ContractImportResponse> = {}) =>
  enCola({ status: "PROCESSING", stage, ...extra });
const fallida = (failureReason: string) => enCola({ status: "FAILED", failureReason });

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  onBack = vi.fn();
  onManual = vi.fn();
  onClose = vi.fn();
  onComplete = vi.fn();
  importaciones.discard.mockResolvedValue(undefined);
  importaciones.document.mockResolvedValue(new Blob(["%PDF-"], { type: "application/pdf" }));
});

afterEach(() => vi.useRealTimers());

function abrir() {
  render(<ContractFromPdf onBack={onBack} onManual={onManual} onClose={onClose} onComplete={onComplete} />);
}

const pdf = (nombre = "contrato.pdf", bytes = 2_000_000) => {
  const archivo = new File(["%PDF-1.7"], nombre, { type: "application/pdf" });
  Object.defineProperty(archivo, "size", { value: bytes });
  return archivo;
};

const elegir = (archivo: File) => fireEvent.change(screen.getByLabelText("Archivo del contrato"), { target: { files: [archivo] } });

async function leer(archivo = pdf()) {
  abrir();
  elegir(archivo);
  await userEvent.click(screen.getByRole("button", { name: /Leer el contrato/ }));
}

/** Deja pasar un ciclo de consulta (cada 2 s) y lo que éste dispare. */
const consultar = (ms = 2000) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

const avance = () => screen.getByRole("list", { name: "Avance de la lectura" });
const paso = (texto: RegExp) => within(avance()).getByText(texto).closest("li")!;

describe("subir el archivo", () => {
  it("pide un PDF y muestra el nombre y el peso del que se elige, con «Cambiar»", () => {
    abrir();
    elegir(pdf("Contrato Colón 2255.pdf", 1_840_000));
    expect(screen.getByText("Contrato Colón 2255.pdf")).toBeInTheDocument();
    expect(screen.getByText(/PDF · 1,8 MB/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cambiar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Leer el contrato/ })).toBeEnabled();
  });

  it("no manda nada si el archivo no es un PDF, y pide el contrato como PDF", () => {
    abrir();
    elegir(new File(["x"], "foto.jpg", { type: "image/jpeg" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/no es un PDF/);
    expect(screen.getByRole("button", { name: /Leer el contrato/ })).toBeDisabled();
    expect(importaciones.upload).not.toHaveBeenCalled();
  });

  it("no manda un archivo de más de 20 MB y dice cuánto pesa", () => {
    abrir();
    elegir(pdf("grande.pdf", 25 * 1024 * 1024));
    expect(screen.getByRole("alert")).toHaveTextContent(/pesa 25 MB/);
    expect(screen.getByRole("alert")).toHaveTextContent(/máximo es 20 MB/);
    expect(importaciones.upload).not.toHaveBeenCalled();
  });

  it("acepta un archivo arrastrado", () => {
    abrir();
    const zona = screen.getByText("Arrastre el PDF hasta acá").closest("div")!;
    fireEvent.drop(zona, { dataTransfer: { files: [pdf("arrastrado.pdf")] } });
    expect(screen.getByText("arrastrado.pdf")).toBeInTheDocument();
  });

  it("«Atrás» vuelve a la elección", async () => {
    abrir();
    await userEvent.click(screen.getByRole("button", { name: "Atrás" }));
    expect(onBack).toHaveBeenCalled();
  });

  it("manda el archivo elegido al backend", async () => {
    importaciones.upload.mockResolvedValue(enCola());
    importaciones.get.mockResolvedValue(procesando("OPENING"));
    const archivo = pdf();
    await leer(archivo);
    expect(importaciones.upload).toHaveBeenCalledWith(archivo);
  });
});

describe("rechazos del backend", () => {
  const rechazos: [string, string, RegExp][] = [
    ["no es un PDF", ERROR.IMPORT_FILE_NOT_PDF, /no es un PDF/],
    ["demasiado grande", ERROR.IMPORT_FILE_TOO_LARGE, /demasiado grande/],
    ["demasiadas páginas", ERROR.IMPORT_FILE_TOO_MANY_PAGES, /demasiadas páginas/],
    ["con contraseña", ERROR.IMPORT_FILE_ENCRYPTED, /tiene contraseña.*sin contraseña/],
    ["con contenido activo", ERROR.IMPORT_FILE_ACTIVE_CONTENT, /contenido que no podemos abrir/],
    ["sin lecturas (429)", ERROR.IMPORT_QUOTA_EXCEEDED, /usó todas las lecturas/],
    ["lectura apagada (503)", ERROR.AI_IMPORTS_UNAVAILABLE, /no está disponible/],
    ["dañado", ERROR.IMPORT_FILE_CORRUPT, /parece dañado/],
  ];

  it.each(rechazos)("%s: lo dice en palabras simples y ofrece las dos salidas", async (_nombre, type, texto) => {
    importaciones.upload.mockRejectedValue(new ApiError(400, "English detail", type));
    await leer();
    expect(await screen.findByRole("heading", { name: "No pudimos usar este archivo" })).toBeInTheDocument();
    const mensaje = screen.getByRole("alert");
    expect(mensaje).toHaveTextContent(texto);
    expect(mensaje).not.toHaveTextContent("English");
    expect(screen.getByRole("button", { name: /Probar con otro archivo/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cargarlo a mano/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Intentar de nuevo/ })).not.toBeInTheDocument();
  });

  it("si no hay conexión con el servidor, lo dice", async () => {
    importaciones.upload.mockRejectedValue(new TypeError("Failed to fetch"));
    await leer();
    expect(await screen.findByRole("alert")).toHaveTextContent(/No pudimos conectarnos/);
  });

  it("«Probar con otro archivo» vuelve a la subida sin el archivo anterior", async () => {
    importaciones.upload.mockRejectedValue(new ApiError(400, "x", ERROR.IMPORT_FILE_ENCRYPTED));
    await leer();
    await userEvent.click(await screen.findByRole("button", { name: /Probar con otro archivo/ }));
    expect(screen.getByRole("heading", { name: "Suba el contrato firmado" })).toBeInTheDocument();
    expect(screen.queryByText("contrato.pdf")).not.toBeInTheDocument();
  });

  it("«Cargarlo a mano» abre el asistente de siempre", async () => {
    importaciones.upload.mockRejectedValue(new ApiError(503, "x", ERROR.AI_IMPORTS_UNAVAILABLE));
    await leer();
    await userEvent.click(await screen.findByRole("button", { name: /Cargarlo a mano/ }));
    expect(onManual).toHaveBeenCalled();
  });
});

describe("la espera refleja el estado real", () => {
  it("en cola no tilda nada y lo dice", async () => {
    importaciones.upload.mockResolvedValue(enCola());
    importaciones.get.mockResolvedValue(enCola());
    await leer();
    expect(await screen.findByRole("heading", { name: "Esperando su turno…" })).toBeInTheDocument();
    for (const li of within(avance()).getAllByRole("listitem")) expect(li).toHaveAttribute("data-estado", "despues");
  });

  it("leyendo: abrir tildado, el contador a la vista y la revisión sin tildar", async () => {
    importaciones.upload.mockResolvedValue(procesando("OPENING"));
    importaciones.get.mockResolvedValue(procesando("READING_PAGES", { pagesDone: 3, pagesTotal: 6 }));
    await leer();
    expect(paso(/Abriendo el archivo/)).toHaveAttribute("data-estado", "ahora");

    await consultar();

    expect(paso(/Abriendo el archivo/)).toHaveAttribute("data-estado", "listo");
    expect(paso(/Leyendo las páginas y buscando los datos/)).toHaveAttribute("data-estado", "ahora");
    expect(paso(/Leyendo las páginas y buscando los datos/)).toHaveTextContent("página 3 de 6");
    expect(paso(/Revisando lo que encontramos/)).toHaveAttribute("data-estado", "despues");
  });

  it("la lista tiene tres pasos y nunca dos en curso a la vez", async () => {
    importaciones.upload.mockResolvedValue(procesando("OPENING"));
    importaciones.get.mockResolvedValue(procesando("FINDING_DATA", { pagesDone: 2, pagesTotal: 6 }));
    await leer();
    await consultar();
    const pasos = within(avance()).getAllByRole("listitem");
    expect(pasos).toHaveLength(3);
    expect(pasos.filter((li) => li.getAttribute("data-estado") === "ahora")).toHaveLength(1);
  });

  it("al comprobar, se tilda la lectura y sigue la revisión", async () => {
    importaciones.upload.mockResolvedValue(procesando("OPENING"));
    importaciones.get.mockResolvedValue(procesando("CHECKING", { pagesDone: 6, pagesTotal: 6 }));
    await leer();
    await consultar();
    expect(paso(/Leyendo las páginas y buscando los datos/)).toHaveAttribute("data-estado", "listo");
    expect(paso(/Revisando lo que encontramos/)).toHaveAttribute("data-estado", "ahora");
  });

  it("el tiempo solo no tilda nada: sin una etapa nueva del backend, todo queda igual", async () => {
    importaciones.upload.mockResolvedValue(procesando("OPENING"));
    importaciones.get.mockResolvedValue(procesando("OPENING"));
    await leer();
    await consultar(60_000);
    expect(paso(/Abriendo el archivo/)).toHaveAttribute("data-estado", "ahora");
    expect(paso(/Leyendo las páginas y buscando los datos/)).toHaveAttribute("data-estado", "despues");
  });

  it("consulta cada 2 segundos", async () => {
    importaciones.upload.mockResolvedValue(procesando("OPENING"));
    importaciones.get.mockResolvedValue(procesando("OPENING"));
    await leer();
    expect(importaciones.get).not.toHaveBeenCalled();
    await consultar(2000);
    expect(importaciones.get).toHaveBeenCalledTimes(1);
    await consultar(2000);
    expect(importaciones.get).toHaveBeenCalledTimes(2);
    expect(importaciones.get).toHaveBeenCalledWith(41);
  });

  it("anuncia los cambios a la tecnología de asistencia", async () => {
    importaciones.upload.mockResolvedValue(procesando("OPENING"));
    importaciones.get.mockResolvedValue(procesando("OPENING"));
    await leer();
    expect(avance()).toHaveAttribute("aria-live", "polite");
    expect(paso(/Abriendo el archivo/)).toHaveTextContent(": en curso");
  });

  it("«Cancelar» descarta la lectura y vuelve a la subida", async () => {
    importaciones.upload.mockResolvedValue(procesando("OPENING"));
    importaciones.get.mockResolvedValue(procesando("OPENING"));
    await leer();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(importaciones.discard).toHaveBeenCalledWith(41);
    expect(screen.getByRole("heading", { name: "Suba el contrato firmado" })).toBeInTheDocument();
    // Ya no se sigue consultando.
    importaciones.get.mockClear();
    await consultar(10_000);
    expect(importaciones.get).not.toHaveBeenCalled();
  });

  it("si cancela mientras todavía sube, la lectura que llega después se descarta", async () => {
    let terminar!: (r: ContractImportResponse) => void;
    importaciones.upload.mockReturnValue(new Promise((resolver) => { terminar = resolver; }));
    await leer();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await act(async () => terminar(enCola({ id: 77 })));
    expect(importaciones.discard).toHaveBeenCalledWith(77);
    expect(screen.getByRole("heading", { name: "Suba el contrato firmado" })).toBeInTheDocument();
  });

  it("a los 90 segundos avisa que tarda y ofrece seguir esperando o cargarlo a mano", async () => {
    importaciones.upload.mockResolvedValue(procesando("FINDING_DATA"));
    importaciones.get.mockResolvedValue(procesando("FINDING_DATA"));
    await leer();
    await consultar(89_000);
    expect(screen.queryByText(/Está tardando más de lo normal/)).not.toBeInTheDocument();

    await consultar(2000);
    expect(screen.getByText(/Está tardando más de lo normal/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Seguir esperando" }));
    expect(screen.queryByText(/Está tardando más de lo normal/)).not.toBeInTheDocument();
  });

  it("desde el aviso de demora, «Cargarlo a mano» descarta la lectura", async () => {
    importaciones.upload.mockResolvedValue(procesando("FINDING_DATA"));
    importaciones.get.mockResolvedValue(procesando("FINDING_DATA"));
    await leer();
    await consultar(91_000);
    await userEvent.click(within(screen.getByText(/Está tardando más/).closest("div")!).getByRole("button", { name: "Cargarlo a mano" }));
    expect(importaciones.discard).toHaveBeenCalledWith(41);
    expect(onManual).toHaveBeenCalled();
  });

  it("si perdió la conexión varias veces seguidas, deja de insistir y lo dice", async () => {
    importaciones.upload.mockResolvedValue(procesando("OPENING"));
    importaciones.get.mockRejectedValue(new Error("sin red"));
    await leer();
    await consultar(2000);
    await consultar(2000);
    expect(screen.queryByRole("heading", { name: "No pudimos usar este archivo" })).not.toBeInTheDocument();
    await consultar(2000);
    expect(screen.getByRole("heading", { name: "No pudimos usar este archivo" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/Perdimos la conexión/);
  });

  it("si la lectura ya no existe (404), lo dice y ofrece subir otra vez", async () => {
    importaciones.upload.mockResolvedValue(procesando("OPENING"));
    importaciones.get.mockRejectedValue(new ApiError(404, "Not found"));
    await leer();
    await consultar();
    expect(screen.getByRole("alert")).toHaveTextContent(/ya no existe/);
  });
});

describe("cuando la lectura falla", () => {
  async function hastaElFallo(razon: string) {
    importaciones.upload.mockResolvedValue(procesando("OPENING"));
    importaciones.get.mockResolvedValue(fallida(razon));
    await leer();
    await consultar();
    await screen.findByRole("heading", { name: "No pudimos leer este documento" });
  }

  it("incierta: ofrece otro archivo, cargarlo a mano e intentar de nuevo, y explica que no gasta otra lectura", async () => {
    await hastaElFallo("UNCERTAIN");
    expect(screen.getByRole("alert")).toHaveTextContent(/sin gastar otra lectura/);
    expect(screen.getByRole("button", { name: /Probar con otro archivo/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cargarlo a mano/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Intentar de nuevo/ })).toBeInTheDocument();
  });

  it("«Intentar de nuevo» pide el reintento y vuelve a esperar", async () => {
    await hastaElFallo("UNCERTAIN");
    importaciones.retry.mockResolvedValue(enCola());
    importaciones.get.mockResolvedValue(procesando("OPENING"));
    await userEvent.click(screen.getByRole("button", { name: /Intentar de nuevo/ }));
    expect(importaciones.retry).toHaveBeenCalledWith(41);
    expect(await screen.findByRole("heading", { name: "Esperando su turno…" })).toBeInTheDocument();
  });

  it("cualquier otra falla también ofrece reintentar", async () => {
    await hastaElFallo("EXTRACTION_FAILED");
    expect(screen.getByRole("button", { name: /Intentar de nuevo/ })).toBeInTheDocument();
  });

  it("si el reintento no corresponde, lo explica sin mostrar el texto técnico", async () => {
    await hastaElFallo("UNCERTAIN");
    importaciones.retry.mockRejectedValue(new ApiError(409, "Import is not eligible for retry", ERROR.IMPORT_NOT_RETRYABLE));
    await userEvent.click(screen.getByRole("button", { name: /Intentar de nuevo/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/no se puede volver a intentar/);
    expect(screen.getByRole("alert")).not.toHaveTextContent("eligible");
    expect(screen.queryByRole("button", { name: /Intentar de nuevo/ })).not.toBeInTheDocument();
  });

  it("«Probar con otro archivo» descarta la lectura fallida", async () => {
    await hastaElFallo("UNCERTAIN");
    await userEvent.click(screen.getByRole("button", { name: /Probar con otro archivo/ }));
    expect(importaciones.discard).toHaveBeenCalledWith(41);
    expect(screen.getByRole("heading", { name: "Suba el contrato firmado" })).toBeInTheDocument();
  });
});

describe("el mismo archivo otra vez", () => {
  it("si la lectura ya está lista, va directo a la revisión sin esperar", async () => {
    importaciones.upload.mockResolvedValue(lectura());
    await leer();
    expect(await screen.findByRole("heading", { name: "Revise lo que encontramos" })).toBeInTheDocument();
    expect(importaciones.get).not.toHaveBeenCalled();
  });

  it("si ya se creó un contrato con ese archivo, lo dice en vez de abrirlo otra vez", async () => {
    importaciones.upload.mockResolvedValue(lectura({}, { status: "COMPLETED" }));
    await leer();
    expect(await screen.findByRole("alert")).toHaveTextContent(/Ya cargó un contrato/);
  });
});
