import Image from "next/image";
import Link from "next/link";

export default function Nav() {
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
    </div>
  </header>;
}
