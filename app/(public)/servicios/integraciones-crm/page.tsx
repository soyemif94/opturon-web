import type { Metadata } from "next";
import { ServiceLandingPage } from "@/components/services/ServiceLandingPage";
import { getServiceBySlugOrThrow } from "@/lib/services";

const service = getServiceBySlugOrThrow("integraciones-crm");

export const metadata: Metadata = {
  title: "Integraciones CRM | Opturon",
  description:
    "Integraciones CRM con WhatsApp y procesos internos para operar con datos conectados y menos fricción.",
  openGraph: {
    title: "Integraciones CRM | Opturon",
    description: "Conectá CRM, WhatsApp y operación para escalar con orden.",
    images: ["/og"]
  }
};

export default function IntegracionesCrmPage() {
  return <ServiceLandingPage service={service} />;
}
