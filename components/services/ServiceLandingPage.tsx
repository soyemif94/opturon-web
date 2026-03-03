import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Section } from "@/components/ui/Section";
import { getWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";
import { serviceProcessSteps, type ServiceContent } from "@/lib/services";

type ServiceLandingPageProps = {
  service: ServiceContent;
};

export function ServiceLandingPage({ service }: ServiceLandingPageProps) {
  const whatsAppLink = getWhatsAppLink();
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    provider: {
      "@id": "https://opturon.com/#organization"
    },
    areaServed: "AR",
    serviceType: service.serviceType
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Section className="pt-20 md:pt-24">
        <div className="space-y-6">
          <Link href="/servicios" className="text-sm text-muted transition hover:text-text">
            ← Ver todos los servicios
          </Link>
          <h1 className="max-w-4xl text-balance text-4xl font-semibold md:text-6xl">{service.heroTitle}</h1>
          <p className="max-w-3xl text-lg text-muted md:text-xl">{service.heroSubtitle}</p>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton href="/contacto" ariaLabel="Agendar diagnóstico sin cargo">
              Agendar diagnóstico sin cargo
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

      <Section className="border-y border-[color:var(--border)] bg-surface/40">
        <h2 className="text-3xl font-semibold md:text-4xl">Qué resolvemos</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {service.solves.map((item) => (
            <GlowCard key={item}>
              <p className="text-sm text-muted">{item}</p>
            </GlowCard>
          ))}
        </div>
      </Section>

      <Section>
        <h2 className="text-3xl font-semibold md:text-4xl">Qué implementamos</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {service.implements.map((item) => (
            <div key={item} className="rounded-xl border border-[color:var(--border)] bg-card/80 p-4">
              <p className="text-sm text-muted">{item}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="border-y border-[color:var(--border)] bg-surface/40">
        <h2 className="text-3xl font-semibold md:text-4xl">Cómo trabajamos</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {serviceProcessSteps.map((step, index) => (
            <div key={step} className="rounded-2xl border border-[color:var(--border)] bg-card/70 p-5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-brand/50 text-xs text-brandBright">
                {index + 1}
              </span>
              <p className="mt-4 text-sm font-medium text-text">{step}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <h2 className="text-3xl font-semibold md:text-4xl">Resultados típicos</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Benchmarks generales de implementaciones de automatización bien ejecutadas.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {service.metrics.map((metric) => (
            <GlowCard key={metric.label}>
              <p className="text-3xl font-semibold text-brandBright">{metric.value}</p>
              <p className="mt-2 text-sm text-muted">{metric.label}</p>
            </GlowCard>
          ))}
        </div>
      </Section>

      <Section className="border-y border-[color:var(--border)] bg-surface/40">
        <h2 className="text-3xl font-semibold md:text-4xl">FAQ</h2>
        <div className="mt-6 grid gap-4">
          {service.faqs.map((faq) => (
            <GlowCard key={faq.question}>
              <h3 className="text-lg font-semibold">{faq.question}</h3>
              <p className="mt-2 text-sm text-muted">{faq.answer}</p>
            </GlowCard>
          ))}
        </div>
      </Section>

      <Section className="pb-24">
        <div className="rounded-3xl border border-brand/40 bg-card p-8 md:p-12">
          <h2 className="max-w-3xl text-balance text-3xl font-semibold md:text-5xl">
            Diagnóstico inicial (sin cargo)
          </h2>
          <p className="mt-4 max-w-2xl text-muted md:text-lg">
            Te devolvemos un plan de acción claro en 24 hs hábiles para implementar este servicio con impacto real.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryButton href="/contacto" ariaLabel="Agendar diagnóstico sin cargo en contacto">
              Agendar diagnóstico sin cargo
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

