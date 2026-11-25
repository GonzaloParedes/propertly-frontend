"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { AlquiaBackendClient } from "@/lib/backend-client";
import { contarCuotasPendientes } from "@/lib/cobranzas";
import { Icon, type IconName } from "@/components/ui/Icon";
import { abrirTutorial } from "@/lib/tutorial";
import { abrirReporte } from "@/lib/reportes";
import { PanelLeft } from "lucide-react";
import { HERRAMIENTAS, RUTA_HERRAMIENTAS, type Herramienta } from "./herramientas-catalogo";

const NAV_COLLAPSED_KEY = "owner-nav-collapsed";

/** Tocar el ítem de la pantalla actual no remonta la página: el workspace escucha esto para volver al listado. */
export const NAV_RESET_EVENT = "alquia:nav-reset";

export type WorkspaceView = "inicio" | "propiedades" | "contratos" | "cobranzas" | "inquilinos" | "herramientas" | "configuracion";

type NavigationItem = { label: string; href: string; view: WorkspaceView; icon: IconName };

const PORTFOLIO_ITEMS: readonly NavigationItem[] = [
  { label: "Inicio", href: "/dashboard", view: "inicio", icon: "home" },
  { label: "Propiedades", href: "/dashboard/propiedades", view: "propiedades", icon: "building" },
  { label: "Contratos", href: "/dashboard/contratos", view: "contratos", icon: "file" },
  { label: "Inquilinos", href: "/dashboard/inquilinos", view: "inquilinos", icon: "users" },
  { label: "Cobranzas", href: "/dashboard/cobranzas", view: "cobranzas", icon: "card" },
];

const SETTINGS_ITEM: NavigationItem = { label: "Configuración", href: "/dashboard/configuracion", view: "configuracion", icon: "settings" };

const anclaDe: Partial<Record<WorkspaceView, string>> = {
  propiedades: "propiedad",
  inquilinos: "inquilino",
  contratos: "contrato",
};

interface DashboardNavProps {
  activeView?: WorkspaceView;
  tool?: Herramienta;
  onNavigate?: (view: WorkspaceView, tool?: Herramienta) => void;
}

export default function DashboardNav({ activeView, tool, onNavigate }: Readonly<DashboardNavProps>) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { theme } = useTheme();
  // El lockup claro no contrasta sobre la barra oscura: en modo oscuro va la
  // variante preparada para fondos oscuros.
  const logoSrc = theme === "dark" ? "/logos/lockup-oscuro.svg" : "/logos/lockup.svg";
  const isotipoSrc = theme === "dark" ? "/logos/isotipo-blanco.svg" : "/logos/isotipo.svg";
  // Sin sesión —el prototipo de /prototipo, o el instante previo a que
  // resuelva /users/me— la cuenta se nombra en genérico en vez de inventar
  // un titular.
  const nombre = user ? `${user.firstName} ${user.lastName}` : "Su cuenta";
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const [desktopToolsOpen, setDesktopToolsOpen] = useState(() => isCurrent(RUTA_HERRAMIENTAS, "herramientas"));
  const [mobileDisclosure, setMobileDisclosure] = useState<"tools" | "account" | null>(null);
  const accountOpen = mobileDisclosure === "account";
  const [pendientes, setPendientes] = useState(0);
  // Lo que eligió el usuario en esta sesión; mientras no toque el botón, manda lo guardado.
  // Leerlo con useSyncExternalStore evita el setState dentro de un efecto y el desajuste
  // de hidratación: en el servidor siempre arranca expandido.
  const [collapsedElegido, setCollapsedElegido] = useState<boolean | null>(null);
  const collapsedGuardado = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return localStorage.getItem(NAV_COLLAPSED_KEY) === "true";
      } catch {
        // La barra sigue disponible aunque el navegador bloquee la preferencia.
        return false;
      }
    },
    () => false
  );
  const collapsed = collapsedElegido ?? collapsedGuardado;

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
    if (collapsed) {
      document.body.dataset.navCollapsed = "";
    } else {
      delete document.body.dataset.navCollapsed;
    }
    return () => { delete document.body.dataset.navCollapsed; };
  }, [collapsed]);

  useEffect(() => {
    if (!open) return;
    const mobileLayout = window.matchMedia("(max-width: 900px)");
    function closeAtDesktop(event: MediaQueryListEvent) {
      if (!event.matches) drawerRef.current?.close();
    }
    mobileLayout.addEventListener("change", closeAtDesktop);
    return () => mobileLayout.removeEventListener("change", closeAtDesktop);
  }, [open]);

  const toolsActive = isCurrent(RUTA_HERRAMIENTAS, "herramientas");

  function changeSidebarCollapse(next: boolean) {
    setCollapsedElegido(next);
    try {
      localStorage.setItem(NAV_COLLAPSED_KEY, String(next));
    } catch {
      // El cambio se conserva durante esta sesión.
    }
  }

  function openDrawer() {
    setMobileDisclosure(toolsActive ? "tools" : null);
    drawerRef.current?.showModal();
    setOpen(true);
  }

  function closeDrawer() {
    const drawer = drawerRef.current;
    if (drawer?.open) drawer.close();
    setOpen(false);
  }

  function isCurrent(href: string, view: WorkspaceView) {
    if (activeView) return activeView === view;
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleNavigation(view: WorkspaceView, herramienta?: Herramienta) {
    closeDrawer();
    if (view !== "herramientas") setDesktopToolsOpen(false);
    window.dispatchEvent(new Event(NAV_RESET_EVENT));
    onNavigate?.(view, herramienta);
  }

  function goHome(event: MouseEvent<HTMLAnchorElement>) {
    if (onNavigate) event.preventDefault();
    handleNavigation("inicio");
  }

  function navigationItem(item: NavigationItem, herramienta?: Herramienta) {
    const current = herramienta
      ? (activeView ? toolsActive && herramienta === tool : pathname === item.href)
      : isCurrent(item.href, item.view);
    const badge = badgeDe(item.view);
    const content = <>
      <Icon name={item.icon} />
      <span>{item.label}</span>
      {badge && <span className="owner-nav__badge">{badge}</span>}
    </>;
    const props = {
      "aria-current": current ? "page" as const : undefined,
      "data-tutorial": anclaDe[item.view],
      className: "owner-nav__link",
      title: item.label,
    };

    return <li key={item.href}>
      {onNavigate ? (
        <button {...props} type="button" onClick={() => handleNavigation(item.view, herramienta)}>
          {content}
        </button>
      ) : (
        <Link {...props} href={item.href} onClick={() => handleNavigation(item.view, herramienta)}>
          {content}
        </Link>
      )}
    </li>;
  }

  function toolsMenu(mobile: boolean) {
    const expanded = mobile ? mobileDisclosure === "tools" : desktopToolsOpen && !collapsed;
    const id = mobile ? "owner-mobile-tools" : "owner-desktop-tools";

    return <li>
      <button
        type="button"
        className="owner-nav__link owner-nav__disclosure"
        title="Herramientas"
        aria-expanded={expanded}
        aria-controls={id}
        data-current={toolsActive || undefined}
        onClick={() => {
          if (mobile) setMobileDisclosure(expanded ? null : "tools");
          else {
            if (collapsed) changeSidebarCollapse(false);
            setDesktopToolsOpen(!expanded);
          }
        }}
      >
        <Icon name="tools" /><span>Herramientas</span>
      </button>
      <ul id={id} className="owner-nav__sublist" hidden={!expanded}>
        {HERRAMIENTAS.map(({ id, titulo, icono }) => navigationItem({
          label: titulo,
          href: `${RUTA_HERRAMIENTAS}/${id}`,
          view: "herramientas",
          icon: icono,
        }, id))}
      </ul>
    </li>;
  }

  const tutorial = <button type="button" title="Ver tutorial" className="owner-nav__link" aria-haspopup="dialog"
    onClick={() => { closeDrawer(); abrirTutorial(); }}><Icon name="help" /><span>Ver tutorial</span></button>;

  const report = <button type="button" title="Reportar un problema" className="owner-nav__link owner-nav__reporte" aria-haspopup="dialog"
    onClick={() => { closeDrawer(); abrirReporte(); }}><Icon name="report" /><span>Reportar un problema</span></button>;

  const logoutButton = <button type="button" title="Cerrar sesión" className="owner-nav__logout"
    onClick={() => { closeDrawer(); void logout(); }}><Icon name="logout" /><span>Cerrar sesión</span></button>;

  return (
    <>
      <header className="owner-mobile-header">
        <button type="button" className="owner-icon-button" aria-label="Abrir menú" aria-expanded={open} aria-controls="owner-mobile-drawer" aria-haspopup="dialog" onClick={openDrawer}><Icon name="menu" size={24} /></button>
        <Link href="/dashboard" onClick={goHome} aria-label="Alquia, inicio"><Image src={logoSrc} alt="Alquia" width={124} height={40} priority /></Link>
      </header>
      <aside className="owner-nav" aria-label="Navegación principal">
        <header className="owner-nav__header">
          <Link href="/dashboard" onClick={goHome} aria-label="Alquia, inicio" className="owner-nav__brand">
            <span className="owner-nav__brand-lockup"><Image src={logoSrc} alt="Alquia" width={124} height={29} priority /></span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className="owner-nav__brand-isotipo"><img src={isotipoSrc} alt="Alquia" aria-hidden="true" /></span>
          </Link>
          <button
            type="button"
            className="owner-icon-button owner-nav__toggle"
            aria-expanded={!collapsed}
            aria-controls="owner-nav-links"
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            title={collapsed ? "Expandir menú" : "Contraer menú"}
            onClick={() => changeSidebarCollapse(!collapsed)}
          >
            <PanelLeft size={18} aria-hidden="true" />
          </button>
        </header>
        <nav className="owner-nav__body" aria-label="Secciones del panel">
          <p className="owner-nav__group">CARTERA</p>
          <ul id="owner-nav-links" className="owner-nav__links">
            {PORTFOLIO_ITEMS.map((item) => navigationItem(item))}
            {toolsMenu(false)}
            <li className="owner-nav__group">CUENTA</li>
            {navigationItem(SETTINGS_ITEM)}
            <li>{tutorial}</li>
          </ul>
        </nav>
        <div className="owner-nav__footer">
          <div className="owner-nav__profile" hidden={collapsed}>
            <strong>{nombre}</strong>
            {user && <small>{user.email}</small>}
          </div>
          {report}
          {logoutButton}
        </div>
      </aside>
      <dialog
        id="owner-mobile-drawer"
        ref={drawerRef}
        className="owner-drawer"
        aria-labelledby="owner-drawer-title"
        onCancel={(event) => { event.preventDefault(); closeDrawer(); }}
        onClose={(event) => { if (!event.currentTarget.open) setOpen(false); }}
        onClick={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}
      >
        <div className="owner-drawer__panel">
          <header className="owner-drawer__top">
            <h2 id="owner-drawer-title">Menú</h2>
            <button type="button" className="owner-icon-button" aria-label="Cerrar menú" onClick={closeDrawer}><Icon name="close" /></button>
          </header>
          <nav className="owner-drawer__body" aria-label="Secciones del panel">
            <ul className="owner-nav__links">
              {PORTFOLIO_ITEMS.map((item) => navigationItem(item))}
              {toolsMenu(true)}
            </ul>
            <div className="owner-drawer__account">
              <button type="button" className="owner-nav__link owner-nav__disclosure" aria-expanded={accountOpen}
                aria-controls="owner-mobile-account" onClick={() => setMobileDisclosure(accountOpen ? null : "account")}>
                <Icon name="users" /><span>Cuenta y ayuda</span>
              </button>
              <ul id="owner-mobile-account" className="owner-nav__sublist" hidden={!accountOpen}>
                {navigationItem(SETTINGS_ITEM)}
                <li>{tutorial}</li>
                <li>{report}</li>
                <li>{logoutButton}</li>
              </ul>
            </div>
          </nav>
        </div>
      </dialog>
    </>
  );
}
