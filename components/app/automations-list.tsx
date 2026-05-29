import Link from "next/link";
import {
  BellRing,
  Bot,
  CalendarDays,
  CreditCard,
  Hand,
  MessageSquareText,
  Package2,
  RefreshCcw,
  ShieldQuestion,
  UserRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  icon: "welcome" | "catalog" | "handoff" | "followup" | "payments" | "fallback" | "faq" | "calendar" | "bot";
  chips?: string[];
  channel?: string;
  configHref?: string;
  configureLabel?: string;
  showToggle?: boolean;
};

const ICONS = {
  welcome: Hand,
  catalog: Package2,
  handoff: UserRound,
  followup: RefreshCcw,
  payments: CreditCard,
  fallback: ShieldQuestion,
  faq: MessageSquareText,
  calendar: CalendarDays,
  bot: Bot
} as const;

export function AutomationsList({
  modules,
  pendingAutomationId,
  pendingAction,
  onToggleEnabled
}: {
  modules: AutomationModule[];
  pendingAutomationId?: string | null;
  pendingAction?: "toggle" | "delete" | null;
  onToggleEnabled?: (module: AutomationModule) => void;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {modules.map((module) => {
        const Icon = ICONS[module.icon];
        const isPendingToggle = pendingAutomationId === module.id && pendingAction === "toggle";
        const isActive = module.state === "activa";
        const showToggle = module.showToggle !== false;

        return (
          <Card key={module.id} className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className={cn("inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border", iconTone(module.icon))}>
                  <Icon className="h-6 w-6" />
                </span>
                <Badge variant={stateVariant(module.state)}>{stateLabel(module.state)}</Badge>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white">{module.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{module.description}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(module.chips || []).slice(0, 2).map((chip) => (
                  <span key={chip} className="rounded-xl border border-white/8 bg-black/12 px-3 py-1.5 text-xs text-text">
                    {chip}
                  </span>
                ))}
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/12 p-3 text-xs leading-6 text-muted">
                <p>{module.summary}</p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="space-y-1">
                  <p className={cn("text-sm font-semibold uppercase tracking-[0.16em]", isActive ? "text-emerald-300" : "text-muted")}>
                    {isActive ? "Activa" : module.state === "recomendada" ? "Recomendada" : "Inactiva"}
                  </p>
                  {showToggle ? (
                    <button
                      type="button"
                      aria-label={isActive ? "Desactivar automatizacion" : "Activar automatizacion"}
                      disabled={!onToggleEnabled || isPendingToggle}
                      onClick={() => onToggleEnabled?.(module)}
                      className={cn(
                        "relative inline-flex h-7 w-12 items-center rounded-full border transition-colors",
                        isActive ? "border-emerald-400/40 bg-emerald-500/30" : "border-white/10 bg-white/8",
                        (!onToggleEnabled || isPendingToggle) && "opacity-70"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-5 w-5 transform rounded-full bg-white transition-transform",
                          isActive ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-xs text-muted">
                      <BellRing className="h-3.5 w-3.5" />
                      <span>Plantilla disponible</span>
                    </div>
                  )}
                </div>

                <Button asChild variant="secondary" className="rounded-2xl px-4">
                  <Link href={module.configHref || `/app/automations/templates?focus=${encodeURIComponent(module.id)}`}>
                    {module.configureLabel || "Configurar"}
                  </Link>
                </Button>
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
  if (state === "requiere configuracion") return "Pendiente";
  return "Recomendada";
}

function iconTone(icon: AutomationModule["icon"]) {
  if (icon === "welcome") return "border-emerald-400/35 bg-emerald-500/18 text-emerald-200 shadow-[0_0_0_1px_rgba(52,211,153,0.12),0_16px_30px_rgba(16,185,129,0.16)]";
  if (icon === "catalog") return "border-sky-400/35 bg-sky-500/18 text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_16px_30px_rgba(59,130,246,0.16)]";
  if (icon === "handoff") return "border-violet-400/35 bg-violet-500/18 text-violet-200 shadow-[0_0_0_1px_rgba(167,139,250,0.12),0_16px_30px_rgba(124,58,237,0.16)]";
  if (icon === "followup") return "border-orange-400/35 bg-orange-500/18 text-orange-200 shadow-[0_0_0_1px_rgba(251,146,60,0.12),0_16px_30px_rgba(234,88,12,0.16)]";
  if (icon === "payments") return "border-rose-400/35 bg-rose-500/18 text-rose-200 shadow-[0_0_0_1px_rgba(251,113,133,0.12),0_16px_30px_rgba(225,29,72,0.16)]";
  if (icon === "fallback") return "border-amber-400/35 bg-amber-500/18 text-amber-200 shadow-[0_0_0_1px_rgba(251,191,36,0.12),0_16px_30px_rgba(217,119,6,0.16)]";
  if (icon === "faq") return "border-amber-400/35 bg-amber-500/18 text-amber-200 shadow-[0_0_0_1px_rgba(251,191,36,0.12),0_16px_30px_rgba(217,119,6,0.16)]";
  if (icon === "calendar") return "border-orange-400/35 bg-orange-500/18 text-orange-200 shadow-[0_0_0_1px_rgba(251,146,60,0.12),0_16px_30px_rgba(234,88,12,0.16)]";
  return "border-brand/35 bg-brand/18 text-brandBright shadow-[0_0_0_1px_rgba(249,115,22,0.12),0_16px_30px_rgba(192,80,0,0.16)]";
}
