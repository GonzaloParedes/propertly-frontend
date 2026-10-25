import { notFound } from "next/navigation";

/**
 * Página de ejemplo del asistente de Sentry. En producción no se expone:
 * GET /sentry-example-page responde 404 y no renderiza la UI de ejemplo.
 */
export default function SentryExampleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (process.env.NODE_ENV === "production") notFound();

  return children;
}
