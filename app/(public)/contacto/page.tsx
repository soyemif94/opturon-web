import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Opturon | Contacto",
  description: "Contactanos para una estrategia personalizada."
};

export default function ContactoPage() {
  const waUrl = process.env.WHATSAPP_BOOK_CALL_URL || "https://wa.me/5490000000000";

  return (
    <section className="container-opt py-20">
      <h1 className="text-4xl font-semibold mb-8">Contacto</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <Input placeholder="Nombre" aria-label="Nombre" />
          <Input type="email" placeholder="Email" aria-label="Email" />
          <Textarea placeholder="Mensaje" aria-label="Mensaje" />
          <Button type="button">Enviar</Button>
        </Card>
        <Card className="p-6 flex flex-col justify-center gap-4">
          <p className="text-muted">¿Preferís hablar por WhatsApp?</p>
          <Button asChild variant="secondary"><Link href={waUrl} target="_blank">Abrir WhatsApp</Link></Button>
        </Card>
      </div>
    </section>
  );
}
