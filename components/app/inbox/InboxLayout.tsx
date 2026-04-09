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
    <div className="h-full min-h-0 overflow-x-auto pb-1">
      <div className="grid h-full min-h-0 min-w-[1180px] grid-cols-[344px_minmax(540px,1fr)_300px] items-stretch gap-3 xl:min-h-0">
        <aside className="flex min-h-[280px] min-w-0 flex-col overflow-hidden xl:min-h-0">{left}</aside>
        <main className="flex min-h-[420px] min-w-0 flex-col overflow-hidden xl:min-h-0">{center}</main>
        <aside className="flex min-h-[280px] min-w-0 flex-col overflow-hidden xl:min-h-0">{right}</aside>
      </div>
    </div>
  );
}
