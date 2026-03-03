import { BarChart3, Bot, Database } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { Section } from "@/components/ui/Section";

const pillars = [
  {
    title: "Automatizacion inteligente",
    description: "Flujos de respuesta y seguimiento que reducen demoras sin perder calidad.",
    icon: Bot
  },
  {
    title: "Integracion CRM",
    description: "Cada conversacion queda vinculada a tu pipeline para evitar perdida de contexto.",
    icon: Database
  },
  {
    title: "Optimizacion continua",
    description: "Medimos, ajustamos y mejoramos conversion con datos operativos reales.",
    icon: BarChart3
  }
];

const optimizationMetrics = [
  "Tiempo de primera respuesta",
  "Tasa de calificación",
  "Seguimiento efectivo",
  "Conversión a oportunidad en CRM"
];

export function HomeSolution() {
  return (
    <Section id="solucion" className="scroll-mt-24 border-y border-[color:var(--border)] bg-surface/40">
      <div className="mb-8 max-w-4xl">
        <h2 className="text-balance text-3xl font-semibold md:text-4xl">
          Disenamos un sistema que organiza, automatiza y optimiza cada conversacion comercial
        </h2>
      </div>

      <div className="mb-8 rounded-2xl border border-[color:var(--border)] bg-card/60 p-6">
        <h3 className="text-lg font-semibold text-text">Qué medimos para optimizar</h3>
        <p className="mt-2 text-sm text-muted">Porque en WhatsApp, la velocidad es margen.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {optimizationMetrics.map((metric) => (
            <div key={metric} className="rounded-xl border border-[color:var(--border)] bg-bg/50 px-3 py-4">
              <p className="text-xs font-medium text-muted">{metric}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <GlowCard key={pillar.title}>
              <Icon className="h-5 w-5 text-brandBright" />
              <h3 className="mt-3 text-lg font-semibold">{pillar.title}</h3>
              <p className="mt-2 text-sm text-muted">{pillar.description}</p>
            </GlowCard>
          );
        })}
      </div>
    </Section>
  );
}
