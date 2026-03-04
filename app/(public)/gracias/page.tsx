import { CheckCircle2 } from "lucide-react";
import { ThankYouPageEvents } from "@/components/analytics/ThankYouPageEvents";
import { ThankYouWhatsAppRetryCta } from "@/components/lead/ThankYouWhatsAppRetryCta";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Section } from "@/components/ui/Section";
import { getTrackedWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

const nextSteps = [
  "Revisión rápida del contexto (2-5 min)",
  "3 preguntas para confirmar alcance",
  "Siguiente paso: propuesta 1-página (USD 1000-3000)"
];

export default function GraciasPage() {
  const whatsAppLink = getTrackedWhatsAppLink({ origin: "thank-you" });
  const isExternal = isWhatsAppExternalLink(whatsAppLink);

  return (
    <Section className="pt-20 md:pt-24">
      <ThankYouPageEvents />

      <div className="mx-auto max-w-3xl rounded-2xl border border-[color:var(--border)] bg-card/80 p-7 shadow-brand md:p-10">
        <h1 className="text-balance text-3xl font-semibold md:text-4xl">Listo. Recibimos tu solicitud.</h1>
        <p className="mt-3 text-muted md:text-lg">
          Abrimos WhatsApp con el detalle para responderte con próximos pasos.
        </p>

        <ul className="mt-7 space-y-3">
          {nextSteps.map((step) => (
            <li key={step} className="flex items-start gap-2.5 text-sm text-text md:text-base">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brandBright" />
              <span>{step}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <PrimaryButton href="/" ariaLabel="Volver al inicio">
            Volver al inicio
          </PrimaryButton>
          <ThankYouWhatsAppRetryCta
            href={whatsAppLink}
            isExternal={isExternal}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-brand/40 bg-transparent px-5 text-sm font-semibold text-text transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand/70 hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          />
        </div>

        <p className="mt-6 text-xs text-muted">Respuesta en el día hábil (lun-vie) · Sin compromiso</p>
      </div>
    </Section>
  );
}
