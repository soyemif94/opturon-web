"use client";

import Link from "next/link";
import { useState } from "react";
import { Cpu, Menu, Sparkles, X } from "lucide-react";

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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="container-opt">
        <div className="rounded-2xl border border-white/10 bg-bg/78 px-4 shadow-[0_14px_42px_rgba(0,0,0,0.2)] backdrop-blur-xl md:px-5">
          <div className="flex h-[4.25rem] items-center justify-between md:h-[4.5rem]">
            <Link href="/" className="inline-flex items-center gap-2.5 font-semibold tracking-tight">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand/40 bg-brand/20 shadow-brand">
                <Cpu className="h-4 w-4 text-brandBright" />
              </span>
              <span className="inline-flex items-center gap-1.5">
                Opturon
                <Sparkles className="h-3.5 w-3.5 text-brandBright" />
              </span>
            </Link>
            <nav className="hidden items-center gap-2 text-sm text-muted md:flex">
              {links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 transition-colors duration-200 hover:bg-white/5 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-text md:hidden"
              aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
          {mobileOpen ? (
            <div className="border-t border-white/10 pb-4 pt-3 md:hidden">
              <nav className="space-y-2">
                {links.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-text"
                  >
                    <span>{item.label}</span>
                    {item.href === "/app" ? (
                      <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] text-brandBright">
                        Software
                      </span>
                    ) : null}
                  </Link>
                ))}
              </nav>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
