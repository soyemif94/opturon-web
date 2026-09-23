"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu, Orbit, X } from "lucide-react";

const links = [
  { href: "/#producto", label: "Producto" },
  { href: "/#distribuidoras", label: "Distribuidoras" },
  { href: "/#automatizacion", label: "Automatización" },
  { href: "/demo", label: "Demo" }
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080d14]/88 backdrop-blur-xl">
      <div className="container-opt">
        <div className="flex h-[4.5rem] items-center justify-between gap-5">
          <Link href="/" className="inline-flex items-center gap-2.5 font-semibold tracking-[-0.02em] text-white" aria-label="Opturon, inicio">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-[0_10px_28px_rgba(249,115,22,0.22)]">
              <Orbit className="h-4.5 w-4.5" />
            </span>
            <span className="text-lg">Opturon</span>
          </Link>

          <nav className="hidden items-center gap-1 text-sm text-slate-400 lg:flex" aria-label="Navegación principal">
            {links.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <Link href="/app" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">Ingresar</Link>
            <Link href="/contacto" className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
              Solicitar demo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <button type="button" onClick={() => setMobileOpen((open) => !open)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white sm:hidden" aria-expanded={mobileOpen} aria-controls="mobile-navigation" aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}>
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        {mobileOpen ? (
          <nav id="mobile-navigation" className="space-y-1 border-t border-white/10 py-4 sm:hidden" aria-label="Navegación móvil">
            {links.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-3 text-sm text-slate-200 transition hover:bg-white/5">{item.label}</Link>
            ))}
            <Link href="/app" onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-3 text-sm text-slate-200">Ingresar</Link>
            <Link href="/contacto" onClick={() => setMobileOpen(false)} className="mt-2 flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white">Solicitar una demo</Link>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
