"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ActionBuilder } from "@/components/app/ActionBuilder";
import { TriggerSelector } from "@/components/app/TriggerSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

type TriggerType = "message_received" | "keyword" | "off_hours" | "new_contact";
type ActionType = "send_message" | "assign_human" | "tag_contact";

const TEMPLATE_PRESETS: Record<string, { name: string; trigger: TriggerType; actions: ActionType[]; message?: string; tag?: string; keyword?: string }> = {
  handoff: {
    name: "Derivación a humano",
    trigger: "message_received",
    actions: ["assign_human"]
  },
  "off-hours": {
    name: "Respuesta fuera de horario",
    trigger: "off_hours",
    actions: ["send_message"],
    message: "Gracias por escribir. Ahora estamos fuera de horario, pero te respondemos en nuestro próximo bloque operativo."
  },
  "lead-capture": {
    name: "Captura de prospectos",
    trigger: "new_contact",
    actions: ["tag_contact", "send_message"],
    tag: "prospecto",
    message: "Hola, gracias por escribir. Para ayudarte mejor, cuéntanos qué necesitas."
  }
};

export function AutomationBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const template = searchParams.get("template") || "";
  const preset = TEMPLATE_PRESETS[template] || null;

  const [name, setName] = useState(preset?.name || "");
  const [triggerType, setTriggerType] = useState<TriggerType>(preset?.trigger || "message_received");
  const [keyword, setKeyword] = useState(preset?.keyword || "");
  const [actions, setActions] = useState<ActionType[]>(preset?.actions || ["send_message"]);
  const [message, setMessage] = useState(preset?.message || "");
  const [tag, setTag] = useState(preset?.tag || "");
  const [isSaving, setIsSaving] = useState(false);

  const helper = useMemo(() => {
    if (triggerType === "keyword") return "La automatización se va a disparar cuando detecte una palabra clave concreta.";
    if (triggerType === "off_hours") return "Útil para cubrir mensajes fuera del horario operativo.";
    if (triggerType === "new_contact") return "Ideal para captar el primer contacto y etiquetarlo rápido.";
    return "La automatización se ejecutará sobre cada mensaje recibido.";
  }, [triggerType]);

  function toggleAction(value: ActionType) {
    setActions((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        name,
        trigger: {
          type: triggerType,
          keyword: triggerType === "keyword" ? keyword : null
        },
        actions: actions.map((action) => ({
          type: action,
          message: action === "send_message" ? message : null,
          tag: action === "tag_contact" ? tag : null
        })),
        enabled: true
      };

      const response = await fetch("/api/app/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = (await response.json().catch(() => null)) as
        | { error?: string; detail?: string }
        | null;

      if (!response.ok) {
        throw new Error(json?.detail || json?.error || "No pudimos guardar la automatización.");
      }

      toast.success("Automatización creada", "La regla ya quedo guardada en tu espacio.");
      router.push("/app/automations");
      router.refresh();
    } catch (error) {
      toast.error("No pudimos crear la automatización", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_340px]" onSubmit={handleSubmit}>
      <Card className="border-white/6 bg-card/90">
        <CardHeader>
          <div>
            <CardTitle className="text-2xl">Builder de automatización</CardTitle>
            <CardDescription>
              Define un nombre, el disparador y las primeras acciones. Esta es la base operativa inicial para el módulo.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Nombre de la automatización</span>
            <input
              className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2"
              placeholder="Ej. Bienvenida fuera de horario"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <TriggerSelector value={triggerType} keyword={keyword} onChange={(value) => setTriggerType(value as TriggerType)} onKeywordChange={setKeyword} />
          <ActionBuilder
            selected={actions}
            message={message}
            tag={tag}
            onToggle={toggleAction}
            onMessageChange={setMessage}
            onTagChange={setTag}
          />

          <div className="flex flex-wrap gap-3">
            <Button className="rounded-2xl" type="submit" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
            <Button type="button" variant="secondary" className="rounded-2xl" onClick={() => router.push("/app/automations/templates")}>
              Ver recomendaciones
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/6 bg-card/90">
        <CardHeader>
          <div>
            <CardTitle className="text-xl">Resumen rápido</CardTitle>
            <CardDescription>Te mostramos cómo se va a guardar la regla antes de crearla.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Nombre</p>
            <p className="mt-2 text-sm font-medium">{name || "Sin nombre todavía"}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Trigger</p>
            <p className="mt-2 text-sm font-medium">{helper}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Acciones seleccionadas</p>
            <div className="mt-2 space-y-2 text-sm text-muted">
              {actions.length ? actions.map((action) => <p key={action}>{action}</p>) : <p>Aún no seleccionaste acciones.</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
