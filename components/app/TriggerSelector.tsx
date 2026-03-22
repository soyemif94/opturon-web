"use client";

const TRIGGERS = [
  { value: "message_received", label: "Mensaje recibido", helper: "Se dispara cuando entra cualquier mensaje nuevo." },
  { value: "keyword", label: "Palabra clave", helper: "Activa la automatización cuando el mensaje contiene una palabra definida." },
  { value: "off_hours", label: "Fuera de horario", helper: "Ideal para responder automáticamente cuando el negocio está cerrado." },
  { value: "new_contact", label: "Nuevo contacto", helper: "Se dispara con el primer contacto detectado en el espacio." }
] as const;

export function TriggerSelector({
  value,
  keyword,
  onChange,
  onKeywordChange
}: {
  value: string;
  keyword: string;
  onChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold">Trigger</p>
        <p className="mt-1 text-xs leading-6 text-muted">Elige cuándo debería ejecutarse esta automatización.</p>
      </div>

      <div className="grid gap-3">
        {TRIGGERS.map((trigger) => (
          <label
            key={trigger.value}
            className={`rounded-2xl border p-4 transition ${
              value === trigger.value ? "border-brand/40 bg-brand/10" : "border-[color:var(--border)] bg-bg/70"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="trigger"
                value={trigger.value}
                checked={value === trigger.value}
                onChange={(event) => onChange(event.target.value)}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium">{trigger.label}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{trigger.helper}</p>
              </div>
            </div>
          </label>
        ))}
      </div>

      {value === "keyword" ? (
        <label className="mt-4 grid gap-2 text-sm">
          <span className="font-medium">Palabra clave</span>
          <input
            className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2"
            placeholder="Ej. presupuesto"
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
          />
        </label>
      ) : null}
    </section>
  );
}
