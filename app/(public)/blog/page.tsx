import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Section } from "@/components/ui/Section";
import { blogCatalog } from "@/lib/blog";
import { getWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Blog | Opturon",
  description: "Recursos tecnicos sobre automatizacion con IA, WhatsApp e integraciones para equipos de negocio.",
  openGraph: {
    title: "Blog | Opturon",
    description: "Recursos tecnicos sobre automatizacion e integraciones.",
    images: ["/og"]
  }
};

export default function BlogPage() {
  const whatsAppLink = getWhatsAppLink();
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  const tags = Array.from(new Set(blogCatalog.flatMap((post) => post.tags)));
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog de Opturon",
    url: "https://opturon.com/blog",
    itemListElement: blogCatalog.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://opturon.com/blog/${post.slug}`,
      name: post.title
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
          <h1 className="text-balance text-4xl font-semibold md:text-5xl">Blog</h1>
          <p className="text-muted md:text-lg">
            Recursos tecnicos sobre automatizacion con IA, WhatsApp e integraciones para equipos que buscan escalar con orden.
          </p>
        </div>
      </Section>

      <Section>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4">
            {blogCatalog.map((post) => (
              <GlowCard key={post.slug}>
                <p className="text-xs text-muted">{post.date} · {post.readingTime}</p>
                <h2 className="mt-2 text-2xl font-semibold">{post.title}</h2>
                <p className="mt-2 text-sm text-muted">{post.excerpt}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-[color:var(--border)] px-2 py-1 text-xs text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link href={`/blog/${post.slug}`} className="mt-5 inline-flex text-sm font-medium text-brandBright transition hover:text-brand">
                  Leer articulo →
                </Link>
              </GlowCard>
            ))}
          </div>

          <GlowCard>
            <h3 className="text-lg font-semibold">Tags</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-[color:var(--border)] px-2 py-1 text-xs text-muted">
                  {tag}
                </span>
              ))}
            </div>
          </GlowCard>
        </div>
      </Section>

      <Section className="pb-24">
        <div className="rounded-3xl border border-brand/40 bg-card p-8 md:p-12">
          <h2 className="text-3xl font-semibold md:text-4xl">Queres aplicar esto en tu operacion?</h2>
          <p className="mt-3 max-w-2xl text-muted">
            Te ayudamos a pasar de teoria a implementacion con un diagnostico inicial sin cargo.
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

