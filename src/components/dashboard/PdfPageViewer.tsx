"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Una página del contrato que el propietario subió, dibujada con pdf.js. Se carga recién cuando
 * se abre la revisión: la librería pesa, y quien carga a mano nunca la necesita.
 *
 * El PDF viene del backend como un blob y se dibuja en un canvas: nada del archivo se interpreta
 * como HTML. La versión de `pdfjs-dist` está fijada y ya no usa `eval`, que es lo que antes
 * obligaba a apagarlo con `isEvalSupported`.
 */
type Estado = "cargando" | "listo" | "error";

export default function PdfPageViewer({ cargar, pagina, nombre }: Readonly<{
  /** Trae el PDF; se llama una vez por visor. */
  cargar: () => Promise<Blob>;
  /** Número de página, desde 1. */
  pagina: number;
  nombre: string;
}>) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const [documento, setDocumento] = useState<PDFDocumentProxy | null>(null);
  const [paginas, setPaginas] = useState<number | null>(null);
  const [estado, setEstado] = useState<Estado>("cargando");

  useEffect(() => {
    let cancelado = false;
    let abierto: PDFDocumentProxy | null = null;
    void (async () => {
      try {
        const [pdfjs, blob] = await Promise.all([import("pdfjs-dist"), cargar()]);
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const datos = new Uint8Array(await blob.arrayBuffer());
        abierto = await pdfjs.getDocument({ data: datos }).promise;
        if (cancelado) return void abierto.destroy();
        setDocumento(abierto);
        setPaginas(abierto.numPages);
      } catch {
        if (!cancelado) setEstado("error");
      }
    })();
    return () => {
      cancelado = true;
      void abierto?.destroy();
    };
  }, [cargar]);

  useEffect(() => {
    if (!documento || !lienzo.current) return;
    let cancelado = false;
    let tarea: { cancel: () => void; promise: Promise<unknown> } | null = null;
    void (async () => {
      try {
        const numero = Math.min(Math.max(1, pagina), documento.numPages);
        const hoja = await documento.getPage(numero);
        if (cancelado || !lienzo.current) return;
        const ancho = contenedor.current?.clientWidth || 560;
        const base = hoja.getViewport({ scale: 1 });
        const vista = hoja.getViewport({ scale: Math.min(2, Math.max(0.5, ancho / base.width)) });
        const pixeles = window.devicePixelRatio || 1;
        const canvas = lienzo.current;
        canvas.width = Math.floor(vista.width * pixeles);
        canvas.height = Math.floor(vista.height * pixeles);
        canvas.style.width = `${Math.floor(vista.width)}px`;
        canvas.style.height = `${Math.floor(vista.height)}px`;
        tarea = hoja.render({
          canvas,
          viewport: vista,
          transform: pixeles === 1 ? undefined : [pixeles, 0, 0, pixeles, 0, 0],
        });
        await tarea.promise;
        if (!cancelado) setEstado("listo");
      } catch (err) {
        // Cambiar de página a mitad de un dibujo cancela el anterior: no es un error.
        const cancelada = err instanceof Error && err.name === "RenderingCancelledException";
        if (!cancelado && !cancelada) setEstado("error");
      }
    })();
    return () => {
      cancelado = true;
      tarea?.cancel();
    };
  }, [documento, pagina]);

  return (
    <div className="owner-pdf-viewer" ref={contenedor}>
      <div className="owner-pdf-viewer__bar">
        <span>{nombre}</span>
        <small>{paginas ? `Página ${Math.min(pagina, paginas)} de ${paginas}` : `Página ${pagina}`}</small>
      </div>
      {estado === "error" ? (
        <p className="owner-pdf-viewer__error" role="alert">No pudimos mostrar el documento. La cita de cada dato sigue disponible debajo de él.</p>
      ) : (
        <>
          {estado === "cargando" && <output className="owner-pdf-viewer__wait"><Spinner />Abriendo el contrato…</output>}
          {/* El texto de adentro es el contenido alternativo del canvas: lo leen los lectores de pantalla. */}
          <canvas ref={lienzo} hidden={estado === "cargando"}>{`Página ${pagina} del contrato`}</canvas>
        </>
      )}
    </div>
  );
}
