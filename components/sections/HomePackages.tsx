import { ArrowRight } from "lucide-react";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { Section } from "@/components/ui/Section";

const plans = [
  {
    name: "Starter",
    description: "Para empezar a vender por WhatsApp",
    price: "USD 15",
    bullets: ["Inbox ordenado", "Contactos basicos", "Respuestas iniciales"],
    featured: false
  },
  {
    name: "Growth",
    description: "Para organizar y escalar ventas",
    price: "USD 29",
    bullets: ["Pipeline de ventas", "Seguimiento automatico", "Metricas clave"],
    featured: true
  },
  {
    name: "Pro",
    description: "Para equipos en crecimiento",
    price: "USD 59",
    bullets: ["Usuarios y control operativo", "Automatizaciones avanzadas", "Mayor volumen de trabajo"],
    featured: false
  }
];

export function HomePackages() {
  return (
    <Section id="planes">
      <div className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Planes</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">
          Precios simples para empezar sin friccion
        </h2>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`rounded-[2rem] border p-7 ${
              plan.featured
                ? "border-brand/40 bg-[linear-gradient(180deg,rgba(176,80,0,0.16),rgba(31,31,31,0.96))]"
                : "border-[color:var(--border)] bg-card/90"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold">{plan.name}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{plan.description}</p>
              </div>
              {plan.featured ? (
                <span className="rounded-full border border-brand/40 bg-brand/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brandBright">
                  Recomendado
                </span>
              ) : null}
            </div>

            <p className="mt-8 text-4xl font-semibold tracking-tight">{plan.price}</p>

            <div className="mt-8 grid gap-3">
              {plan.bullets.map((bullet) => (
                <div key={bullet} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text">
                  {bullet}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <PrimaryButton href="/contacto" ariaLabel="Empezar ahora con Opturon">
          Empezar ahora
          <ArrowRight className="ml-2 h-4 w-4" />
        </PrimaryButton>
        <SecondaryButton href="#producto" ariaLabel="Ver demo visual del producto">
          Ver demo
        </SecondaryButton>
      </div>
    </Section>
  );
}
