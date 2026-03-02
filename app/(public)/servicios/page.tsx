import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Opturon | Servicios",
  description: "Servicios de branding, web design, ads y automation con IA."
};

const items = [
  ["Branding", "Naming, logo & identidad visual completa para posicionar tu marca."],
  ["Web Design", "Sitios y plataformas orientadas a conversión, performance y SEO."],
  ["Digital Ads", "Campañas segmentadas en Meta, Google y canales de alto impacto."],
  ["AR / VR", "Experiencias inmersivas para activaciones, eventos y producto."],
  ["AI Automation", "Flujos automáticos y bots para optimizar atención y operaciones."]
];

export default function ServiciosPage() {
  return (
    <section className="container-opt py-20">
      <h1 className="text-4xl font-semibold mb-8">Servicios</h1>
      <div className="grid gap-4">
        {items.map(([title, text]) => (
          <Card key={title} className="p-6">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-muted mt-2">{text}</p>
          </Card>
        ))}
      </div>
      <div className="mt-8">
        <Button asChild><Link href="/contacto">Quiero una propuesta</Link></Button>
      </div>
    </section>
  );
}
