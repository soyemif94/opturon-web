import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { WebDesignPortfolio } from "@/components/portfolio/WebDesignPortfolio";
import { GlowCard } from "@/components/ui/GlowCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Section } from "@/components/ui/Section";
import { webPortfolioModels } from "@/lib/portfolio";
import { getWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Portfolio | Opturon",
  description: "Modelos de diseño web premium orientados a conversión.",
  alternates: {
    canonical: "/portfolio"
  },
  openGraph: {
    title: "Portfolio | Opturon",
    description: "Modelos de diseño web premium orientados a conversión.",
    images: ["/og"]
  },
  twitter: {
    card: "summary_large_image",
    title: "Portfolio | Opturon",
    description: "Modelos de diseño web premium orientados a conversión.",
    images: ["/og"]
  }
};

export default function PortfolioPage() {
  const whatsAppLink = getWhatsAppLink();
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Portfolio",
    url: "https://opturon.com/portfolio",
    isPartOf: { "@id": "https://opturon.com/#website" },
    itemListElement: webPortfolioModels.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.title,
      url: "https://opturon.com/servicios/diseno-web"
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Section className="pt-20 md:pt-24">
        <div className="max-w-4xl space-y-4">
          <h1 className="text-balance text-4xl font-semibold md:text-5xl">Portfolio</h1>
          <p className="text-muted md:text-lg">
            Modelos de referencia (no corresponden a clientes reales). Diseños premium orientados a conversión.
          </p>
        </div>
      </Section>

      <Section>
        <h2 className="text-3xl font-semibold md:text-4xl">Diseño Web</h2>
        <div className="mt-6">
          <WebDesignPortfolio />
        </div>
      </Section>

      <Section className="border-y border-[color:var(--border)] bg-surface/40">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {webPortfolioModels.map((model) => (
            <GlowCard key={model.id}>
              <h3 className="text-xl font-semibold">{model.title}</h3>
              <p className="mt-2 text-sm text-muted">{model.idealFor}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                {model.highlights.map((highlight) => (
                  <li key={highlight}>• {highlight}</li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/contacto" className="text-sm font-medium text-brandBright transition hover:text-brand">
                  Quiero uno así
                </Link>
                <Link href="/servicios/diseno-web" className="text-sm text-muted transition hover:text-text">
                  Ver servicio
                </Link>
              </div>
            </GlowCard>
          ))}
        </div>
      </Section>

      <Section className="pb-24">
        <div className="rounded-3xl border border-brand/40 bg-card p-8 md:p-12">
          <h2 className="text-3xl font-semibold md:text-4xl">Diagnóstico inicial (sin cargo)</h2>
          <p className="mt-3 max-w-2xl text-muted">Te devolvemos un plan de acción claro en 24 hs hábiles.</p>
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
