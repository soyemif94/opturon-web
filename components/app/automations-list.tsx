import Link from "next/link";
import { AlarmClock, Bot, CalendarDays, Edit3, MessageSquareText, MoonStar, PhoneCall, Sparkles, UserRound, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/ui/cn";

type AutomationState = "activa" | "inactiva" | "requiere configuracion" | "recomendada";

export type AutomationModule = {
  id: string;
  name: string;
  description: string;
  state: AutomationState;
  enabled?: boolean;
  summary: string;
  trigger: string;
  action: string;
  icon: "sparkles" | "moon" | "human" | "faq" | "phone" | "calendar" | "alarm" | "bot";
  channel?: string;
  readiness?: string;
  headline?: string;
};

const ICONS = {
  sparkles: Sparkles,
  moon: MoonStar,
  human: UserRound,
  faq: MessageSquareText,
  phone: PhoneCall,
  calendar: CalendarDays,
  alarm: AlarmClock,
  bot: Bot
} as const;

export function AutomationsList({
  modules,
  pendingAutomationId,
  pendingAction,
  onToggleEnabled,
  onDelete
}: {
  modules: AutomationModule[];
  pendingAutomationId?: string | null;
  pendingAction?: "toggle" | "delete" | null;
  onToggleEnabled?: (module: AutomationModule) => void;
  onDelete?: (module: AutomationModule) => void;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {modules.map((module) => {
        const Icon = ICONS[module.icon];
        const isPendingToggle = pendingAutomationId === module.id && pendingAction === "toggle";
        const isPendingDelete = pendingAutomationId === module.id && pendingAction === "delete";
        const toggleLabel = module.state === "activa" ? "Activa" : "Inactiva";
        const toggleActionLabel = module.state === "activa" ? "Desactivar" : "Activar";
        const toneClass =
          module.state === "activa"
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
            : module.state === "requiere configuracion"
              ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
              : "border-white/10 bg-white/5 text-muted";

        return (
          <Card key={module.id} className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
            <CardHeader action={<Badge variant={stateVariant(module.state)}>{stateLabel(module.state)}</Badge>}>
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-black/20">
                  <Icon className="h-5 w-5 text-brandBright" />
                </span>
                <div>
                  <CardTitle className="text-xl text-white">{module.name}</CardTitle>
                  <CardDescription>{module.headline || module.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-text">{module.channel || "WhatsApp"}</span>
                <span className={cn("rounded-full border px-3 py-1", toneClass)}>{module.readiness || defaultReadiness(module.state)}</span>
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/15 p-4 text-sm leading-6 text-muted">
                {module.summary}
              </div>

              <div className="grid gap-3 rounded-2xl border border-white/8 bg-black/15 p-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Cuando actua</p>
                  <p className="mt-1 text-sm font-medium text-white">{module.trigger}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Que hace</p>
                  <p className="mt-1 text-sm font-medium text-white">{module.action}</p>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Estado</p>
                    <p className="mt-1 text-sm font-medium text-white">{toggleLabel}</p>
                  </div>
                  <Button
                    type="button"
                    variant={module.state === "activa" ? "secondary" : "primary"}
                    size="sm"
                    className="rounded-2xl"
                    disabled={!onToggleEnabled || isPendingToggle || isPendingDelete}
                    onClick={() => onToggleEnabled?.(module)}
                  >
                    {isPendingToggle ? "Guardando..." : toggleActionLabel}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button asChild variant="secondary" className="flex-1 rounded-2xl">
                    <Link href={`/app/automations/templates?focus=${encodeURIComponent(module.id)}`}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Configurar
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-2xl px-4"
                    disabled={!onDelete || isPendingToggle || isPendingDelete}
                    onClick={() => onDelete?.(module)}
                  >
                    {isPendingDelete ? "Eliminando..." : "Eliminar"}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button asChild variant="ghost" className="flex-1 rounded-2xl">
                    <Link href={`/app/automations/new?template=${encodeURIComponent(module.id)}`} aria-label={`Crear automatizacion desde ${module.name}`}>
                      <Zap className="mr-2 h-4 w-4" />
                      Duplicar base
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

function stateVariant(state: AutomationState): "success" | "muted" | "warning" {
  if (state === "activa") return "success";
  if (state === "inactiva") return "muted";
  return "warning";
}

function stateLabel(state: AutomationState) {
  if (state === "activa") return "Activa";
  if (state === "inactiva") return "Inactiva";
  if (state === "requiere configuracion") return "Requiere configuracion";
  return "Recomendada";
}

function defaultReadiness(state: AutomationState) {
  if (state === "activa") return "Lista para responder";
  if (state === "inactiva") return "Disponible para activar";
  if (state === "requiere configuracion") return "Necesita revision";
  return "Conviene activarla";
}
