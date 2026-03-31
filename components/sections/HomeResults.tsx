import { Quote } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { getCardGlowClass } from "@/components/ui/card";

const proofCards = [
  {
    label: "Antes",
    value: "Las consultas vivian en chats separados y el seguimiento dependia de memoria humana."
  },
  {
    label: "Despues",
    value: "Todo quedo en un solo flujo con contexto, estado comercial y responsable visible."
  },
  {
    label: "Impacto",
    value: "No pierden conversaciones que si podian convertirse en ventas y saben que habia que empujar ese dia."
  }
];

export function HomeResults() {
  return (
    <Section className="border-y border-[color:var(--border)] bg-surface/35">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Prueba social</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">
          Cuando el seguimiento se ordena, el cambio se nota rapido
        </h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <article className={`rounded-[2rem] border border-brand/30 bg-[linear-gradient(135deg,rgba(176,80,0,0.14),rgba(255,255,255,0.04))] p-8 ${getCardGlowClass("orange")}`}>
          <Quote className="h-7 w-7 text-brandBright" />
          <p className="mt-6 max-w-3xl text-2xl font-medium leading-10 text-text md:text-3xl">
            "Pasamos de responder manualmente a organizar todas las ventas en un solo flujo."
          </p>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted">
            Un equipo comercial que ya recibia consultas por WhatsApp pudo pasar de reaccionar tarde a trabajar cada
            oportunidad con mas orden y seguimiento visible.
          </p>
          <p className="mt-4 text-sm font-medium text-text/90">
            El cambio no fue solo operativo: fue dejar de perder ventas por falta de seguimiento.
          </p>
        </article>

        <div className="grid gap-4">
          {proofCards.map((item) => (
            <article key={item.label} className={`rounded-3xl border border-[color:var(--border)] bg-card/90 p-6 ${getCardGlowClass("green")}`}>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">{item.label}</p>
              <p className="mt-3 text-lg font-semibold leading-8 text-text">{item.value}</p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
