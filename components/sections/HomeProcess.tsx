import { Section } from "@/components/ui/Section";

const steps = [
  "Diagnostico estrategico",
  "Diseno del flujo comercial",
  "Implementacion tecnica",
  "Medicion y optimizacion"
];

export function HomeProcess() {
  return (
    <Section>
      <h2 className="text-3xl font-semibold md:text-4xl">Como trabajamos</h2>
      <p className="mt-3 text-sm text-muted">Tiempo estimado: semanas, no meses.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="rounded-2xl border border-[color:var(--border)] bg-card/70 p-5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-brand/50 text-xs text-brandBright">
              {index + 1}
            </span>
            <p className="mt-4 text-sm font-medium text-text">{step}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}