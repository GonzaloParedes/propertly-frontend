import type { Metadata, Viewport } from "next";
import { Quicksand, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Alquia | Gestión de alquileres",
  description: "Una mejor manera de gestionar tus alquileres.",
};

// Barra del navegador (móvil) siempre blanca — la landing es de tema claro
export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${quicksand.variable} ${nunitoSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
