import Link from "next/link";

const links = [
  ["/bot/inbox", "Inbox"],
  ["/bot/settings", "Settings"],
  ["/bot/metrics", "Metrics"],
  ["/bot/logs", "Logs"]
];

export default function BotLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="container-opt py-10">
      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg border border-[color:var(--border)] bg-surface px-3 py-2 text-muted hover:text-text">
            {label}
          </Link>
        ))}
      </div>
      {children}
    </section>
  );
}
