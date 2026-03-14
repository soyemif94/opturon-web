"use client";

type ActionType = "send_message" | "assign_human" | "tag_contact";

const ACTIONS: Array<{ value: ActionType; label: string; helper: string }> = [
  { value: "send_message", label: "Enviar mensaje", helper: "Responde automáticamente con un mensaje predefinido." },
  { value: "assign_human", label: "Derivar a humano", helper: "Marca la conversación para atención humana." },
  { value: "tag_contact", label: "Etiquetar contacto", helper: "Aplica una etiqueta útil para segmentar o priorizar." }
];

export function ActionBuilder({
  selected,
  message,
  tag,
  onToggle,
  onMessageChange,
  onTagChange
}: {
  selected: ActionType[];
  message: string;
  tag: string;
  onToggle: (value: ActionType) => void;
  onMessageChange: (value: string) => void;
  onTagChange: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold">Acciones</p>
        <p className="mt-1 text-xs leading-6 text-muted">Define qué debe hacer Opturon cuando se cumpla el trigger.</p>
      </div>

      <div className="grid gap-3">
        {ACTIONS.map((action) => (
          <label
            key={action.value}
            className={`rounded-2xl border p-4 transition ${
              selected.includes(action.value) ? "border-brand/40 bg-brand/10" : "border-[color:var(--border)] bg-bg/70"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.includes(action.value)}
                onChange={() => onToggle(action.value)}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium">{action.label}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{action.helper}</p>
              </div>
            </div>
          </label>
        ))}
      </div>

      {selected.includes("send_message") ? (
        <label className="mt-4 grid gap-2 text-sm">
          <span className="font-medium">Mensaje automático</span>
          <textarea
            className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2"
            rows={4}
            placeholder="Hola, gracias por escribir. En un momento te respondemos."
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
          />
        </label>
      ) : null}

      {selected.includes("tag_contact") ? (
        <label className="mt-4 grid gap-2 text-sm">
          <span className="font-medium">Etiqueta</span>
          <input
            className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2"
            placeholder="Ej. prospecto-caliente"
            value={tag}
            onChange={(event) => onTagChange(event.target.value)}
          />
        </label>
      ) : null}
    </section>
  );
}
