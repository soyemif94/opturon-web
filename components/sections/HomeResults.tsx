import { Section } from "@/components/ui/Section";

const results = [
  "+40% mejora en velocidad de respuesta",
  "+25% aumento en seguimiento efectivo",
  "Reduccion de tareas manuales repetitivas",
  "Mas control del pipeline"
];

export function HomeResults() {
  return (
    <Section className="border-y border-[color:var(--border)] bg-surface/40">
      <h2 className="text-3xl font-semibold md:text-4xl">Que cambia cuando el sistema esta bien disenado</h2>
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {results.map((item) => (
          <div key={item} className="rounded-2xl border border-[color:var(--border)] bg-card p-5">
            <p className="text-sm font-medium text-text md:text-base">{item}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted">
        Benchmarks generales basados en patrones tipicos de implementacion. No representan resultados garantizados.
      </p>
    </Section>
  );
}