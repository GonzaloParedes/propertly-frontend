"use client";

import Link from "next/link";
import ContractForm from "@/components/forms/ContractForm";

export default function NuevoContratoPage() {
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

      <h1 className="font-heading mb-1 text-[28px] font-bold">Alta de contrato</h1>
      <p className="mb-8 text-[16px]" style={{ color: "var(--text-2)" }}>
        Complete los datos del contrato de corrido. Si el inmueble no está cargado, puede crearlo sin salir de esta página.
      </p>

      <ContractForm />
    </div>
  );
}
