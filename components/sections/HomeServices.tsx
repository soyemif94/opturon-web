import { Bot, Cog, MessageCircleCode, Workflow } from "lucide-react";
import Link from "next/link";
import { GlowCard } from "@/components/ui/GlowCard";
import { Section } from "@/components/ui/Section";

const services = [
  {
    title: "Automatización de WhatsApp",
    text: "Flujos inteligentes para captar, calificar y responder en tiempo real.",
    icon: MessageCircleCode
  },
  {
    title: "Integración de sistemas",
    text: "Conectamos CRM, agendas y herramientas internas para eliminar fricción.",
    icon: Workflow
  },
  {
    title: "Asistentes IA de negocio",
    text: "Bots útiles con lógica operativa, no respuestas vacías.",
    icon: Bot
  },
  {
    title: "Optimización continua",
    text: "Iteramos sobre métricas y procesos para sostener resultados.",
    icon: Cog
  }
];

export function HomeServices() {
  return (
    <Section id="servicios" className="scroll-mt-24 md:scroll-mt-28">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="text-3xl font-semibold md:text-4xl">Servicios premium</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <GlowCard key={service.title}>
              <Icon className="h-5 w-5 text-brandBright" />
              <h3 className="mt-3 text-lg font-semibold">{service.title}</h3>
              <p className="mt-2 text-sm text-muted">{service.text}</p>
            </GlowCard>
          );
        })}
      </div>
      <div className="mt-8 flex flex-wrap gap-5 text-sm">
        <Link href="/servicios/diseno-web" className="text-brandBright transition hover:text-brand">
          Tambien disenamos sitios web premium →
        </Link>
        <Link href="/casos" className="text-brandBright transition hover:text-brand">
          Ver casos →
        </Link>
        <Link href="/blog" className="text-brandBright transition hover:text-brand">
          Leer blog →
        </Link>
      </div>
    </Section>
  );
}
