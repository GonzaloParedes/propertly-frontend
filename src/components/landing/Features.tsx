import Reveal from "./Reveal";
import FeatureCard from "./FeatureCard";

function PayIcon() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      <path d="M2.5 10h19" />
      <path d="M6 14.5h4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 9a6 6 0 10-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9z" />
      <path d="M10 20a2.2 2.2 0 004 0" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6.5A1.5 1.5 0 014.5 5h5l2 2.5H19.5A1.5 1.5 0 0121 9v9.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 18.5z" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: <PayIcon />,
    title: "Pagos al día",
    body: "Sabé al instante qué alquileres están pagos y cuáles no, sin revisar planillas ni llamar a nadie.",
  },
  {
    icon: <BellIcon />,
    title: "Avisos automáticos",
    body: "Recibí notificaciones antes de cada vencimiento para nunca perder un cobro por falta de seguimiento.",
  },
  {
    icon: <FolderIcon />,
    title: "Contratos seguros",
    body: "Guardá contratos y comprobantes en un solo lugar, cifrado y accesible desde cualquier dispositivo.",
  },
];

export default function Features() {
  return (
    <section
      className="px-6 py-20 sm:px-10"
      style={{ background: "var(--bg)" }}
    >
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-12 text-center">
          <h2
            className="text-[32px] font-bold tracking-[-0.01em]"
            style={{
              fontFamily: "var(--font-quicksand), system-ui, sans-serif",
              color: "var(--text)",
            }}
          >
            Todo en un solo lugar
          </h2>
          <p className="mt-3 text-[17px]" style={{ color: "var(--text-2)" }}>
            Diseñado para propietarios e inmobiliarias que quieren simplicidad, no más trabajo.
          </p>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 100}>
              <FeatureCard {...f} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
