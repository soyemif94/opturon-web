import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
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

export function ClientOnboardingChecklist({ steps }: { steps: ClientOnboardingStep[] }) {
  const total = steps.length;
  const completedCount = steps.filter((step) => step.status === "done").length;
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const allDone = total > 0 && completedCount === total;

  return (
    <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
      <CardHeader action={<Badge variant={allDone ? "success" : "outline"}>{completedCount}/{total} completado</Badge>}>
        <div>
          <CardTitle className="text-xl">Onboarding guiado</CardTitle>
          <CardDescription>Seguí estos pasos para validar que tu cuenta ya está lista para atender clientes.</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">Progreso</span>
            <span className="font-medium">
              {completedCount}/{total} completado
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/6">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${Math.max(progress, completedCount > 0 ? 8 : 0)}%` }}
            />
          </div>
        </div>

        {allDone ? (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            🎉 Tu asistente ya está listo y atendiendo clientes automáticamente
          </div>
        ) : null}

        <div className="grid gap-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className="grid gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/70 p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
            >
              <span
                className={cn(
                  "inline-flex h-11 w-11 items-center justify-center rounded-2xl border",
                  step.status === "done"
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/5 text-brandBright"
                )}
              >
                {step.status === "done" ? <CheckCircle2 className="h-5 w-5" /> : <CircleDashed className="h-5 w-5" />}
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{step.label}</p>
                  <Badge variant={step.status === "done" ? "success" : "warning"}>
                    {step.status === "done" ? "Done" : "Pending"}
                  </Badge>
                </div>
              </div>

              {step.href && step.ctaLabel ? (
                <Link
                  href={step.href}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-white/5 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:bg-white/10"
                >
                  {step.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <div />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
