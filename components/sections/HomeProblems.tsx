import { AlertCircle, CircleDashed, MessagesSquare, Workflow } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { Section } from "@/components/ui/Section";

const painPoints = [
  { label: "Los leads se enfrian", icon: AlertCircle },
  { label: "Se pierde contexto", icon: MessagesSquare },
  { label: "No hay trazabilidad", icon: CircleDashed },
  { label: "Se improvisa el seguimiento", icon: Workflow }
];

export function HomeProblems() {
  return (
    <Section>
      <div className="mb-8 max-w-4xl space-y-3">
        <h2 className="text-balance text-3xl font-semibold md:text-4xl">
          El problema no es la cantidad de leads. Es la falta de sistema.
        </h2>
        <p className="text-muted">
          El resultado no es caos visible: es dinero que nunca llega a facturarse.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {painPoints.map((item) => {
          const Icon = item.icon;
          return (
            <GlowCard key={item.label}>
              <Icon className="h-5 w-5 text-brandBright" />
              <p className="mt-3 text-base font-medium text-text">{item.label}</p>
            </GlowCard>
          );
        })}
      </div>
    </Section>
  );
}