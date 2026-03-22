import Link from "next/link";
import { Cable, LifeBuoy, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { WhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";
import { getTrackedWhatsAppLink } from "@/lib/whatsapp";

const SUPPORT_LINK = getTrackedWhatsAppLink({
  origin: "audit-intake",
  prefill: "Hola Opturon. Necesito ayuda para conectar WhatsApp Business en mi espacio de Opturon."
});

export function InboxConnectionEmptyState({ status }: { status: WhatsAppConnectionStatus }) {
  const isAmbiguous = status.state === "ambiguous_configuration";

  return (
    <Card className="overflow-hidden border-brand/20 bg-[linear-gradient(135deg,rgba(192,80,0,0.14),rgba(18,18,18,0.96)_48%,rgba(13,13,13,0.98))] shadow-[0_18px_60px_rgba(176,80,0,0.14)]">
      <CardContent className="p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] lg:items-center">
          <div>
            <Badge variant={isAmbiguous ? "danger" : "warning"}>
              {isAmbiguous ? "Configuracion pendiente" : "Onboarding de WhatsApp"}
            </Badge>
            <div className="mt-4 flex items-start gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-brand/25 bg-brand/12 text-brandBright">
                <Cable className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{status.title}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{status.description}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-black/15 p-4">
              <div className="flex items-start gap-3">
                <MessageSquareText className="mt-0.5 h-4 w-4 text-brandBright" />
                <p className="text-sm leading-7 text-muted">
                  {status.helper}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="rounded-2xl px-5">
                <Link href="/app/integrations">
                  {isAmbiguous ? "Revisar conexion" : "Conectar WhatsApp"}
                </Link>
              </Button>
              <Button asChild variant="secondary" className="rounded-2xl px-5">
                <Link href="/app/integrations">Ir a integraciones</Link>
              </Button>
              <Button asChild variant="ghost" className="rounded-2xl px-5">
                <a href={SUPPORT_LINK} target="_blank" rel="noreferrer">
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  Necesito ayuda
                </a>
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Cuando conectes tu canal</p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-muted">
                <li>Vas a recibir conversaciones reales en este inbox.</li>
                <li>Tu equipo va a poder responder desde Opturon.</li>
                <li>Las automatizaciones van a trabajar sobre el canal correcto.</li>
              </ul>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Estado actual</p>
              <p className="mt-3 text-sm leading-7 text-muted">
                {isAmbiguous
                  ? "Detectamos mas de un canal posible para este espacio y por eso dejamos la bandeja en modo seguro hasta revisar la conexion."
                  : "Todavia no encontramos un canal de WhatsApp Business conectado para este espacio."}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
