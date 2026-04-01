import type { Metadata } from "next";
import Link from "next/link";
import { GlowCard } from "@/components/ui/GlowCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Section } from "@/components/ui/Section";
import { webPortfolioModels } from "@/lib/portfolio";

export const metadata: Metadata = {
  title: "Portfolio | Opturon",
  description: "Casos tipo de conversion pensados para distintos tipos de negocio.",
  alternates: {
    canonical: "/portfolio"
  },
  openGraph: {
    title: "Portfolio | Opturon",
    description: "Casos tipo de conversion pensados para distintos tipos de negocio.",
    images: ["/og"]
  },
  twitter: {
    card: "summary_large_image",
    title: "Portfolio | Opturon",
    description: "Casos tipo de conversion pensados para distintos tipos de negocio.",
    images: ["/og"]
  }
};

export default function PortfolioPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Portfolio",
    url: "https://opturon.com/portfolio",
    isPartOf: { "@id": "https://opturon.com/#website" },
    itemListElement: webPortfolioModels.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${item.title} - ${item.subtitle}`,
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
        <div className="max-w-5xl space-y-5">
          <h1 className="max-w-4xl text-balance text-4xl font-semibold md:text-5xl">
            Diseñamos experiencias que convierten.
          </h1>
          <p className="max-w-4xl text-base leading-7 text-muted md:text-lg">
            Reunimos este portfolio como una selección de escenarios de conversión para mostrar cómo pensamos cada
            sistema según el tipo de negocio, la conversación que necesita abrir y la acción que buscamos conseguir.
          </p>
        </div>
      </Section>

      <Section className="border-y border-[color:var(--border)] bg-surface/40">
        <div className="max-w-4xl space-y-4">
          <h2 className="text-3xl font-semibold md:text-4xl">Casos tipo pensados para negocio real</h2>
          <p className="text-sm leading-6 text-muted md:text-base">
            Cada card resume un escenario donde diseno, contenido y flujo trabajan juntos para mover al usuario hacia
            una accion concreta. Sin imagenes fake, sin promesas vacias, con foco en conversion.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {webPortfolioModels.map((model) => (
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

              <div className="mt-5 flex flex-wrap justify-center gap-3 md:justify-start">
                <Link href="/contacto" className="text-sm font-medium text-brandBright transition hover:text-brand">
                  Quiero este enfoque
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
          <div className="max-w-4xl space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brandBright/80">
              Cierre de portfolio
            </p>
            <h2 className="max-w-3xl text-balance text-3xl font-semibold md:text-5xl">
              Esto no es solo diseño. Es el sistema que implementamos en tu negocio.
            </h2>
            <p className="max-w-3xl text-base leading-7 text-muted md:text-lg">
              Cada ejemplo de esta seccion esta pensado para resolver un problema real: ordenar la propuesta, guiar la
              conversacion correcta y acercar al usuario a una accion concreta. Despues del diseño viene la parte
              importante: como se conecta eso con tu proceso comercial para convertir mejor.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryButton href="/servicios/diseno-web" ariaLabel="Ver cómo funciona el sistema de diseño web de Opturon">
              Ver cómo funciona
            </PrimaryButton>
            <Link
              href="/contacto"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-brand/40 bg-transparent px-5 text-sm font-semibold text-text transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand/70 hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Quiero este sistema en mi negocio
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
