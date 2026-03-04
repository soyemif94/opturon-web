import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Section } from "@/components/ui/Section";
import { getWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";
import { servicesCatalog } from "@/lib/services";

export const metadata: Metadata = {
  title: "Servicios | Opturon",
  description:
    "Servicios de automatización con IA para WhatsApp, CRM, bots y optimización continua orientada a resultados."
};

export default function ServiciosPage() {
  const whatsAppLink = getWhatsAppLink();
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  return (
    <>
      <Section className="pt-20 md:pt-24">
        <div className="max-w-3xl space-y-4">
          <h1 className="text-balance text-4xl font-semibold md:text-5xl">Servicios</h1>
          <p className="text-muted md:text-lg">
            Diseñamos automatizaciones empresariales con IA para convertir más, operar mejor y escalar sin fricción.
          </p>
        </div>
      </Section>

      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          {servicesCatalog.map((service) => (
            <GlowCard key={service.slug}>
              <h2 className="text-2xl font-semibold">{service.title}</h2>
              <p className="mt-2 text-sm text-muted">{service.shortDescription}</p>
              <Link
                href={`/servicios/${service.slug}`}
                className="mt-5 inline-flex text-sm font-medium text-brandBright transition hover:text-brand"
              >
                Ver servicio →
              </Link>
            </GlowCard>
          ))}
        </div>
      </Section>

      <Section className="pb-24">
        <div className="rounded-3xl border border-brand/40 bg-card p-8 md:p-12">
          <h3 className="text-3xl font-semibold md:text-4xl">Empezá con un diagnóstico sin cargo</h3>
          <p className="mt-3 max-w-2xl text-muted">
            Te mostramos prioridades, arquitectura y roadmap para implementar rápido y con foco en impacto.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryButton href="/contacto" ariaLabel="Ir a contacto para diagnóstico sin cargo">
              Diagnóstico sin cargo
            </PrimaryButton>
            <a
              href={whatsAppLink}
              aria-label="Hablar por WhatsApp con Opturon"
              target={isExternalWhatsApp ? "_blank" : undefined}
              rel={isExternalWhatsApp ? "noopener noreferrer" : undefined}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-brand/40 bg-transparent px-5 text-sm font-semibold text-text transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand/70 hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Hablar por WhatsApp
            </a>
          </div>
        </div>
      </Section>
    </>
  );
}
