import { notFound } from "next/navigation";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";
import { HERRAMIENTAS } from "@/components/dashboard/herramientas-catalogo";

export default async function ToolPage({ params }: Readonly<{ params: Promise<{ tool: string }> }>) {
  const { tool } = await params;
  const herramienta = HERRAMIENTAS.find((item) => item.id === tool);
  if (!herramienta) notFound();

  return <OwnerWorkspace key={herramienta.id} initialView="herramientas" tool={herramienta.id} />;
}
