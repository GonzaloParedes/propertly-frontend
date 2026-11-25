"use client";

import { useState } from "react";
import DashboardNav, { type WorkspaceView } from "@/components/dashboard/DashboardNav";
import type { Herramienta } from "./herramientas-catalogo";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";
import ReportarProblema from "@/components/dashboard/ReportarProblema";
import Tutorial from "@/components/dashboard/Tutorial";
import { ThemeProvider } from "@/context/theme-context";

export default function PrototypeShell() {
  const [{ view, tool }, setDestination] = useState<{ view: WorkspaceView; tool?: Herramienta }>({ view: "inicio" });

  function navigate(view: WorkspaceView, tool?: Herramienta) {
    setDestination({ view, tool });
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen" style={{ background: "var(--superficie)" }}>
        <DashboardNav activeView={view} tool={tool} onNavigate={navigate} />
        <Tutorial />
        <ReportarProblema />
        <OwnerWorkspace initialView="inicio" activeView={view} tool={tool} onNavigate={navigate} demo />
      </div>
    </ThemeProvider>
  );
}
