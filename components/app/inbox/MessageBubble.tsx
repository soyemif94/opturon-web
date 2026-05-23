import { Bot, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({
  direction,
  type,
  text,
  caption,
  timestamp,
  media,
  optimistic
}: {
  direction: string;
  type?: string;
  text: string;
  caption?: string;
  timestamp: string;
  media?: {
    previewUrl?: string | null;
    downloadUrl?: string | null;
    mimeType?: string | null;
    available?: boolean;
  } | null;
  optimistic?: boolean;
}) {
  const outbound = direction === "outbound";
  const system = direction === "system";
  const isImage = type === "image";
  const mediaUrl = media?.previewUrl || media?.downloadUrl || null;
  const captionText = caption || text;
  const senderLabel = outbound ? "Negocio" : system ? "Evento del bot" : "Cliente";
  const senderTone = system
    ? "var(--inbox-system-bubble-muted)"
    : outbound
      ? "rgba(233,255,243,0.72)"
      : "var(--text-muted)";

  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start", system ? "justify-center" : "")}>
      <div
        className={cn(
          "max-w-[82%] rounded-[22px] px-3.5 py-3 text-[13px] shadow-[0_14px_30px_rgba(0,0,0,0.16)]",
          outbound && "border border-[color:var(--whatsapp-accent-border)] bg-[linear-gradient(135deg,rgba(24,100,52,0.98),rgba(16,82,40,0.98))] text-white",
          !outbound && !system && "border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(36,36,36,0.95),rgba(24,24,24,0.98))] text-text",
          system && "max-w-[82%] border bg-[color:var(--inbox-system-bubble-bg)] text-[color:var(--inbox-system-bubble-text)]",
          optimistic ? "animate-inbox-message" : ""
        )}
        style={system ? { borderColor: "var(--inbox-system-bubble-border)" } : undefined}
      >
        <div
          className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em]"
          style={{ color: senderTone }}
        >
          {outbound ? <UserRound className="h-3 w-3" /> : system ? <Bot className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
          <span>{senderLabel}</span>
        </div>
        {isImage ? (
          <div className="space-y-2">
            {mediaUrl ? (
              <a href={media?.downloadUrl || mediaUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-white/10 bg-black/10">
                <img src={mediaUrl} alt={captionText || "Imagen recibida"} className="max-h-64 w-full object-cover" loading="lazy" />
              </a>
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] px-3 py-4 text-xs text-muted">
                Imagen recibida. Todavia no se pudo cargar la vista previa.
              </div>
            )}
            {captionText ? <p className="whitespace-pre-wrap leading-5">{captionText}</p> : null}
          </div>
        ) : (
          <p className="whitespace-pre-wrap leading-5">{text}</p>
        )}
        <p
          className="mt-2 text-[10px]"
          style={{ color: senderTone }}
        >
          {formatTime(timestamp)}
        </p>
      </div>
    </div>
  );
}
