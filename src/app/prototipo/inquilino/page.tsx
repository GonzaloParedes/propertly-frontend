import type { Metadata } from "next";
import CalendarioInquilino from "./CalendarioInquilino";

export const metadata: Metadata = {
  title: "Prototipo de cuotas | Alquia",
  description: "Prototipo navegable del calendario de cuotas del inquilino.",
};

export default function PrototipoInquilinoPage() {
  return <CalendarioInquilino />;
}
