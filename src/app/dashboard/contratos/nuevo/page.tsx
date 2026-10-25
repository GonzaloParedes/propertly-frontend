"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ContractForm from "@/components/forms/ContractForm";

export default function NuevoContratoPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-[15px] font-bold"
        style={{ color: "var(--primary)" }}
      >
        <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={2.5} />
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
