import type { Metadata } from "next";
import { HomePageEvents } from "@/components/analytics/HomePageEvents";
import { SaasHome } from "@/components/sections/SaasHome";

export const metadata: Metadata = {
  metadataBase: new URL("https://opturon.com"),
  title: {
    default: "Opturon | Plataforma para conectar ventas y operación",
    template: "%s | Opturon"
  },
  description:
    "Conectá conversaciones, clientes, pedidos, stock, cobros y equipo en una plataforma comercial diseñada para operar con más control.",
  keywords: [
    "software para distribuidoras",
    "plataforma de ventas",
    "gestión de pedidos y stock",
    "automatización comercial",
    "crm omnicanal",
    "ventas por WhatsApp e Instagram",
    "opturon"
  ],
  openGraph: {
    title: "Opturon | Toda tu operación comercial conectada",
    description:
      "Una plataforma para convertir conversaciones en pedidos y coordinar clientes, stock, cobros y equipo desde un solo lugar.",
    url: "https://opturon.com",
    siteName: "Opturon",
    type: "website",
    locale: "es_AR",
    images: [{ url: "/og", width: 1200, height: 630, alt: "Opturon, plataforma de operación comercial" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Opturon | Plataforma de operación comercial",
    description: "Ventas, clientes, pedidos, stock, cobros y seguimiento en un mismo sistema.",
    images: ["/og"]
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" }
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
      url: "https://opturon.com"
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Opturon",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Plataforma SaaS para conectar conversaciones, clientes, pedidos, stock, cobros, automatizaciones y reportes.",
      provider: { "@id": "https://opturon.com/#organization" }
    }
  ];

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SaasHome />
      <HomePageEvents />
    </>
  );
}
