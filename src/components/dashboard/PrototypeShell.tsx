"use client";

import { useState } from "react";
import DashboardNav, { type WorkspaceView } from "@/components/dashboard/DashboardNav";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";

export default function PrototypeShell() {
  const [view, setView] = useState<WorkspaceView>("inicio");

  return (
    <div className="min-h-screen" style={{ background: "var(--superficie)" }}>
      <DashboardNav activeView={view} onNavigate={setView} />
      <OwnerWorkspace initialView="inicio" activeView={view} onNavigate={setView} demo />
    </div>
  );
}
