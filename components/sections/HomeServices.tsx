import { BarChart3, Bot, LayoutPanelTop, UserRoundSearch, Workflow } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { HomeProductMockup } from "./HomeProductMockup";

const featureBlocks = [
  {
    title: "Inbox omnicanal",
    description: "Todos los mensajes en una vista que muestra contexto, responsable y siguiente accion.",
    icon: LayoutPanelTop,
    variant: "inbox" as const
  },
  {
    title: "Pipeline de ventas",
    description: "Cada oportunidad entra con etapa clara para saber que avanzar primero y que esta por cerrarse.",
    icon: Workflow,
    variant: "pipeline" as const
  },
  {
    title: "Automatizaciones",
    description: "Las primeras respuestas y seguimientos dejan de depender de recordatorios manuales.",
    icon: Bot,
    variant: "automation" as const
  },
  {
    title: "Contactos y CRM",
    description: "Cada cliente conserva historial, origen y estado comercial en la misma ficha.",
    icon: UserRoundSearch,
    variant: "crm" as const
  },
  {
    title: "Metricas",
    description: "Respuesta, actividad y avance comercial en una lectura simple para decidir mejor.",
    icon: BarChart3,
    variant: "metrics" as const
  }
];

export function HomeServices() {
  return (
    <Section id="producto">
      <div className="max-w-4xl space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Producto</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">
          El producto no esta para decorar la home. Esta para mostrar como ordenas tus ventas.
        </h2>
        <p className="max-w-3xl text-lg leading-8 text-muted">
          Inbox, pipeline, automatizaciones y fichas de clientes conectados en un mismo flujo para que cada mensaje
          avance hacia una venta.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {featureBlocks.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.title}
              className={`overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-card/90 ${
                feature.variant === "inbox" || feature.variant === "automation" ? "whatsapp-accent-hover" : ""
              } ${feature.variant === "inbox" ? "lg:col-span-2" : ""}`}
            >
              <div className="border-b border-[color:var(--border)] p-6 md:p-7">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10">
                  <Icon className="whatsapp-accent-icon h-5 w-5 text-brandBright" />
                </div>
                <h3 className="mt-4 text-2xl font-semibold">{feature.title}</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{feature.description}</p>
              </div>
              <div className="p-5 md:p-6">
                <HomeProductMockup variant={feature.variant} compact={feature.variant !== "inbox"} />
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
