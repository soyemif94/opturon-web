import Link from "next/link";
import { Cpu, Sparkles } from "lucide-react";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/casos", label: "Casos" },
  { href: "/blog", label: "Blog" },
  { href: "/quienes-somos", label: "Quienes Somos" },
  { href: "/contacto", label: "Contacto" },
  { href: "/app", label: "Ingresar" }
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-bg/75 backdrop-blur-xl">
      <div className="container-opt flex h-16 items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand/40 bg-brand/20 shadow-brand">
            <Cpu className="h-4 w-4 text-brandBright" />
          </span>
          <span className="inline-flex items-center gap-1">
            Opturon
            <Sparkles className="h-3.5 w-3.5 text-brandBright" />
          </span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted md:flex">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1 transition-colors duration-200 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
