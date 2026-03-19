import { BarChart3, Bot, LayoutPanelTop, UserRoundSearch, Workflow } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { HomeProductMockup } from "./HomeProductMockup";

const featureBlocks = [
  {
    title: "Inbox omnicanal",
    description: "Gestiona todas las conversaciones desde un solo lugar.",
    icon: LayoutPanelTop,
    variant: "inbox" as const
  },
  {
    title: "Pipeline de ventas",
    description: "Visualiza en que etapa esta cada cliente.",
    icon: Workflow,
    variant: "pipeline" as const
  },
  {
    title: "Automatizaciones",
    description: "Responde y da seguimiento automaticamente.",
    icon: Bot,
    variant: "automation" as const
  },
  {
    title: "Contactos y CRM",
    description: "Accede al historial completo de cada cliente.",
    icon: UserRoundSearch,
    variant: "crm" as const
  },
  {
    title: "Metricas",
    description: "Mide rendimiento, actividad y ventas en tiempo real.",
    icon: BarChart3,
    variant: "metrics" as const
  }
];

export function HomeServices() {
  return (
    <Section id="producto">
      <div className="max-w-4xl">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Producto</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">
          Lo que ves es lo que ordena tus ventas
        </h2>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {featureBlocks.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.title}
              className={`overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-card/90 ${
                feature.variant === "inbox" || feature.variant === "automation" ? "whatsapp-accent-hover" : ""
              }`}
            >
              <div className="border-b border-[color:var(--border)] p-6">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10">
                  <Icon className="whatsapp-accent-icon h-5 w-5 text-brandBright" />
                </div>
                <h3 className="mt-4 text-2xl font-semibold">{feature.title}</h3>
                <p className="mt-3 max-w-lg text-sm leading-7 text-muted">{feature.description}</p>
              </div>
              <div className="p-5">
                <HomeProductMockup variant={feature.variant} compact />
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
