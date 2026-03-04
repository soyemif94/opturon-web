export function BotEventItem({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-bg px-3 py-2 text-xs text-muted">
      ?? IA clasificó: {text}
    </div>
  );
}
