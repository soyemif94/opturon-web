import Link from "next/link";
import { Cpu } from "lucide-react";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/quienes-somos", label: "Quiénes Somos" },
  { href: "/contacto", label: "Contacto" },
  { href: "/bot/inbox", label: "Bot" }
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-bg/75 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="container-opt flex h-16 items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand/40 bg-brand/20">
            <Cpu className="h-4 w-4 text-brandBright" />
          </span>
          <span>Opturon</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors duration-200 hover:text-text">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
