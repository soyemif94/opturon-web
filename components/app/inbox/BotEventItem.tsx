import { Sparkles } from "lucide-react";

export function BotEventItem({ text }: { text: string }) {
  return (
    <div
      className="mx-auto max-w-[82%] rounded-2xl border px-4 py-3 text-xs"
      style={{
        backgroundColor: "var(--inbox-system-bubble-bg)",
        borderColor: "var(--inbox-system-bubble-border)",
        color: "var(--inbox-system-bubble-text)"
      }}
    >
      <div className="flex items-center gap-2 uppercase tracking-[0.16em]" style={{ color: "var(--inbox-system-bubble-muted)" }}>
        <Sparkles className="h-3.5 w-3.5" />
        Evento IA
      </div>
      <p className="mt-2 leading-6">{text}</p>
    </div>
  );
}
