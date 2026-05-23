import { Sparkles } from "lucide-react";

export function BotEventItem({ text }: { text: string }) {
  return (
    <div
      className="mx-auto max-w-[82%] rounded-[22px] border px-3.5 py-3 text-[11px] shadow-[0_16px_30px_rgba(0,0,0,0.14)]"
      style={{
        backgroundColor: "var(--inbox-system-bubble-bg)",
        borderColor: "var(--inbox-system-bubble-border)",
        color: "var(--inbox-system-bubble-text)"
      }}
    >
      <div className="flex items-center gap-1.5 uppercase tracking-[0.14em]" style={{ color: "var(--inbox-system-bubble-muted)" }}>
        <Sparkles className="h-3 w-3" />
        Evento IA
      </div>
      <p className="mt-1.5 leading-5">{text}</p>
    </div>
  );
}
