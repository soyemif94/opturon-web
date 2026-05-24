import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, CircleDashed, Package, PlugZap, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/ui/cn";

export type ClientOnboardingStep = {
  id: string;
  label: string;
  status: "done" | "pending";
  href?: string;
  ctaLabel?: string;
};

const stepMeta: Record<string, { icon: React.ReactNode }> = {
  whatsapp: { icon: <PlugZap className="h-4 w-4" /> },
  products: { icon: <Package className="h-4 w-4" /> },
  bot: { icon: <Zap className="h-4 w-4" /> },
  automation: { icon: <CheckCircle2 className="h-4 w-4" /> }
};

export function ClientOnboardingChecklist({ steps }: { steps: ClientOnboardingStep[] }) {
  const total = steps.length;
  const completedCount = steps.filter((step) => step.status === "done").length;
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const allDone = total > 0 && completedCount === total;

  return (
    <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
      <CardHeader action={<Badge variant={allDone ? "success" : "outline"}>{completedCount}/{total} completado</Badge>}>
        <div>
          <CardTitle className="text-[24px] leading-none tracking-tight">
            {allDone ? "Onboarding: tu cuenta esta lista para vender" : "Onboarding: ultimos pasos del setup"}
          </CardTitle>
          <CardDescription className="mt-1.5 text-sm">
            {allDone
              ? "Tu setup ya esta operativo y queda visible como salud del espacio."
              : "Completa estos pasos para dejar el espacio listo para atender, vender y automatizar."}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">Progreso operacional</span>
            <span className="font-medium text-text">{progress}% listo</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/6">
            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.max(progress, completedCount > 0 ? 10 : 0)}%` }} />
          </div>
        </div>

        <div className={cn("grid gap-3.5", allDone ? "xl:grid-cols-[minmax(0,1fr)_280px]" : "")}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="relative rounded-[20px] border border-[color:var(--border)] bg-surface/70 p-3.5"
              >
                {index < steps.length - 1 ? (
                  <span className="pointer-events-none absolute -right-2 top-1/2 hidden h-px w-4 -translate-y-1/2 bg-emerald-500/20 xl:block" />
                ) : null}

                <div
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-2xl border",
                    step.status === "done"
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 bg-white/5 text-brandBright"
                  )}
                >
                  {step.status === "done" ? stepMeta[step.id]?.icon || <CheckCircle2 className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
                </div>

                <p className="mt-3 text-sm font-medium text-text">{step.label}</p>
                <p className={cn("mt-1.5 text-sm", step.status === "done" ? "text-emerald-300" : "text-muted")}>
                  {step.status === "done" ? "Completado" : "Pendiente"}
                </p>

                {step.href && step.ctaLabel ? (
                  <Link
                    href={step.href}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-text hover:text-brandBright"
                  >
                    {step.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            ))}
          </div>

          {allDone ? (
            <div className="rounded-[22px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,0.02))] p-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                  <CalendarClock className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-text">Excelente</p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Tu asistente ya esta atendiendo clientes automaticamente y el espacio quedo listo para operar.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
