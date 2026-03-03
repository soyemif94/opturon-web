import type { Metadata } from "next";
import { HomePageEvents } from "@/components/analytics/HomePageEvents";
import { HomeFaq } from "@/components/sections/HomeFaq";
import { HomeFinalCta } from "@/components/sections/HomeFinalCta";
import { HomeHero } from "@/components/sections/HomeHero";
import { HomePackages } from "@/components/sections/HomePackages";
import { HomeProblems } from "@/components/sections/HomeProblems";
import { HomeProcess } from "@/components/sections/HomeProcess";
import { HomeResults } from "@/components/sections/HomeResults";
import { HomeSolution } from "@/components/sections/HomeSolution";
import { HomeStickyWhatsAppCta } from "@/components/sections/HomeStickyWhatsAppCta";

export const metadata: Metadata = {
  metadataBase: new URL("https://opturon.com"),
  title: {
    default: "Opturon | Automatizacion Empresarial con IA",
    template: "%s | Opturon"
  },
  description:
    "Agencia de automatizacion empresarial con IA aplicada. Automatizamos WhatsApp Business, procesos internos e integraciones para escalar negocios de forma inteligente.",
  keywords: [
    "automatizacion empresarial",
    "automatizacion WhatsApp Business",
    "bots con IA para empresas",
    "integracion CRM automatizacion",
    "automatizacion de procesos",
    "agencia de automatizacion digital",
    "IA aplicada a negocios"
  ],
  openGraph: {
    title: "Opturon | Automatizacion Empresarial con IA",
    description:
      "Sistemas inteligentes que automatizan WhatsApp, procesos y operaciones para escalar negocios.",
    url: "https://opturon.com",
    siteName: "Opturon",
    type: "website",
    locale: "es_AR",
    images: [{ url: "/og", width: 1200, height: 630, alt: "Opturon - Automatizacion con IA" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Opturon | Automatizacion con IA",
    description: "Automatizamos WhatsApp, procesos y sistemas para empresas que quieren escalar.",
    images: ["/og"]
  },
  robots: {
    index: true,
    follow: true
  },
  alternates: {
    canonical: "/"
  }
};

export default function HomePage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://opturon.com/#organization",
      name: "Opturon",
      url: "https://opturon.com"
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": "https://opturon.com/#website",
      name: "Opturon",
      url: "https://opturon.com",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://opturon.com/?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Automatizacion empresarial con IA",
      provider: {
        "@id": "https://opturon.com/#organization"
      },
      areaServed: "AR",
      serviceType: "Automatizacion WhatsApp Business, Integraciones, Bots IA"
    }
  ];

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomeHero />
      <HomeProblems />
      <HomeSolution />
      <HomeProcess />
      <HomePackages />
      <HomeResults />
      <HomeFaq />
      <HomeFinalCta />
      <HomePageEvents />
      <div className="h-20 md:hidden" aria-hidden="true" />
      <HomeStickyWhatsAppCta />
    </>
  );
}
