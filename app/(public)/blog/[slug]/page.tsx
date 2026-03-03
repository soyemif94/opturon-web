import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Section } from "@/components/ui/Section";
import { blogCatalog, getPostBySlug } from "@/lib/blog";
import { getWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogCatalog.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return { title: "Blog | Opturon" };
  }
  return {
    title: `${post.title} | Opturon`,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} | Opturon`,
      description: post.excerpt,
      images: ["/og"]
    }
  };
}

function renderContentBlock(block: string, index: number) {
  if (block.startsWith("## ")) {
    return (
      <h2 key={index} className="mt-8 text-2xl font-semibold md:text-3xl">
        {block.replace("## ", "")}
      </h2>
    );
  }
  if (block.startsWith("### ")) {
    return (
      <h3 key={index} className="mt-6 text-xl font-semibold">
        {block.replace("### ", "")}
      </h3>
    );
  }
  return (
    <p key={index} className="mt-4 text-muted leading-7">
      {block}
    </p>
  );
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    notFound();
  }

  const whatsAppLink = getWhatsAppLink();
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: {
      "@type": "Organization",
      name: "Opturon"
    },
    publisher: {
      "@id": "https://opturon.com/#organization"
    },
    mainEntityOfPage: `https://opturon.com/blog/${post.slug}`
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Section className="pt-20 md:pt-24">
        <article className="mx-auto max-w-4xl">
          <Link href="/blog" className="text-sm text-muted transition hover:text-text">
            ← Volver al blog
          </Link>
          <h1 className="mt-4 text-balance text-4xl font-semibold md:text-5xl">{post.title}</h1>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted">
            <span>{post.date}</span>
            <span>·</span>
            <span>{post.readingTime}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-[color:var(--border)] px-2 py-1 text-xs text-muted">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-8">
            {post.content.map((block, index) => renderContentBlock(block, index))}
          </div>

          {post.relatedServiceHref ? (
            <div className="mt-10 rounded-2xl border border-[color:var(--border)] bg-card/80 p-6">
              <h3 className="text-xl font-semibold">Relacionado</h3>
              <p className="mt-2 text-sm text-muted">
                Este contenido se complementa con el siguiente servicio:
              </p>
              <Link href={post.relatedServiceHref} className="mt-4 inline-flex text-brandBright transition hover:text-brand">
                Ver servicio →
              </Link>
            </div>
          ) : null}
        </article>
      </Section>

      <Section className="pb-24">
        <div className="container-opt rounded-3xl border border-brand/40 bg-card p-8 md:p-12">
          <h2 className="text-3xl font-semibold md:text-4xl">Diagnostico inicial (sin cargo)</h2>
          <p className="mt-3 max-w-2xl text-muted">Si queres implementarlo en tu negocio, te devolvemos un plan en 24 hs habiles.</p>
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

