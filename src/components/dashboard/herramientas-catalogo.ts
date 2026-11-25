import type { IconName } from "@/components/ui/Icon";

export type Herramienta = "calculadora" | "bcra" | "predictor";

export const HERRAMIENTAS: ReadonlyArray<{
  id: Herramienta;
  titulo: string;
  descripcion: string;
  subtitulo: string;
  icono: IconName;
}> = [
  {
    id: "calculadora",
    titulo: "Calculadora de aumentos",
    descripcion: "Calcule el nuevo alquiler por ICL o IPC a partir del último aumento.",
    subtitulo: "El nuevo alquiler por ICL o IPC, con la misma cuenta que usan sus contratos.",
    icono: "calculator",
  },
  {
    id: "bcra",
    titulo: "Consulta de deudores",
    descripcion: "Vea si una persona tiene deudas informadas en la Central de Deudores del BCRA.",
    subtitulo: "La situación crediticia de cualquier CUIT o CUIL, o de un inquilino suyo.",
    icono: "search",
  },
  {
    id: "predictor",
    titulo: "Predictor de alquiler",
    descripcion: "Estime a cuánto alquilar una propiedad según el mercado de la zona.",
    subtitulo: "Para una propiedad suya o para otra, con una carga rápida.",
    icono: "trend",
  },
];

export const RUTA_HERRAMIENTAS = "/dashboard/herramientas";
