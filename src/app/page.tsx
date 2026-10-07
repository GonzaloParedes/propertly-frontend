import type { Metadata } from "next";
import Landing from "@/components/landing-v2/Landing";

export const metadata: Metadata = {
  title: "Alquia | Sus alquileres, en orden y a la vista",
  description: "Vea qué cobró, qué vence y qué espera su confirmación en cada propiedad. Su inquilino sube el comprobante desde un enlace y usted lo confirma.",
};

export default function Home() {
  return <Landing />;
}
