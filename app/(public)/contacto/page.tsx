import type { Metadata } from "next";
import { CheckCircle2, Clock3, MessageCircle } from "lucide-react";
import { ContactPageEvents } from "@/components/analytics/ContactPageEvents";
import { ContactLeadForm } from "@/components/contact/ContactLeadForm";
import { AuditIntake } from "@/components/lead/AuditIntake";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/Section";
import { WhatsAppCtaLink } from "@/components/ui/WhatsAppCtaLink";
import { getTrackedWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contacto | Opturon",
  description: "Agendá una auditoría estratégica inicial para automatizar WhatsApp y procesos comerciales con IA."
};

const deliverables = [
  "Mapa de oportunidades de automatización",
  "Propuesta de arquitectura (WhatsApp + integraciones)",
  "Estimación de esfuerzo y roadmap"
];

const requirements = [
  "Objetivo (ventas/soporte/operación)",
  "Volumen aproximado de mensajes",
  "Herramientas actuales (CRM/agenda)"
];

export default function ContactoPage() {
  const directWhatsAppLink = getTrackedWhatsAppLink({ origin: "contact-direct" });
  const isExternalWhatsApp = isWhatsAppExternalLink(directWhatsAppLink);

  return (
    <Section className="pt-20 md:pt-24">
      <ContactPageEvents />

      <div className="mx-auto max-w-6xl space-y-8">
        <div className="max-w-3xl space-y-3">
          <h1 className="text-balance text-4xl font-semibold md:text-5xl">Agendá una consultoría</h1>
          <p className="text-muted md:text-lg">
            Contanos qué querés automatizar y te respondemos con un plan de acción.
          </p>
        </div>

        <Card className="p-6 md:p-8">
          <AuditIntake />
          <div className="mt-5 border-t border-[color:var(--border)] pt-5">
            <p className="text-xs text-muted">¿Preferís ir directo sin completar el intake?</p>
            <WhatsAppCtaLink
              href={directWhatsAppLink}
              origin="contact-direct"
              ariaLabel="Prefiero escribir directo por WhatsApp"
              isExternal={isExternalWhatsApp}
              className="mt-3 inline-flex h-11 items-center justify-center rounded-xl border border-brand/40 bg-transparent px-5 text-sm font-semibold text-text transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand/70 hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Prefiero escribir directo
            </WhatsAppCtaLink>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="p-6 md:p-8">
            <ContactLeadForm />
          </Card>

          <div className="space-y-6">
            <Card className="p-6 md:p-8">
              <h2 className="text-xl font-semibold">Auditoría estratégica inicial (15 min)</h2>
              <ul className="mt-4 space-y-3 text-sm text-muted">
                {deliverables.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brandBright" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 inline-flex rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs text-brandBright">
                Cupos limitados por semana
              </p>
            </Card>

            <Card className="p-6 md:p-8">
              <h3 className="text-lg font-semibold">Qué necesitamos de vos</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted">
                {requirements.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brandBright" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-xl border border-[color:var(--border)] bg-surface/60 p-4">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-text">
                  <Clock3 className="h-4 w-4 text-brandBright" />
                  Tiempo de respuesta
                </p>
                <p className="mt-1 text-sm text-muted">Respondemos en menos de 24 hs hábiles.</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Section>
  );
}