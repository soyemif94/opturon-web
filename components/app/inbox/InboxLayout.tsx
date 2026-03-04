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
    <div className="flex h-[calc(100vh-64px)] min-h-[640px] gap-4 text-sm">
      <aside className="w-[360px] shrink-0">{left}</aside>
      <main className="min-w-0 flex-1">{center}</main>
      <aside className="w-[380px] shrink-0">{right}</aside>
    </div>
  );
}
