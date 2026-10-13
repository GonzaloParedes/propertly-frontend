import { render, screen, waitFor } from "@testing-library/react";
import PdfPageViewer from "@/components/dashboard/PdfPageViewer";

const getDocument = vi.fn();
const GlobalWorkerOptions: { workerSrc?: string } = {};

// pdf.js se carga recién al mostrar un documento: acá se reemplaza por uno de mentira.
vi.mock("pdfjs-dist", () => ({ GlobalWorkerOptions, getDocument: (...args: unknown[]) => getDocument(...args) }));

function documentoDe(paginas: number) {
  const render = vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() }));
  const getPage = vi.fn(async () => ({
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
    render,
  }));
  const destroy = vi.fn();
  return { numPages: paginas, getPage, destroy, render };
}

// jsdom no implementa `Blob.arrayBuffer`, que el navegador sí tiene.
const blob = () => Promise.resolve({ arrayBuffer: async () => new TextEncoder().encode("%PDF-1.7").buffer } as Blob);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("PdfPageViewer", () => {
  it("dibuja la página pedida del PDF que trae el backend y dice cuántas tiene", async () => {
    const documento = documentoDe(6);
    getDocument.mockReturnValue({ promise: Promise.resolve(documento) });
    render(<PdfPageViewer cargar={blob} pagina={2} nombre="contrato.pdf" />);

    expect(screen.getByText("Abriendo el contrato…")).toBeInTheDocument();
    await waitFor(() => expect(documento.getPage).toHaveBeenCalledWith(2));
    expect(await screen.findByText("Página 2 de 6")).toBeInTheDocument();
    expect(screen.getByText("contrato.pdf")).toBeInTheDocument();
    expect(screen.getByText("Página 2 del contrato")).toBeInTheDocument();
    expect(documento.render).toHaveBeenCalledTimes(1);
  });

  it("le pasa a pdf.js los bytes del archivo, sin abrirlo por URL ni dejarle ejecutar nada propio", async () => {
    const documento = documentoDe(1);
    getDocument.mockReturnValue({ promise: Promise.resolve(documento) });
    render(<PdfPageViewer cargar={blob} pagina={1} nombre="contrato.pdf" />);
    await waitFor(() => expect(getDocument).toHaveBeenCalled());
    const origen = getDocument.mock.calls[0][0] as { data: Uint8Array; url?: string };
    expect(origen.data).toBeInstanceOf(Uint8Array);
    expect(origen.url).toBeUndefined();
    expect(GlobalWorkerOptions.workerSrc).toMatch(/pdf\.worker\.min\.mjs$/);
  });

  it("cambia de página sin volver a bajar el PDF", async () => {
    const documento = documentoDe(6);
    getDocument.mockReturnValue({ promise: Promise.resolve(documento) });
    const cargar = vi.fn(blob);
    const { rerender } = render(<PdfPageViewer cargar={cargar} pagina={1} nombre="contrato.pdf" />);
    await waitFor(() => expect(documento.getPage).toHaveBeenCalledWith(1));

    rerender(<PdfPageViewer cargar={cargar} pagina={4} nombre="contrato.pdf" />);

    await waitFor(() => expect(documento.getPage).toHaveBeenCalledWith(4));
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it("una página fuera de rango se acota a las que tiene", async () => {
    const documento = documentoDe(3);
    getDocument.mockReturnValue({ promise: Promise.resolve(documento) });
    render(<PdfPageViewer cargar={blob} pagina={9} nombre="contrato.pdf" />);
    await waitFor(() => expect(documento.getPage).toHaveBeenCalledWith(3));
  });

  it("si no se puede abrir, lo dice sin romper la revisión", async () => {
    getDocument.mockReturnValue({ promise: Promise.reject(new Error("InvalidPDFException")) });
    render(<PdfPageViewer cargar={blob} pagina={1} nombre="contrato.pdf" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/No pudimos mostrar el documento/);
  });

  it("si el backend no entrega el archivo, también lo dice", async () => {
    render(<PdfPageViewer cargar={() => Promise.reject(new Error("404"))} pagina={1} nombre="contrato.pdf" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/No pudimos mostrar el documento/);
  });

  it("al cerrarse libera el documento", async () => {
    const documento = documentoDe(2);
    getDocument.mockReturnValue({ promise: Promise.resolve(documento) });
    const { unmount } = render(<PdfPageViewer cargar={blob} pagina={1} nombre="contrato.pdf" />);
    await waitFor(() => expect(documento.getPage).toHaveBeenCalled());
    unmount();
    expect(documento.destroy).toHaveBeenCalled();
  });
});
