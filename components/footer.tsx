import Link from "next/link";
import { Orbit } from "lucide-react";

const columns = [
  {
    title: "Plataforma",
    links: [["Producto", "/#producto"], ["Distribuidoras", "/#distribuidoras"], ["Automatización", "/#automatizacion"], ["Demo", "/demo"]]
  },
  {
    title: "Opturon",
    links: [["Contacto", "/contacto"], ["Blog", "/blog"], ["Ingresar", "/app"]]
  }
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#080d14] text-white">
      <div className="container-opt grid gap-12 py-14 md:grid-cols-[1.4fr_2fr] md:py-16">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5 font-semibold tracking-tight" aria-label="Opturon, inicio">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500"><Orbit className="h-4.5 w-4.5" /></span>
            <span className="text-lg">Opturon</span>
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">La plataforma que conecta conversaciones, ventas y operación para que tu equipo trabaje con el mismo contexto.</p>
        </div>
        <div className="grid grid-cols-2 gap-8">
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{column.title}</p>
              <ul className="mt-4 space-y-3">
                {column.links.map(([label, href]) => <li key={href}><Link href={href} className="text-sm text-slate-400 transition hover:text-white">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-opt flex flex-col gap-2 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Opturon. Todos los derechos reservados.</p>
          <p>Software para conectar tu operación comercial.</p>
        </div>
      </div>
    </footer>
  );
}
