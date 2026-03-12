import { Bot, UserRound } from "lucide-react";
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
  const outbound = direction === "outbound";
  const system = direction === "system";

  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start", system ? "justify-center" : "")}>
      <div
        className={cn(
          "max-w-[76%] rounded-[24px] px-4 py-3 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.12)]",
          outbound && "bg-[linear-gradient(135deg,rgba(192,80,0,0.24),rgba(176,80,0,0.14))] text-text",
          !outbound && !system && "border border-[color:var(--border)] bg-card/90 text-text",
          system && "max-w-[82%] border bg-[color:var(--inbox-system-bubble-bg)] text-[color:var(--inbox-system-bubble-text)]",
          optimistic ? "animate-inbox-message" : ""
        )}
        style={system ? { borderColor: "var(--inbox-system-bubble-border)" } : undefined}
      >
        <div
          className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted"
          style={system ? { color: "var(--inbox-system-bubble-muted)" } : undefined}
        >
          {outbound ? <UserRound className="h-3.5 w-3.5" /> : system ? <Bot className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
          <span>{outbound ? "Humano" : system ? "Evento del bot" : "Contacto"}</span>
        </div>
        <p className="whitespace-pre-wrap leading-6">{text}</p>
        <p className="mt-2 text-[11px] text-muted" style={system ? { color: "var(--inbox-system-bubble-muted)" } : undefined}>
          {formatTime(timestamp)}
        </p>
      </div>
    </div>
  );
}
