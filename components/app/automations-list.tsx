import Link from "next/link";
import { AlarmClock, Bot, CalendarDays, Edit3, MessageSquareText, MoonStar, PhoneCall, Sparkles, UserRound, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AutomationState = "activa" | "inactiva" | "requiere configuracion" | "recomendada";

export type AutomationModule = {
  id: string;
  name: string;
  description: string;
  state: AutomationState;
  summary: string;
  trigger: string;
  action: string;
  icon: "sparkles" | "moon" | "human" | "faq" | "phone" | "calendar" | "alarm" | "bot";
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

export function AutomationsList({ modules }: { modules: AutomationModule[] }) {
  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {modules.map((module) => {
        const Icon = ICONS[module.icon];

        return (
          <Card key={module.id} className="border-white/6 bg-card/90">
            <CardHeader action={<Badge variant={stateVariant(module.state)}>{module.state}</Badge>}>
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-surface/80">
                  <Icon className="h-5 w-5 text-brandBright" />
                </span>
                <div>
                  <CardTitle className="text-xl">{module.name}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
                {module.summary}
              </div>

              <div className="grid gap-3 rounded-2xl border border-[color:var(--border)] bg-bg/70 p-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Trigger</p>
                  <p className="mt-1 text-sm font-medium">{module.trigger}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Accion principal</p>
                  <p className="mt-1 text-sm font-medium">{module.action}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button asChild variant="secondary" className="flex-1 rounded-2xl">
                  <Link href={`/app/automations/templates?focus=${encodeURIComponent(module.id)}`}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="rounded-2xl px-4">
                  <Link href={`/app/automations/new?template=${encodeURIComponent(module.id)}`} aria-label={`Crear automatizacion desde ${module.name}`}>
                    <Zap className="h-4 w-4" />
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
