import Link from "next/link";
import { PiezaInicio } from "./piezas";

export default function Hero() {
  return <section className="lp-hero" aria-labelledby="lp-hero-titulo">
    {/* En la variante con scroll, este bloque queda fijo mientras la tarjeta se abre. */}
    <div className="lp-hero__pin">
      <div className="lp-wrap lp-hero__grid">
        <div className="lp-hero__texto">
          <h1 id="lp-hero-titulo">Sus alquileres, <em>en orden y a la vista.</em></h1>
          <p>Vea qué cobró, qué vence y qué espera su confirmación en cada propiedad, sin planillas ni mensajes.</p>
          <div className="lp-hero__acciones">
            <Link href="/registro" className="owner-button lp-cta">Crear cuenta gratis</Link>
            <a href="#como-funciona" className="lp-link lp-link--claro">Ver cómo funciona</a>
          </div>
        </div>
        <PiezaInicio />
      </div>
    </div>
  </section>;
}
