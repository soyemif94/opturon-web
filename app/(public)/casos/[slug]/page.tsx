import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Section } from "@/components/ui/Section";
import { casesCatalog, getCaseBySlug } from "@/lib/cases";
import { getWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return casesCatalog.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getCaseBySlug(slug);
  if (!item) {
    return { title: "Caso | Opturon" };
  }
  return {
    title: `${item.title} | Opturon`,
    description: item.summary,
    openGraph: {
      title: `${item.title} | Opturon`,
      description: item.summary,
      images: ["/og"]
    }
  };
}

export default async function CasoDetallePage({ params }: PageProps) {
  const { slug } = await params;
  const item = getCaseBySlug(slug);
  if (!item) {
    notFound();
  }

  const whatsAppLink = getWhatsAppLink();
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    description: item.summary,
    url: `https://opturon.com/casos/${item.slug}`,
    publisher: {
      "@id": "https://opturon.com/#organization"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Section className="pt-20 md:pt-24">
        <div className="space-y-5">
          <Link href="/casos" className="text-sm text-muted transition hover:text-text">
            ← Ver todos los casos
          </Link>
          <h1 className="max-w-4xl text-balance text-4xl font-semibold md:text-6xl">{item.title}</h1>
          <p className="max-w-3xl text-lg text-muted md:text-xl">{item.summary}</p>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton href="/contacto" ariaLabel="Agendar diagnostico sin cargo">
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

      <Section className="border-y border-[color:var(--border)] bg-surface/40">
        <h2 className="text-3xl font-semibold md:text-4xl">Situacion</h2>
        <p className="mt-4 max-w-3xl text-muted">{item.situation}</p>
      </Section>

      <Section>
        <h2 className="text-3xl font-semibold md:text-4xl">Solucion</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <GlowCard className="md:col-span-2">
            <p className="text-muted">{item.solution}</p>
          </GlowCard>
        </div>
      </Section>

      <Section className="border-y border-[color:var(--border)] bg-surface/40">
        <h2 className="text-3xl font-semibold md:text-4xl">Resultado tipico (benchmark)</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {item.outcomeBullets.map((bullet) => (
            <GlowCard key={bullet}>
              <p className="text-sm text-muted">{bullet}</p>
            </GlowCard>
          ))}
        </div>
      </Section>

      <Section>
        <h2 className="text-3xl font-semibold md:text-4xl">Stack e integraciones consideradas</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {item.stackBullets.map((bullet) => (
            <GlowCard key={bullet}>
              <p className="text-sm text-muted">{bullet}</p>
            </GlowCard>
          ))}
        </div>
      </Section>

      <Section className="border-y border-[color:var(--border)] bg-surface/40">
        <h2 className="text-3xl font-semibold md:text-4xl">Servicio recomendado</h2>
        <p className="mt-3 text-muted">Este caso se alinea con el siguiente servicio principal:</p>
        <Link href={item.relatedServiceHref} className="mt-4 inline-flex text-brandBright transition hover:text-brand">
          Ver servicio recomendado →
        </Link>
      </Section>

      <Section className="pb-24">
        <div className="rounded-3xl border border-brand/40 bg-card p-8 md:p-12">
          <h2 className="text-3xl font-semibold md:text-5xl">Diagnostico inicial (sin cargo)</h2>
          <p className="mt-4 max-w-2xl text-muted">Te devolvemos una hoja de ruta accionable en 24 hs habiles.</p>
          <div className="mt-6">
            <PrimaryButton href="/contacto" ariaLabel={item.ctaLabel || "Quiero aplicar este enfoque"}>
              {item.ctaLabel || "Quiero aplicar este enfoque"}
            </PrimaryButton>
          </div>
        </div>
      </Section>
    </>
  );
}

