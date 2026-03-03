import type { Metadata } from "next";
import { ServiceLandingPage } from "@/components/services/ServiceLandingPage";
import { getServiceBySlugOrThrow } from "@/lib/services";

const service = getServiceBySlugOrThrow("automatizacion-whatsapp");

export const metadata: Metadata = {
  title: "Automatización WhatsApp | Opturon",
  description:
    "Automatización de WhatsApp Business para atención, seguimiento y conversión con IA aplicada.",
  openGraph: {
    title: "Automatización WhatsApp | Opturon",
    description: "Flujos inteligentes de WhatsApp para vender y operar mejor.",
    images: ["/og"]
  }
};

export default function AutomatizacionWhatsAppPage() {
  return <ServiceLandingPage service={service} />;
}
