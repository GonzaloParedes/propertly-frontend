import type { Metadata } from "next";
import PrototypeShell from "@/components/dashboard/PrototypeShell";

export const metadata: Metadata = {
  title: "Prototipo web | Alquia",
  description: "Prototipo navegable de la gestión de alquileres para propietarios.",
};

/**
 * Ruta de demostración sin autenticación. Usa datos ficticios para validar la
 * experiencia antes de conectar las pantallas al backend del MVP.
 */
export default function PrototypePage() {
  return <PrototypeShell />;
}
