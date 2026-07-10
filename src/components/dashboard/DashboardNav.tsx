"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";

const PLACEHOLDER_ITEMS = ["Propiedades", "Pagos", "Configuración"];

function HamburgerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function DashboardNav() {
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function handleLogout() {
    setIsOpen(false);
    // No hace falta redirigir acá: al limpiar el usuario, el guard de
    // dashboard/layout.tsx detecta la sesión vacía y redirige a /login.
    void logout();
  }

  return (
    <>
      <header
        className="sticky top-0 z-40 flex items-center gap-3 border-b bg-white px-6 py-3.5 sm:px-10"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(true)}
          className="-ml-2 flex cursor-pointer items-center justify-center rounded-[10px] p-2 focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
          style={{ color: "var(--text)" }}
        >
          <HamburgerIcon />
        </button>

        <Link href="/dashboard" aria-label="Alquia — inicio" className="flex items-center">
          <Image
            src="/logos/lockup.svg"
            alt="Alquia"
            width={360}
            height={160}
            priority
            className="h-7 w-auto"
          />
        </Link>
      </header>

      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-300"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none" }}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      <nav
        aria-label="Menú principal"
        className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white p-6 transition-transform duration-300"
        style={{
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          boxShadow: "0 8px 30px rgba(30,27,46,0.15), 0 2px 8px rgba(30,27,46,0.08)",
        }}
      >
        <div className="mb-6 flex items-center justify-between">
          <Image src="/logos/isotipo.svg" alt="" aria-hidden="true" width={32} height={32} className="h-8 w-auto" />
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setIsOpen(false)}
            className="flex cursor-pointer items-center justify-center rounded-[10px] p-2 focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
            style={{ color: "var(--text-2)" }}
          >
            <CloseIcon />
          </button>
        </div>

        <ul className="flex flex-col gap-1">
          <li>
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="block rounded-[10px] px-3 py-2.5 text-[16px] font-bold transition-colors hover:bg-[var(--bg)]"
              style={{ color: "var(--text)" }}
            >
              Inicio
            </Link>
          </li>
          {PLACEHOLDER_ITEMS.map((item) => (
            <li key={item}>
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center justify-between rounded-[10px] px-3 py-2.5 text-[16px] font-bold opacity-60"
                style={{ color: "var(--text)" }}
              >
                {item}
                <span className="text-[13px] font-normal" style={{ color: "var(--text-2)" }}>
                  Próximamente
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-auto border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[16px] font-bold transition-colors hover:bg-[var(--bg)] focus-visible:outline-[3px] focus-visible:outline-[var(--primary-soft)]"
            style={{ color: "var(--text)" }}
          >
            <LogoutIcon />
            Cerrar sesión
          </button>
        </div>
      </nav>
    </>
  );
}
