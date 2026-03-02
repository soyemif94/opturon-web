import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Layers, Megaphone, Palette, Sparkles, Globe, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Opturon | Inicio",
  description: "Transformando Marcas en Experiencias Digitales"
};

const services = [
  { title: "Branding", subtitle: "Naming, logo & identity", icon: Palette },
  { title: "Web Design", subtitle: "SEO Optimized", icon: Globe },
  { title: "Digital Ads", subtitle: "Targeted campaigns", icon: Megaphone },
  { title: "AR", subtitle: "Social and Apps", icon: Layers },
  { title: "VR", subtitle: "VR experiences", icon: Sparkles },
  { title: "AI Automation", subtitle: "Optimize tasks with AI", icon: BrainCircuit }
];

export default function HomePage() {
  return (
    <div>
      <section className="container-opt py-20 lg:py-28">
        <div className="max-w-3xl">
          <p className="text-brandBright text-sm mb-3">Opturon Studio</p>
          <h1 className="text-4xl lg:text-6xl font-semibold leading-tight">Transformando Marcas en Experiencias Digitales</h1>
          <p className="mt-5 text-lg text-muted max-w-2xl">Traemos el futuro a tu negocio.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/servicios">Saber más <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/contacto">Agendar reunión</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-opt pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Card key={service.title} className="p-6 hover:border-brand/40 transition">
                <Icon className="h-5 w-5 text-brandBright mb-3" />
                <h3 className="font-semibold text-lg">{service.title}</h3>
                <p className="text-muted mt-1">{service.subtitle}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="container-opt pb-20">
        <Card className="p-8 lg:p-12 bg-brand-linear border-brand/20">
          <h2 className="text-3xl font-semibold mb-3">Sobre Nosotros</h2>
          <p className="text-muted max-w-3xl">
            La única agencia de Marketing en el mercado que utiliza la última tecnología para impulsar tu marca a otro nivel.
          </p>
        </Card>
      </section>

      <section className="container-opt pb-24">
        <Card className="p-8 lg:p-12 flex flex-col gap-5 items-start">
          <h3 className="text-2xl font-semibold">Habla con nosotros para una estrategia personalizada.</h3>
          <Button asChild>
            <Link href="/contacto"><Bot className="mr-2 h-4 w-4" /> Agendar Reunión</Link>
          </Button>
        </Card>
      </section>
    </div>
  );
}
