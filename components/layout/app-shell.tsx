import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/ui/cn";

const navItems = [
  { href: "/app/inbox", label: "Inbox" },
  { href: "/app/catalog", label: "Catálogo" },
  { href: "/app/faqs", label: "FAQ" },
  { href: "/app/business", label: "Negocio" },
  { href: "/app/users", label: "Usuarios" }
];

export function AppShell({
  children,
  tenantLabel,
  topbar
}: {
  children: React.ReactNode;
  tenantLabel?: string;
  topbar?: React.ReactNode;
}) {
  return (
    <section className="container-opt py-6">
      <div className="flex h-[calc(100vh-120px)] min-h-[680px] gap-6 overflow-hidden">
        <aside className="w-64 shrink-0 rounded-2xl border border-[color:var(--border)] bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Portal Cliente</p>
          <div className="mt-2">{tenantLabel ? <Badge variant="muted">{tenantLabel}</Badge> : null}</div>
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

