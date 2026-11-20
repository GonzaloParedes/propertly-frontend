"use client";

import { useEffect, useState } from "react";
import CalculadoraDeAumentos from "@/components/dashboard/CalculadoraDeAumentos";
import { NAV_RESET_EVENT } from "@/components/dashboard/DashboardNav";
import { Icon, type IconName } from "@/components/ui/Icon";

type Herramienta = "calculadora";

const HERRAMIENTAS: ReadonlyArray<{ id: Herramienta; titulo: string; descripcion: string; icono: IconName }> = [
  {
    id: "calculadora",
    titulo: "Calculadora de aumentos",
    descripcion: "Calcule el nuevo alquiler por ICL o IPC a partir del último aumento.",
    icono: "calculator",
  },
];

/**
 * La sección Herramientas del panel (ALQ-145): utilidades que no dependen de la
 * cartera. Abre cada herramienta en el lugar, como el detalle de un listado; tocar
 * «Herramientas» en la barra vuelve al listado.
 */
export default function Herramientas() {
  const [abierta, setAbierta] = useState<Herramienta | null>(null);

  useEffect(() => {
    const volverAlListado = () => setAbierta(null);
    window.addEventListener(NAV_RESET_EVENT, volverAlListado);
    return () => window.removeEventListener(NAV_RESET_EVENT, volverAlListado);
  }, []);

  if (abierta === "calculadora") {
    return <>
      <nav className="owner-crumb"><button type="button" onClick={() => setAbierta(null)}>Herramientas</button><span>/</span><span>Calculadora de aumentos</span></nav>
      <header className="owner-page-head"><div><h1>Calculadora de aumentos</h1><p>El nuevo alquiler por ICL o IPC, con la misma cuenta que usan sus contratos.</p></div></header>
      <CalculadoraDeAumentos />
    </>;
  }

  return <>
    <header className="owner-page-head"><div><h1>Herramientas</h1><p>Cuentas útiles para administrar sus alquileres.</p></div></header>
    <div className="owner-list">
      {HERRAMIENTAS.map((herramienta) => (
        <button key={herramienta.id} type="button" className="owner-row owner-row--button owner-row--herramienta"
          onClick={() => setAbierta(herramienta.id)}>
          <span className="owner-row__icon"><Icon name={herramienta.icono} /></span>
          <span className="owner-row__body"><b>{herramienta.titulo}</b><small>{herramienta.descripcion}</small></span>
          <span className="owner-row__arrow"><Icon name="arrow" /></span>
        </button>
      ))}
    </div>
  </>;
}
