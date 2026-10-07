import { Icon } from "@/components/ui/Icon";

const PASOS = [
  "Cree su cuenta con su correo.",
  "Cargue una propiedad y su contrato.",
  "Comparta el enlace con su inquilino.",
] as const;

export default function Empezar() {
  return <section className="lp-seccion lp-banda--blanca lp-empezar" aria-labelledby="lp-empezar-titulo">
    <div className="lp-wrap">
      <h2 id="lp-empezar-titulo">Empezar lleva unos minutos.</h2>
      <ol className="lp-empezar__pasos">
        {PASOS.map((paso, indice) => <li key={paso}>
          {indice > 0 && <span className="lp-empezar__flecha" aria-hidden="true"><Icon name="arrow" size={20} /></span>}
          {paso}
        </li>)}
      </ol>
    </div>
  </section>;
}
