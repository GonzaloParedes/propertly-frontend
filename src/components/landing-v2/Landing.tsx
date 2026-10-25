import Nav from "./Nav";
import Hero from "./Hero";
import DejaDeHacer from "./DejaDeHacer";
import UnMes from "./UnMes";
import Momentos from "./Momentos";
import Empezar from "./Empezar";
import Preguntas from "./Preguntas";
import { CtaFinal, Pie } from "./Cierre";
import "./landing.css";
import "./landing-scroll.css";

/**
 * Landing de `/`. Lo que se ve avanza con el scroll, al estilo de las páginas
 * de producto de Apple (landing-scroll.css). Sin soporte o con movimiento
 * reducido, se ve estática.
 */
export default function Landing() {
  return <div className="lp lp--scroll">
    <Nav />
    <main>
      <Hero />
      <DejaDeHacer />
      <UnMes />
      <Momentos />
      <Empezar />
      <Preguntas />
      <CtaFinal />
    </main>
    <Pie />
  </div>;
}
