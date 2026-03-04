import Link from "next/link";
import { cn } from "@/lib/ui/cn";

const navItems = [
  { href: "/ops", label: "Dashboard" },
  { href: "/ops/tenants", label: "Clientes" },
  { href: "/ops/tenants?tab=activity", label: "Actividad" },
  { href: "/ops/tenants?tab=users", label: "Usuarios" }
];

export function OpsShell({ children, topbar }: { children: React.ReactNode; topbar?: React.ReactNode }) {
  return (
    <section className="container-opt py-6">
      <div className="flex h-[calc(100vh-120px)] min-h-[680px] gap-6 overflow-hidden">
        <aside className="w-64 shrink-0 rounded-2xl border border-[color:var(--border)] bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Opturon Ops</p>
          <nav className="mt-6 space-y-2 text-sm">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={cn("block rounded-xl px-3 py-2 text-muted transition-colors hover:bg-muted/50 hover:text-text")}>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-surface">
          {topbar ? <header className="border-b border-[color:var(--border)] p-4">{topbar}</header> : null}
          <main className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </section>
  );
}

