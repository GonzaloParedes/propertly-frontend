"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";

type IconName = "home" | "building" | "file" | "card" | "users" | "settings" | "menu" | "close" | "logout";
export type WorkspaceView = "inicio" | "propiedades" | "contratos" | "cobranzas" | "inquilinos" | "configuracion";

function Icon({ name, size = 21 }: { name: IconName; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5.5 9.5V21h13V9.5M10 21v-5h4v5" /></>,
    building: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M9 15.5h2M13 15.5h2M10 21v-2.5h4V21" /></>,
    file: <><path d="M6 2.5h8l4 4V21.5H6z" /><path d="M14 2.5v4h4M9 12h6M9 16h6" /></>,
    card: <><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" /><path d="M2.5 10h19M6 14.5h4" /></>,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.2a3.5 3.5 0 0 1 0 5.6M17.5 14.4a6.5 6.5 0 0 1 4 5.6" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.1 2.1-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55v.1h-3v-.1A1.7 1.7 0 0 0 10.7 18.6a1.7 1.7 0 0 0-1.88.34l-.06.06-2.1-2.1.06-.06A1.7 1.7 0 0 0 7.06 15 1.7 1.7 0 0 0 5.5 14H5.4v-3h.1a1.7 1.7 0 0 0 1.56-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.1-2.1.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.55v-.1h3v.1a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.1 2.1-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.56 1h.1v3h-.1A1.7 1.7 0 0 0 19.4 15Z" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" {...common}>{paths[name]}</svg>;
}

const ITEMS = [
  { label: "Inicio", href: "/dashboard", view: "inicio" as const, icon: "home" as const },
  { label: "Propiedades", href: "/dashboard/propiedades", view: "propiedades" as const, icon: "building" as const },
  { label: "Contratos", href: "/dashboard/contratos", view: "contratos" as const, icon: "file" as const },
  { label: "Inquilinos", href: "/dashboard/inquilinos", view: "inquilinos" as const, icon: "users" as const },
  { label: "Cobranzas", href: "/dashboard/cobranzas", view: "cobranzas" as const, icon: "card" as const, badge: "3" },
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

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function isCurrent(href: string, view: WorkspaceView) {
    return activeView ? activeView === view : href === "/dashboard" ? pathname === href : pathname.startsWith(href);
  }

  const navigation = () => (
    <ul className="owner-nav__links">
      {ITEMS.map((item) => (
        <Fragment key={item.href}>
          {item.view === "configuracion" && <li className="owner-nav__group" key="account-group">CUENTA</li>}
          <li>
          {onNavigate ? (
            <button type="button" onClick={() => { onNavigate(item.view); setOpen(false); }} aria-current={isCurrent(item.href, item.view) ? "page" : undefined} className="owner-nav__link">
              <Icon name={item.icon} /><span>{item.label}</span>{item.badge && <span className="owner-nav__badge">{item.badge}</span>}
            </button>
          ) : (
            <Link href={item.href} onClick={() => setOpen(false)} aria-current={isCurrent(item.href, item.view) ? "page" : undefined} className="owner-nav__link">
              <Icon name={item.icon} /><span>{item.label}</span>{item.badge && <span className="owner-nav__badge">{item.badge}</span>}
            </Link>
          )}
          </li>
        </Fragment>
      ))}
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
