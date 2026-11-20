"use client";

import { useEffect, useState } from "react";
import CalculadoraDeAumentos from "@/components/dashboard/CalculadoraDeAumentos";
import ConsultaBcra from "@/components/dashboard/ConsultaBcra";
import { NAV_RESET_EVENT } from "@/components/dashboard/DashboardNav";
import PredictorDeAlquiler from "@/components/dashboard/PredictorDeAlquiler";
import { Icon, type IconName } from "@/components/ui/Icon";

type Herramienta = "calculadora" | "bcra" | "predictor";

const HERRAMIENTAS: ReadonlyArray<{
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

/**
 * La sección Herramientas del panel (ALQ-145): utilidades que no dependen de la
 * cartera. Abre cada herramienta en el lugar, como el detalle de un listado; tocar
 * «Herramientas» en la barra vuelve al listado.
 */
export default function Herramientas({ demo = false }: Readonly<{ demo?: boolean }>) {
  const [abierta, setAbierta] = useState<Herramienta | null>(null);

  useEffect(() => {
    const volverAlListado = () => setAbierta(null);
    window.addEventListener(NAV_RESET_EVENT, volverAlListado);
    return () => window.removeEventListener(NAV_RESET_EVENT, volverAlListado);
  }, []);

  const herramienta = HERRAMIENTAS.find((h) => h.id === abierta);
  if (herramienta) {
    return <>
      <nav className="owner-crumb"><button type="button" onClick={() => setAbierta(null)}>Herramientas</button><span>/</span><span>{herramienta.titulo}</span></nav>
      <header className="owner-page-head"><div><h1>{herramienta.titulo}</h1><p>{herramienta.subtitulo}</p></div></header>
      {herramienta.id === "calculadora" && <CalculadoraDeAumentos />}
      {herramienta.id === "bcra" && <ConsultaBcra demo={demo} />}
      {herramienta.id === "predictor" && <PredictorDeAlquiler demo={demo} />}
    </>;
  }

  return <>
    <header className="owner-page-head"><div><h1>Herramientas</h1><p>Cuentas y consultas útiles para administrar sus alquileres.</p></div></header>
    <div className="owner-list">
      {HERRAMIENTAS.map((h) => (
        <button key={h.id} type="button" className="owner-row owner-row--button owner-row--herramienta"
          onClick={() => setAbierta(h.id)}>
          <span className="owner-row__icon"><Icon name={h.icono} /></span>
          <span className="owner-row__body"><b>{h.titulo}</b><small>{h.descripcion}</small></span>
          <span className="owner-row__arrow"><Icon name="arrow" /></span>
        </button>
      ))}
    </div>
  </>;
}
