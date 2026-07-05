import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="px-6 py-8 sm:px-10"
      style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <Image
          src="/logos/lockup.svg"
          alt="Alquia"
          width={100}
          height={36}
          className="h-8 w-auto"
        />

        <p className="text-[14px]" style={{ color: "var(--text-2)" }}>
          © 2026 Alquia. Todos los derechos reservados.
        </p>

        <nav className="flex gap-5 text-[14px] font-bold" style={{ color: "var(--primary)" }}>
          <Link href="/login" className="hover:underline">Iniciar sesión</Link>
          <Link href="/registro" className="hover:underline">Crear cuenta</Link>
        </nav>
      </div>
    </footer>
  );
}
