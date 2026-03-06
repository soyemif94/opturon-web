import type { ReactNode } from "react";

export function InboxLayout({
  left,
  center,
  right
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="grid gap-4 xl:h-[calc(100vh-116px)] xl:min-h-[700px] xl:grid-cols-[360px_minmax(0,1fr)_340px]">
      <aside className="min-h-[280px] xl:min-h-0">{left}</aside>
      <main className="min-h-[420px] xl:min-h-0">{center}</main>
      <aside className="min-h-[280px] xl:min-h-0">{right}</aside>
    </div>
  );
}
