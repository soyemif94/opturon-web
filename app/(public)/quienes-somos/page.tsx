import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Opturon | Quiénes Somos",
  description: "Conocé nuestro enfoque de marketing + tecnología + automatización."
};

export default function QuienesSomosPage() {
  return (
    <section className="container-opt py-20">
      <h1 className="text-4xl font-semibold mb-8">Quiénes Somos</h1>
      <Card className="p-8 space-y-4">
        <p className="text-muted">
          Somos un equipo de estrategia, diseño y tecnología enfocado en construir experiencias digitales que convierten.
        </p>
        <p className="text-muted">
          Combinamos branding, producto digital y automatización con IA para escalar resultados de negocio de forma medible.
        </p>
        <p className="text-muted">
          Nuestro enfoque: diseño claro, implementación sólida y mejora continua basada en datos.
        </p>
      </Card>
    </section>
  );
}
