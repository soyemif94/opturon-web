import { ChevronDown } from "lucide-react";
import { Section } from "@/components/ui/Section";

const faqItems = [
  {
    question: "Necesitamos cambiar de CRM?",
    answer:
      "No necesariamente. Primero auditamos tu stack actual y definimos la integracion mas eficiente con lo que ya usan."
  },
  {
    question: "Interfiere con el equipo actual?",
    answer:
      "No. El sistema se disena para reducir carga operativa, mantener control humano y ordenar derivaciones."
  },
  {
    question: "Cuanto tiempo lleva?",
    answer:
      "La implementacion inicial se plantea en semanas, seguida por ciclos de optimizacion continua sobre metricas reales."
  }
];

export function HomeFaq() {
  return (
    <Section>
      <div className="mb-8 max-w-3xl">
        <h2 className="text-3xl font-semibold md:text-4xl">Preguntas frecuentes</h2>
      </div>
      <div className="grid gap-3">
        {faqItems.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-[color:var(--border)] bg-card/80 p-5 open:border-brand/50"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-text md:text-base">
              {item.question}
              <ChevronDown className="h-4 w-4 text-brandBright transition group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm text-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}