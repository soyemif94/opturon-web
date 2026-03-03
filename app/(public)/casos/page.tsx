import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { CaseCard } from "@/components/cases/CaseCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Section } from "@/components/ui/Section";
import { casesCatalog } from "@/lib/cases";
import { getWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Casos | Opturon",
  description: "Casos tipo de automatizacion con IA para WhatsApp, integraciones y operacion. Benchmarks orientativos sin marcas.",
  openGraph: {
    title: "Casos | Opturon",
    description: "Casos tipo y benchmarks orientativos de implementaciones de automatizacion.",
    images: ["/og"]
  }
};

export default function CasosPage() {
  const whatsAppLink = getWhatsAppLink();
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Casos tipo de automatizacion",
    url: "https://opturon.com/casos",
    itemListElement: casesCatalog.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://opturon.com/casos/${item.slug}`,
      name: item.title
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
          <h1 className="text-balance text-4xl font-semibold md:text-5xl">Casos</h1>
          <p className="text-muted md:text-lg">
            Estos son casos tipo sin marcas ni clientes nombrados. Los resultados se presentan como benchmarks orientativos segun implementacion y contexto operativo.
          </p>
        </div>
      </Section>

      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          {casesCatalog.map((item) => (
            <CaseCard key={item.slug} item={item} />
          ))}
        </div>
      </Section>

      <Section className="pb-24">
        <div className="rounded-3xl border border-brand/40 bg-card p-8 md:p-12">
          <h2 className="text-3xl font-semibold md:text-4xl">Diagnostico sin cargo</h2>
          <p className="mt-3 max-w-2xl text-muted">
            Si queres aplicar estos enfoques a tu negocio, armamos una hoja de ruta inicial con foco en impacto.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryButton href="/contacto" ariaLabel="Ir a contacto para diagnostico sin cargo">
              Diagnostico sin cargo
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

