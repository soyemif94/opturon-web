import type { Metadata } from "next";
import { ServiceLandingPage } from "@/components/services/ServiceLandingPage";
import { getServiceBySlugOrThrow } from "@/lib/services";

const service = getServiceBySlugOrThrow("optimizacion-continua");

export const metadata: Metadata = {
  title: "Optimización continua | Opturon",
  description:
    "Optimización continua de automatizaciones para sostener resultados y escalar con métricas claras.",
  openGraph: {
    title: "Optimización continua | Opturon",
    description: "Mejoras continuas sobre automatizaciones, bots e integraciones.",
    images: ["/og"]
  }
};

export default function OptimizacionContinuaPage() {
  return <ServiceLandingPage service={service} />;
}
