import { cn } from "@/lib/cn";

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({
  direction,
  text,
  timestamp,
  optimistic
}: {
  direction: string;
  text: string;
  timestamp: string;
  optimistic?: boolean;
}) {
  const inbound = direction !== "outbound";

  return (
    <div
      className={cn(
        "max-w-[70%] rounded-2xl px-4 py-3 text-sm",
        inbound ? "border border-[color:var(--border)] bg-card" : "ml-auto bg-muted text-text",
        optimistic ? "animate-inbox-message" : ""
      )}
    >
      <p className="whitespace-pre-wrap">{text}</p>
      <p className="mt-1 text-[11px] text-muted">{formatTime(timestamp)}</p>
    </div>
  );
}
