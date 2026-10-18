"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

// Mismo corte que oculta los links del header en landing.css.
const CORTE_MENU = "(max-width: 900px)";
const FOCUSABLE = "a[href], button:not([disabled])";

export default function Nav() {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    document.body.style.overflow = "hidden";
    // El menú sólo existe en celular: si la ventana se ensancha, se cierra y suelta el scroll.
    const enCelular = window.matchMedia(CORTE_MENU);
    const alCambiarCorte = () => { if (!enCelular.matches) setAbierto(false); };
    enCelular.addEventListener("change", alCambiarCorte);

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      // El foco da la vuelta entre el botón (que cierra) y los links del panel.
      const items = [boton.current, ...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
        .filter((el): el is HTMLElement => el !== null);
      const primero = items[0];
      const ultimo = items[items.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", alTeclear);

    return () => {
      document.body.style.overflow = "";
      enCelular.removeEventListener("change", alCambiarCorte);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  return <header className="lp-nav">
    <div className="lp-wrap lp-nav__inner">
      <Link href="/" aria-label="Alquia, inicio" className="lp-nav__logo">
        <Image src="/logos/lockup.svg" alt="Alquia" width={360} height={160} priority />
      </Link>
      <nav className="lp-nav__secciones" aria-label="Secciones">
        <a href="#como-funciona" className="lp-link lp-link--tinta">Cómo funciona</a>
        <a href="#preguntas" className="lp-link lp-link--tinta">Preguntas frecuentes</a>
      </nav>
      <nav className="lp-nav__links" aria-label="Cuenta">
        <Link href="/login" className="lp-link">Ingresar</Link>
        <Link href="/registro" className="owner-button lp-nav__cta">Crear cuenta gratis</Link>
      </nav>
      <button
        ref={boton}
        type="button"
        className="lp-nav__menu"
        aria-expanded={abierto}
        aria-controls="lp-menu"
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setAbierto((v) => !v)}
      >
        {abierto ? <X aria-hidden="true" size={26} /> : <Menu aria-hidden="true" size={26} />}
      </button>
    </div>
    <div
      ref={panel}
      id="lp-menu"
      className="lp-menu"
      hidden={!abierto}
      // Tocar cualquier link cierra el menú: las anclas no recargan la página y se quedaría tapándola.
      onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setAbierto(false); }}
    >
      <nav aria-label="Menú" className="lp-wrap lp-menu__lista">
        <a href="#como-funciona" className="lp-menu__link">Cómo funciona</a>
        <a href="#preguntas" className="lp-menu__link">Preguntas frecuentes</a>
        <Link href="/login" className="lp-menu__link">Ingresar</Link>
        <Link href="/registro" className="owner-button lp-menu__cta">Crear cuenta gratis</Link>
      </nav>
    </div>
  </header>;
}
