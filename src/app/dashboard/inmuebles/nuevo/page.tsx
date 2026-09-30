"use client";

import Link from "next/link";
import PropertyForm from "@/components/forms/PropertyForm";

export default function NuevoInmueblePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-[15px] font-bold"
        style={{ color: "var(--primary)" }}
      >
        <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Volver al panel
      </Link>

      <h1 className="font-heading mb-1 text-[28px] font-bold">Alta de inmueble</h1>
      <p className="mb-1 text-[16px]" style={{ color: "var(--text-2)" }}>
        Complete los datos del inmueble. Puede cargar todo de corrido, no hace falta pasar por pasos.
      </p>
      <Link href="/dashboard/inmuebles/nuevo-carousel" className="mb-8 inline-block text-[14px] font-bold underline" style={{ color: "var(--primary)" }}>
        Probar versión carousel
      </Link>

      <PropertyForm
        mode="page"
        onSuccess={() => {
          // La confirmación y los próximos pasos se muestran dentro del propio
          // PropertyForm (mode="page" activa su estado de éxito interno).
        }}
      />
    </div>
  );
}
