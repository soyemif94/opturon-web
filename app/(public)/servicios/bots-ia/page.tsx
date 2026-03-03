import type { Metadata } from "next";
import { ServiceLandingPage } from "@/components/services/ServiceLandingPage";
import { getServiceBySlugOrThrow } from "@/lib/services";

const service = getServiceBySlugOrThrow("bots-ia");

export const metadata: Metadata = {
  title: "Bots IA | Opturon",
  description:
    "Bots IA para empresas con lógica de negocio, atención inteligente y automatización operativa real.",
  openGraph: {
    title: "Bots IA | Opturon",
    description: "Asistentes IA diseñados para resolver tareas de negocio con control.",
    images: ["/og"]
  }
};

export default function BotsIaPage() {
  return <ServiceLandingPage service={service} />;
}
