"use client";

import { useState } from "react";
import DashboardNav, { type WorkspaceView } from "@/components/dashboard/DashboardNav";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";
import Tutorial from "@/components/dashboard/Tutorial";
import { ThemeProvider } from "@/context/theme-context";

export default function PrototypeShell() {
  const [view, setView] = useState<WorkspaceView>("inicio");

  return (
    <ThemeProvider>
      <div className="min-h-screen" style={{ background: "var(--superficie)" }}>
        <DashboardNav activeView={view} onNavigate={setView} />
        <Tutorial />
        <OwnerWorkspace initialView="inicio" activeView={view} onNavigate={setView} demo />
      </div>
    </ThemeProvider>
  );
}
