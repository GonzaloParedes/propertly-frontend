import { Bell, CreditCard, Folder } from "lucide-react";
import Reveal from "./Reveal";
import FeatureCard from "./FeatureCard";

function PayIcon() {
  return <CreditCard className="size-6" color="var(--primary)" />;
}

function BellIcon() {
  return <Bell className="size-6" color="var(--primary)" />;
}

function FolderIcon() {
  return <Folder className="size-6" color="var(--primary)" />;
}

const FEATURES = [
  {
    icon: <PayIcon />,
    title: "Pagos al día",
    body: "Sepa al instante qué alquileres están pagos y cuáles no, sin revisar planillas ni llamar a nadie.",
  },
  {
    icon: <BellIcon />,
    title: "Avisos automáticos",
    body: "Reciba avisos antes de cada vencimiento para nunca perder un cobro por falta de seguimiento.",
  },
  {
    icon: <FolderIcon />,
    title: "Contratos seguros",
    body: "Guarde contratos y comprobantes en un solo lugar, cifrado y accesible desde cualquier dispositivo.",
  },
];

export default function Features() {
  return (
    <section
      className="px-6 py-20 sm:px-10"
      style={{ background: "linear-gradient(180deg, var(--bg) 0%, #ffffff 100%)" }}
    >
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-12 text-center">
          <h2
            className="font-heading text-[32px] font-bold tracking-[-0.01em]"
            style={{ color: "var(--text)" }}
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
