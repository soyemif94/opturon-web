import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Section } from "@/components/ui/Section";
import { webPortfolioModels } from "@/lib/portfolio";
import { getServiceBySlugOrThrow, serviceProcessSteps } from "@/lib/services";
import { getWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

const service = getServiceBySlugOrThrow("diseno-web");

export const metadata: Metadata = {
  title: "Diseño Web Premium | Opturon",
  description: "Diseño y desarrollo web premium orientado a conversión: performance, SEO técnico e integraciones.",
  alternates: {
    canonical: "/servicios/diseno-web"
  },
  openGraph: {
    title: "Diseño Web Premium | Opturon",
    description: "Sitios rápidos, modernos y orientados a conversión.",
    images: ["/og"]
  },
  twitter: {
    card: "summary_large_image",
    title: "Diseño Web Premium | Opturon",
    description: "Diseño web premium orientado a conversión, performance e integraciones.",
    images: ["/og"]
  }
};

export default function DisenoWebPage() {
  const whatsAppLink = getWhatsAppLink();
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Diseño Web Premium",
    description: "Diseño y desarrollo web premium orientado a conversión.",
    provider: {
      "@id": "https://opturon.com/#organization"
    },
    areaServed: "AR",
    serviceType: "Diseño y desarrollo web"
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
          <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-tight md:text-6xl">
            Diseño Web Premium orientado a conversión
          </h1>
          <p className="max-w-3xl text-lg text-muted md:text-xl">
            Landing, institucional, ecommerce o portfolio: rápido, moderno y listo para escalar.
          </p>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton href="/contacto" ariaLabel="Agendar diagnóstico sin cargo para diseño web">
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
        <div className="max-w-4xl space-y-4">
          <h2 className="text-3xl font-semibold md:text-4xl">Escenarios de conversión pensados para negocio real</h2>
          <p className="text-sm leading-6 text-muted md:text-base">
            En esta etapa preferimos mostrar criterio real de estructura, contenido y conversión antes que mockups
            ficticios. Estos casos tipo resumen cómo organizamos una experiencia según el negocio, la conversación que
            necesita abrir y la acción que queremos conseguir.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {webPortfolioModels.slice(0, 6).map((model) => (
            <GlowCard key={model.id} className="flex h-full flex-col justify-between text-center md:text-left">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brandBright/80">Caso tipo</p>
                <h3 className="text-xl font-semibold leading-tight md:text-2xl">{model.title}</h3>
                <p className="text-sm font-medium text-text/80">{model.subtitle}</p>
              </div>

              <ul className="mt-5 space-y-2.5 text-sm leading-6 text-muted">
                {model.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start justify-center gap-2 text-left md:justify-start">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brandBright/80" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </GlowCard>
          ))}
        </div>

        <Link href="/portfolio" className="mt-6 inline-flex text-sm text-brandBright transition hover:text-brand">
          Ver portfolio completo →
        </Link>
      </Section>

      <Section className="border-y border-[color:var(--border)] bg-surface/40">
        <h2 className="text-3xl font-semibold md:text-4xl">Resultados típicos</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Benchmarks generales de proyectos web premium orientados a rendimiento y conversión.
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

      <Section>
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
            Te devolvemos un plan de acción claro en 24 hs hábiles para ejecutar este servicio con foco en conversión.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
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
