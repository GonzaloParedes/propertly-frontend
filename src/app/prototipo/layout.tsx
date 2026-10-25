import { notFound } from "next/navigation";

/**
 * El prototipo conserva datos ficticios y no requiere sesión. Sólo se expone
 * en entornos donde se habilita explícitamente para revisarlo.
 */
export default function PrototypeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (process.env.ENABLE_PROTOTYPE !== "true") notFound();

  return children;
}
