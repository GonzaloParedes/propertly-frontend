import {
  Archive,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  Clock,
  Copy,
  CreditCard,
  Download,
  FileText,
  Home,
  Link2,
  LogOut,
  Menu,
  Minus,
  Paperclip,
  Pencil,
  Plus,
  Receipt,
  Search,
  Settings,
  SlidersHorizontal,
  TrendingUp,
  TriangleAlert,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

/**
 * Íconos de la app. Antes eran `<path>` SVG dibujados a mano (ALQ-26: "parecen
 * hechos por IA"); ahora son glifos de Lucide. Este componente mantiene la API
 * por nombre que ya usaban los call sites y centraliza los defaults a preservar:
 * tamaño 21, `aria-hidden` (los íconos son decorativos, el texto los acompaña) y
 * color heredado por `currentColor` —que es como los colorea el CSS existente—.
 *
 * Lucide usa por defecto viewBox 0 0 24 24, strokeWidth 2 y caps/joins redondos,
 * que es exactamente la convención que tenían los SVG a mano.
 */
const MAP = {
  home: Home,
  building: Building2,
  file: FileText,
  card: CreditCard,
  users: Users,
  settings: Settings,
  menu: Menu,
  close: X,
  x: X,
  logout: LogOut,
  search: Search,
  sliders: SlidersHorizontal,
  plus: Plus,
  minus: Minus,
  check: Check,
  clock: Clock,
  alert: TriangleAlert,
  arrow: ArrowRight,
  link: Link2,
  download: Download,
  edit: Pencil,
  archive: Archive,
  receipt: Receipt,
  calendar: Calendar,
  trend: TrendingUp,
  paperclip: Paperclip,
  copy: Copy,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof MAP;

export function Icon({ name, size = 21 }: Readonly<{ name: IconName; size?: number }>) {
  const Glyph = MAP[name];
  return <Glyph size={size} aria-hidden="true" />;
}
