"use client";

import { useEffect, useState } from "react";
import CalculadoraDeAumentos from "@/components/dashboard/CalculadoraDeAumentos";
import ConsultaBcra from "@/components/dashboard/ConsultaBcra";
import { NAV_RESET_EVENT } from "@/components/dashboard/DashboardNav";
import PredictorDeAlquiler from "@/components/dashboard/PredictorDeAlquiler";
import Link from "next/link";
import { HERRAMIENTAS, RUTA_HERRAMIENTAS, type Herramienta } from "./herramientas-catalogo";
import { Icon } from "@/components/ui/Icon";

/**
 * Renderiza una herramienta abierta desde el menú o desde el listado anterior.
 */
export default function Herramientas({ demo = false, tool, onBack }: Readonly<{ demo?: boolean; tool?: Herramienta; onBack?: () => void }>) {
  const [abierta, setAbierta] = useState<Herramienta | null>(null);

  useEffect(() => {
    const volverAlListado = () => setAbierta(null);
    window.addEventListener(NAV_RESET_EVENT, volverAlListado);
    return () => window.removeEventListener(NAV_RESET_EVENT, volverAlListado);
  }, []);

  const herramienta = HERRAMIENTAS.find((h) => h.id === (tool ?? abierta));
  if (herramienta) {
    return <>
      <nav className="owner-crumb">{tool && !onBack
        ? <Link href={RUTA_HERRAMIENTAS}>Herramientas</Link>
        : <button type="button" onClick={onBack ?? (() => setAbierta(null))}>Herramientas</button>}<span>/</span><span>{herramienta.titulo}</span></nav>
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
