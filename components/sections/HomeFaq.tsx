import { ChevronDown } from "lucide-react";
import { Section } from "@/components/ui/Section";

const faqItems = [
  {
    question: "Tengo que cambiar mi numero?",
    answer: "No necesariamente. La idea es ordenar tus ventas sobre el canal que ya usas, no obligarte a empezar de cero."
  },
  {
    question: "Cuanto tarda implementarse?",
    answer: "La salida inicial puede quedar lista rapido. Lo importante es empezar con una configuracion clara y luego ajustar sobre uso real."
  },
  {
    question: "Necesito conocimientos tecnicos?",
    answer: "No. El equipo trabaja sobre pantallas simples para responder, mover oportunidades y seguir clientes."
  },
  {
    question: "Funciona con mi tipo de negocio?",
    answer: "Si vendes por WhatsApp y haces seguimiento comercial, el enfoque aplica. Cambia la configuracion, no la logica base."
  }
];

export function HomeFaq() {
  return (
    <Section>
      <div className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">FAQ</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">Preguntas frecuentes</h2>
      </div>
      <div className="mt-10 grid gap-3">
        {faqItems.map((item) => (
          <details
            key={item.question}
            className="group rounded-3xl border border-[color:var(--border)] bg-card/80 p-6 open:border-brand/40"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left text-base font-medium text-text">
              {item.question}
              <ChevronDown className="h-4 w-4 shrink-0 text-brandBright transition group-open:rotate-180" />
            </summary>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
