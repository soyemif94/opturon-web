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
    <div className="overflow-x-auto pb-1">
      <div className="grid min-w-[1240px] grid-cols-[360px_minmax(560px,1fr)_320px] items-stretch gap-4 xl:h-[calc(100vh-116px)] xl:min-h-[700px]">
        <aside className="min-h-[280px] min-w-0 overflow-hidden xl:min-h-0">{left}</aside>
        <main className="min-h-[420px] min-w-0 overflow-hidden xl:min-h-0">{center}</main>
        <aside className="min-h-[280px] min-w-0 overflow-hidden xl:min-h-0">{right}</aside>
      </div>
    </div>
  );
}
