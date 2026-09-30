import { Suspense } from "react";
import type { Metadata } from "next";
import TenantPortal from "./TenantPortal";

export const metadata: Metadata = {
  title: "Sus cuotas | Alquia",
  description: "Vea el estado de sus cuotas y suba su comprobante de pago.",
};

/**
 * Ruta pública: no pasa por el `layout.tsx` de `dashboard/`, que redirige sin
 * sesión de propietario — el inquilino no tiene una. La sesión es la cookie
 * `tenant_access_token`, ajena a la del propietario.
 *
 * `Suspense` es requisito de Next para `useSearchParams` en el App Router: sin
 * él, la build estática falla.
 */
export default function TenantPortalPage() {
  return (
    <Suspense fallback={<main className="tenant-portal tenant-portal--centrado" />}>
      <TenantPortal />
    </Suspense>
  );
}
