import type { Metadata } from "next";
import { HomePageEvents } from "@/components/analytics/HomePageEvents";
import { HomeDifferentiator } from "@/components/sections/HomeDifferentiator";
import { HomeFaq } from "@/components/sections/HomeFaq";
import { HomeFinalCta } from "@/components/sections/HomeFinalCta";
import { HomeHero } from "@/components/sections/HomeHero";
import { HomePackages } from "@/components/sections/HomePackages";
import { HomeProblems } from "@/components/sections/HomeProblems";
import { HomeProcess } from "@/components/sections/HomeProcess";
import { HomeResults } from "@/components/sections/HomeResults";
import { HomeServices } from "@/components/sections/HomeServices";
import { HomeSolution } from "@/components/sections/HomeSolution";
import { HomeStickyWhatsAppCta } from "@/components/sections/HomeStickyWhatsAppCta";

export const metadata: Metadata = {
  metadataBase: new URL("https://opturon.com"),
  title: {
    default: "Opturon | CRM conversacional para vender por WhatsApp",
    template: "%s | Opturon"
  },
  description:
    "Organiza conversaciones, automatiza seguimiento y convierte WhatsApp en tu sistema de ventas con Opturon.",
  keywords: [
    "crm whatsapp",
    "ventas por whatsapp",
    "inbox whatsapp para empresas",
    "pipeline de ventas whatsapp",
    "seguimiento automatico leads",
    "crm conversacional",
    "opturon"
  ],
  openGraph: {
    title: "Opturon | Convierte WhatsApp en tu sistema de ventas",
    description: "Inbox, pipeline, contactos, automatizaciones y metricas para vender mejor desde WhatsApp.",
    url: "https://opturon.com",
    siteName: "Opturon",
    type: "website",
    locale: "es_AR",
    images: [{ url: "/og", width: 1200, height: 630, alt: "Opturon - CRM conversacional para ventas" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Opturon | CRM conversacional para WhatsApp",
    description: "Organiza clientes, automatiza seguimiento y cierra mas ventas desde un solo lugar.",
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
      name: "CRM conversacional para ventas por WhatsApp",
      provider: {
        "@id": "https://opturon.com/#organization"
      },
      areaServed: "AR",
      serviceType: "CRM conversacional, inbox de ventas, pipeline y automatizaciones para WhatsApp"
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
      <HomeServices />
      <HomeDifferentiator />
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
