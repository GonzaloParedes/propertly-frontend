"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { AlquiaBackendClient } from "@/lib/backend-client";
import { contarCuotasPendientes } from "@/lib/cobranzas";
import { Icon } from "@/components/ui/Icon";

/** Tocar el ítem de la pantalla actual no remonta la página: el workspace escucha esto para volver al listado. */
export const NAV_RESET_EVENT = "alquia:nav-reset";

export type WorkspaceView = "inicio" | "propiedades" | "contratos" | "cobranzas" | "inquilinos" | "configuracion";

const ITEMS = [
  { label: "Inicio", href: "/dashboard", view: "inicio" as const, icon: "home" as const },
  { label: "Propiedades", href: "/dashboard/propiedades", view: "propiedades" as const, icon: "building" as const },
  { label: "Contratos", href: "/dashboard/contratos", view: "contratos" as const, icon: "file" as const },
  { label: "Inquilinos", href: "/dashboard/inquilinos", view: "inquilinos" as const, icon: "users" as const },
  { label: "Cobranzas", href: "/dashboard/cobranzas", view: "cobranzas" as const, icon: "card" as const },
  { label: "Configuración", href: "/dashboard/configuracion", view: "configuracion" as const, icon: "settings" as const },
];

interface DashboardNavProps {
  activeView?: WorkspaceView;
  onNavigate?: (view: WorkspaceView) => void;
}

export default function DashboardNav({ activeView, onNavigate }: Readonly<DashboardNavProps>) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  // Sin sesión —el prototipo de /prototipo, o el instante previo a que
  // resuelva /users/me— la cuenta se nombra en genérico en vez de inventar
  // un titular.
  const nombre = user ? `${user.firstName} ${user.lastName}` : "Su cuenta";
  const iniciales = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() : "";
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [pendientes, setPendientes] = useState(0);

  // Sólo con sesión real y dentro de /dashboard: el prototipo no tiene backend.
  // Se recuenta al cambiar de pantalla, que es cuando el propietario pudo
  // haber resuelto algo.
  const hayUsuario = Boolean(user);
  useEffect(() => {
    if (!hayUsuario || onNavigate) return;
    let vigente = true;
    AlquiaBackendClient.invoices.list()
      .then((invoices) => vigente && setPendientes(contarCuotasPendientes(invoices)))
      .catch(() => vigente && setPendientes(0));
    return () => { vigente = false; };
  }, [hayUsuario, onNavigate, pathname]);

  const badgeDe = (view: WorkspaceView) => (view === "cobranzas" && pendientes > 0 ? String(pendientes) : undefined);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function isCurrent(href: string, view: WorkspaceView) {
    if (activeView) return activeView === view;
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  const navigation = () => (
    <ul className="owner-nav__links">
      {ITEMS.flatMap((item) => {
        const link = (
          <li key={item.href}>
          {onNavigate ? (
            <button type="button" onClick={() => { onNavigate(item.view); setOpen(false); }} aria-current={isCurrent(item.href, item.view) ? "page" : undefined} className="owner-nav__link">
              <Icon name={item.icon} /><span>{item.label}</span>{badgeDe(item.view) && <span className="owner-nav__badge">{badgeDe(item.view)}</span>}
            </button>
          ) : (
            <Link href={item.href} onClick={() => { setOpen(false); window.dispatchEvent(new Event(NAV_RESET_EVENT)); }} aria-current={isCurrent(item.href, item.view) ? "page" : undefined} className="owner-nav__link">
              <Icon name={item.icon} /><span>{item.label}</span>{badgeDe(item.view) && <span className="owner-nav__badge">{badgeDe(item.view)}</span>}
            </Link>
          )}
          </li>
        );
        return item.view === "configuracion"
          ? [<li className="owner-nav__group" key="account-group">CUENTA</li>, link]
          : [link];
      })}
    </ul>
  );

  return (
    <>
      <header className="owner-mobile-header">
        <button type="button" className="owner-icon-button" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(true)}><Icon name="menu" size={24} /></button>
        <Link href="/dashboard" aria-label="Alquia, inicio"><Image src="/logos/lockup.svg" alt="Alquia" width={124} height={40} priority /></Link>
        <span className="owner-avatar" aria-label={nombre}>{iniciales}</span>
      </header>
      <aside className="owner-nav" aria-label="Navegación principal">
        <Link href="/dashboard" aria-label="Alquia, inicio" className="owner-nav__brand"><Image src="/logos/lockup.svg" alt="Alquia" width={124} height={40} priority /></Link>
        <p className="owner-nav__group">CARTERA</p>
        {navigation()}
        <div className="owner-nav__profile">
          <span className="owner-avatar" aria-hidden="true">{iniciales}</span>
          <span><strong>{nombre}</strong>{user && <small>{user.email}</small>}</span>
        </div>
        <button type="button" className="owner-nav__logout" onClick={() => void logout()}><Icon name="logout" /><span>Cerrar sesión</span></button>
      </aside>
      <div className="owner-drawer-backdrop" data-open={open || undefined} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className="owner-drawer" data-open={open || undefined} aria-label="Menú principal">
        <div className="owner-drawer__top"><Image src="/logos/lockup.svg" alt="Alquia" width={124} height={40} /><button ref={closeRef} type="button" className="owner-icon-button" aria-label="Cerrar menú" onClick={() => setOpen(false)}><Icon name="close" /></button></div>
        <p className="owner-nav__group">CARTERA</p>
        {navigation()}
        <button type="button" className="owner-nav__logout" onClick={() => void logout()}><Icon name="logout" /><span>Cerrar sesión</span></button>
      </aside>
    </>
  );
}
