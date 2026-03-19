import { Quote } from "lucide-react";
import { Section } from "@/components/ui/Section";

const proofCards = [
  {
    value: "Todas las conversaciones en un solo flujo",
    label: "Caso real"
  },
  {
    value: "Seguimiento visible por etapa",
    label: "Resultado operativo"
  },
  {
    value: "Menos conversaciones perdidas",
    label: "Impacto comercial"
  }
];

export function HomeResults() {
  return (
    <Section className="border-y border-[color:var(--border)] bg-surface/35">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <article className="rounded-[2rem] border border-brand/30 bg-[linear-gradient(135deg,rgba(176,80,0,0.14),rgba(255,255,255,0.04))] p-8">
          <Quote className="h-7 w-7 text-brandBright" />
          <p className="mt-6 max-w-3xl text-2xl font-medium leading-10 text-text md:text-3xl">
            “Pasamos de responder manualmente a organizar todas las ventas en un solo flujo.”
          </p>
          <p className="mt-5 text-sm text-muted">Equipo comercial que centralizo consultas y seguimiento en WhatsApp.</p>
        </article>

        <div className="grid gap-4">
          {proofCards.map((item) => (
            <article key={item.label} className="rounded-3xl border border-[color:var(--border)] bg-card/90 p-6">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">{item.label}</p>
              <p className="mt-3 text-lg font-semibold text-text">{item.value}</p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
