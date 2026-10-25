import Image from "next/image";
import Link from "next/link";

export function CtaFinal() {
  return <section className="lp-seccion lp-banda--lila lp-final" aria-labelledby="lp-final-titulo">
    <div className="lp-wrap lp-final__inner">
      <h2 id="lp-final-titulo">Cargue su primera propiedad hoy.</h2>
      <div className="lp-final__accion">
        <p>Es gratis y no le pedimos tarjeta.</p>
        <Link href="/registro" className="owner-button lp-cta">Crear cuenta gratis</Link>
      </div>
    </div>
  </section>;
}

export function Pie() {
  return <footer className="lp-pie">
    <div className="lp-wrap">
      <div className="lp-pie__arriba">
        <div className="lp-pie__marca">
          <Image src="/logos/lockup.svg" alt="Alquia" width={360} height={160} className="lp-pie__logo" />
          <p>Sus alquileres, en orden y a la vista.</p>
        </div>
        <nav aria-label="Producto" className="lp-pie__columna">
          <p>Producto</p>
          <a href="#como-funciona" className="lp-link lp-link--tinta">Cómo funciona</a>
          <a href="#preguntas" className="lp-link lp-link--tinta">Preguntas frecuentes</a>
        </nav>
        <nav aria-label="Cuenta" className="lp-pie__columna">
          <p>Cuenta</p>
          <Link href="/login" className="lp-link lp-link--tinta">Ingresar</Link>
          <Link href="/registro" className="lp-link lp-link--tinta">Crear cuenta gratis</Link>
        </nav>
      </div>
      <p className="lp-pie__legal">© 2026 Alquia. Plataforma de gestión de alquileres.</p>
    </div>
  </footer>;
}
