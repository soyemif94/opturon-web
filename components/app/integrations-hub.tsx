"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  Bot,
  Clock3,
  LifeBuoy,
  MessageSquareText,
  PhoneCall,
  PlugZap,
  RefreshCw,
  ShieldAlert
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortalWhatsAppStatus } from "@/lib/api";
import type { PortalInstagramCandidate, PortalInstagramStatus } from "@/lib/api";
import type { WhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";
import { getTrackedWhatsAppLink } from "@/lib/whatsapp";

type IntegrationState = "not_connected" | "connecting" | "connected" | "error";

type ProductCard = {
  id: string;
  name: string;
  description: string;
  state: IntegrationState;
  availability: "operativo" | "proximo" | "interno";
  helper: string;
  detail: string;
  href?: string;
};

const SUPPORT_LINK = getTrackedWhatsAppLink({
  origin: "audit-intake",
  prefill: "Hola Opturon. Necesito ayuda para conectar WhatsApp Business en mi espacio."
});

const productCards: ProductCard[] = [
  {
    id: "crm",
    name: "CRM externo",
    description: "Siguiente fase real para empujar contactos, actividad y contexto comercial fuera de Opturon.",
    state: "not_connected",
    availability: "proximo",
    helper: "Visible como siguiente paso, sin prometer una conexion ya lista.",
    detail: "Se mantiene en la narrativa del producto, pero sin abrir una configuracion inmadura."
  },
  {
    id: "agenda",
    name: "Agenda de Opturon",
    description: "Modulo nativo para disponibilidad, notas, seguimientos y futura reserva de turnos.",
    state: "connected",
    availability: "interno",
    helper: "No se trata como integracion externa ni abre Google Calendar en esta fase.",
    detail: "La agenda vive dentro del dashboard y queda lista para crecer junto al inbox y al bot.",
    href: "/app/agenda"
  }
];

export function IntegrationsHub({
  whatsapp,
  whatsappStatus,
  instagramStatus
}: {
  whatsapp: WhatsAppConnectionStatus;
  whatsappStatus: PortalWhatsAppStatus | null;
  instagramStatus: PortalInstagramStatus | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [liveWhatsApp, setLiveWhatsApp] = useState(whatsapp);
  const [liveWhatsAppStatus, setLiveWhatsAppStatus] = useState(whatsappStatus);
  const [liveInstagramStatus, setLiveInstagramStatus] = useState(instagramStatus);
  const [instagramBusy, setInstagramBusy] = useState(false);
  const [instagramError, setInstagramError] = useState<string | null>(null);
  const [assetSelection, setAssetSelection] = useState(() => readInstagramAssetSelection(searchParams));
  const [selectedInstagramAssetKey, setSelectedInstagramAssetKey] = useState(() => assetSelection?.candidates[0] ? instagramAssetKey(assetSelection.candidates[0]) : "");

  const effectiveState = liveWhatsApp.state;

  const meta = useMemo(
    () => whatsappHubMeta(liveWhatsApp, effectiveState, null),
    [effectiveState, liveWhatsApp]
  );

  async function refreshWhatsAppStatus() {
    const [connectionResponse, statusResponse] = await Promise.all([
      fetch("/api/app/integrations/whatsapp", { cache: "no-store" }),
      fetch("/api/app/integrations/whatsapp/status", { cache: "no-store" }).catch(() => null)
    ]);

    if (connectionResponse.ok) {
      const json = (await connectionResponse.json().catch(() => null)) as { data?: WhatsAppConnectionStatus } | null;
      if (json?.data) {
        setLiveWhatsApp(json.data);
      }
    }

    if (statusResponse && statusResponse.ok) {
      const statusJson = (await statusResponse.json().catch(() => null)) as { data?: PortalWhatsAppStatus } | null;
      if (statusJson?.data) {
        setLiveWhatsAppStatus(statusJson.data);
      }
    }

    router.refresh();
  }

  async function refreshInstagramStatus() {
    const response = await fetch("/api/app/integrations/instagram", { cache: "no-store" });
    if (!response.ok) return;
    const json = (await response.json().catch(() => null)) as { data?: PortalInstagramStatus } | null;
    if (json?.data) {
      setLiveInstagramStatus(json.data);
    }
  }

  async function connectSelectedInstagramAsset() {
    if (!assetSelection || !selectedInstagramAssetKey || instagramBusy) return;
    const selectedAsset = assetSelection.candidates.find((candidate) => instagramAssetKey(candidate) === selectedInstagramAssetKey);
    if (!selectedAsset) return;

    setInstagramBusy(true);
    setInstagramError(null);
    try {
      const response = await fetch("/api/app/integrations/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectionToken: assetSelection.selectionToken,
          selectedPageId: selectedAsset.pageId || "",
          selectedInstagramUserId: selectedAsset.instagramUserId || ""
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "instagram_connect_failed"));
      }
      setAssetSelection(null);
      setSelectedInstagramAssetKey("");
      await refreshInstagramStatus();
      router.replace("/app/integrations?instagram=connected");
      router.refresh();
    } catch (error) {
      setInstagramError(error instanceof Error ? error.message : "instagram_connect_failed");
    } finally {
      setInstagramBusy(false);
    }
  }

  const connected = liveWhatsApp.state === "connected" || Boolean(liveWhatsAppStatus?.channel.connected);
  const webhookRecent = Number(liveWhatsAppStatus?.webhook.events24h || 0) > 0;
  const handoffsOpen = Number(liveWhatsAppStatus?.handoffs.openCount || 0) > 0;
  const connectedNumber = liveWhatsAppStatus?.channel.displayPhoneNumber || liveWhatsApp.connectedNumber || liveWhatsAppStatus?.channel.phoneNumberId || "Pendiente";
  const lastWebhook = formatDateTime(liveWhatsAppStatus?.webhook.lastReceived?.receivedAt || null) || "Sin registro";
  const healthLabel = connected && webhookRecent ? "Canal operativo" : connected ? "Revisar entrega Meta/Webhooks" : "Pendiente de conexion";

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(236,128,38,0.28),transparent_34%),linear-gradient(135deg,rgba(18,18,18,0.98),rgba(7,7,8,0.94))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-5 flex flex-wrap gap-2">
              <Badge variant={connected ? "success" : "warning"}>{connected ? "WhatsApp activo" : "WhatsApp pendiente"}</Badge>
              <Badge variant={webhookRecent ? "success" : "muted"}>Operacion en vivo</Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">Integraciones</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68 md:text-base">
              Conexiones reales del producto, estado operativo y proximos canales.
            </p>
          </div>
          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/72">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Salud del canal</p>
            <p className="mt-2 text-lg font-semibold text-white">{healthLabel}</p>
            <p className="mt-1">Ultimo webhook: {lastWebhook}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <Card className="overflow-hidden border-brand/20 bg-[linear-gradient(150deg,rgba(192,80,0,0.14),rgba(22,22,24,0.98)_42%,rgba(12,12,13,0.96))] shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
          <CardContent className="space-y-6 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-brand/30 bg-brand/15 text-brandBright">
                  {meta.state === "ambiguous_configuration" ? <ShieldAlert className="h-6 w-6" /> : <PhoneCall className="h-6 w-6" />}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">WhatsApp Business</h2>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/64">{meta.description}</p>
                </div>
              </div>
              <Badge variant={handoffsOpen ? "warning" : "success"}>{handoffsOpen ? "Handoffs abiertos" : healthLabel}</Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <StatusMetric label="Numero conectado" value={connectedNumber} elevated />
              <StatusMetric label="Bot" value={liveWhatsAppStatus?.botRuntime.enabled === false ? "Pausado" : "Activo"} icon={<Bot className="h-4 w-4" />} elevated />
              <StatusMetric label="Webhook" value={lastWebhook} icon={<Clock3 className="h-4 w-4" />} elevated />
              <StatusMetric label="Provider" value={liveWhatsAppStatus?.channel.provider || liveWhatsApp.channelStatus || "-"} icon={<PlugZap className="h-4 w-4" />} elevated />
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
                <p className="font-medium text-white">{healthLabel}</p>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/62">{meta.helper}</p>
              {handoffsOpen ? (
                <p className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                  {liveWhatsAppStatus?.handoffs.openCount || 0} conversaciones estan derivadas a humano; el bot no responde ahi hasta cerrar handoff o reactivar bot.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-2xl px-5">
                <Link href="/app/inbox">Abrir inbox</Link>
              </Button>
              <Button variant="secondary" className="rounded-2xl px-5" onClick={() => void refreshWhatsAppStatus()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refrescar estado
              </Button>
              <Button asChild variant="ghost" className="rounded-2xl px-5">
                <a href={SUPPORT_LINK} target="_blank" rel="noreferrer">
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  {meta.supportLabel}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-card/90">
          <CardHeader action={<Badge variant="muted">Identidad</Badge>}>
            <div>
              <CardTitle className="text-xl">Bot configurado</CardTitle>
              <CardDescription>La identidad que usa WhatsApp en esta conexion.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="rounded-[24px] border border-brand/20 bg-brand/10 p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Nombre del bot</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{liveWhatsAppStatus?.botConfig.botName || "Sin personalizar"}</p>
            </div>
            <div className="grid gap-3">
              <StatusRow label="Config personalizada" value={liveWhatsAppStatus?.botConfig.hasCustomConfig ? "Si" : "No"} />
              <StatusRow label="Saludo personalizado" value={liveWhatsAppStatus?.botConfig.hasCustomGreeting ? "Si" : "No"} />
              <StatusRow label="Fallback personalizado" value={liveWhatsAppStatus?.botConfig.hasCustomFallback ? "Si" : "No"} />
            </div>
          </CardContent>
        </Card>
      </section>

      <WhatsAppStatusPanel status={liveWhatsAppStatus} onRefresh={() => void refreshWhatsAppStatus()} />

      <InstagramConnectionPanel
        status={liveInstagramStatus}
        errorReason={instagramError || searchParams.get("reason")}
        mode={searchParams.get("instagram")}
        assetSelection={assetSelection}
        selectedAssetKey={selectedInstagramAssetKey}
        busy={instagramBusy}
        onSelectedAssetKeyChange={setSelectedInstagramAssetKey}
        onConnectSelectedAsset={() => void connectSelectedInstagramAsset()}
        onRefresh={() => void refreshInstagramStatus()}
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Roadmap de conexiones</h2>
            <p className="text-sm text-muted">WhatsApp queda al frente; el resto acompana sin competir por jerarquia.</p>
          </div>
          <Badge variant="muted">Proximos canales</Badge>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {productCards.map((integration) => {
            const state = stateMeta(integration.state);
            return (
              <Card key={integration.id} className="border-white/6 bg-card/80">
                <CardHeader action={<Badge variant={state.variant}>{state.label}</Badge>}>
                  <div>
                    <CardTitle className="text-xl">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{integration.availability}</Badge>
                    <Badge variant="muted">{integration.helper}</Badge>
                  </div>
                  <p className="text-sm leading-6 text-muted">{integration.detail}</p>
                  {integration.href ? (
                    <Button asChild variant="secondary" className="w-full rounded-2xl">
                      <Link href={integration.href}>Abrir modulo</Link>
                    </Button>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-bg/35 px-4 py-3 text-sm text-muted">
                      Proximo paso visible, sin configuracion abierta todavia.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <Card className="border-white/6 bg-card/60">
            <CardHeader action={<Badge variant="muted">Secundario</Badge>}>
              <div>
                <CardTitle className="text-xl">Fuera de foco</CardTitle>
                <CardDescription>Canales que no compiten con WhatsApp hasta tener madurez operativa.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {[
                "Messenger queda fuera del frente principal hasta tener madurez operativa.",
                "Webchat no compite hasta tener madurez real.",
                "Google Calendar no se abre porque Agenda es nativa."
              ].map((item) => (
                <p key={item} className="text-sm leading-6 text-muted">{item}</p>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

    </div>
  );
}

function InstagramConnectionPanel({
  status,
  errorReason,
  mode,
  assetSelection,
  selectedAssetKey,
  busy,
  onSelectedAssetKeyChange,
  onConnectSelectedAsset,
  onRefresh
}: {
  status: PortalInstagramStatus | null;
  errorReason?: string | null;
  mode?: string | null;
  assetSelection: InstagramAssetSelection | null;
  selectedAssetKey: string;
  busy?: boolean;
  onSelectedAssetKeyChange: (value: string) => void;
  onConnectSelectedAsset: () => void;
  onRefresh: () => void;
}) {
  const connected = status?.state === "connected" && Boolean(status.channel);
  const channel = status?.channel || null;
  const errorCopy = errorReason ? instagramErrorCopy(errorReason) : null;
  const needsSelection = mode === "select" && assetSelection && assetSelection.candidates.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Instagram</h2>
          <p className="text-sm text-muted">Canal de mensajes dentro del Inbox, separado de WhatsApp y disponible inicialmente en modo lectura.</p>
        </div>
        <Badge variant={connected ? "success" : errorCopy || needsSelection ? "warning" : "muted"}>
          {connected ? "Conectado" : needsSelection ? "Requiere seleccion" : errorCopy ? "Requiere accion" : "No conectado"}
        </Badge>
      </div>

      <Card className="overflow-hidden border-fuchsia-300/16 bg-[linear-gradient(150deg,rgba(217,70,239,0.12),rgba(22,22,24,0.98)_42%,rgba(12,12,13,0.96))]">
        <CardContent className="space-y-5 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100">
                <MessageSquareText className="h-6 w-6" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">Instagram Messaging</h3>
                  <Badge variant={connected ? "success" : "warning"}>{connected ? "Activo" : "Preparado"}</Badge>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/64">
                  Instagram esta disponible inicialmente en modo lectura dentro del Inbox. Las respuestas desde Instagram todavia no estan habilitadas.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild className="rounded-2xl px-5">
                <Link href="/api/app/integrations/instagram/start">Conectar Instagram</Link>
              </Button>
              <Button variant="secondary" className="rounded-2xl px-5" onClick={onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refrescar
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <StatusMetric label="Estado" value={connected ? "Conectado" : "No conectado"} elevated />
            <StatusMetric label="Cuenta Instagram" value={channel?.instagramUsername || channel?.instagramUserId || "-"} elevated />
            <StatusMetric label="Pagina vinculada" value={channel?.externalPageName || channel?.externalPageId || "-"} elevated />
            <StatusMetric label="Actualizado" value={formatDateTime(channel?.updatedAt || null) || "-"} elevated />
          </div>

          {errorCopy ? (
            <div className="rounded-[24px] border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-50">
              <p className="font-medium">{errorCopy.title}</p>
              <p className="mt-1 leading-6 opacity-85">{errorCopy.description}</p>
            </div>
          ) : null}

          {needsSelection ? (
            <div className="rounded-[24px] border border-fuchsia-300/20 bg-fuchsia-300/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">Encontramos mas de una cuenta disponible.</p>
                  <p className="mt-1 text-sm leading-6 text-white/65">Selecciona cual queres conectar. No se muestran tokens ni credenciales.</p>
                </div>
                <Badge variant="warning">{assetSelection.candidates.length} opciones</Badge>
              </div>
              <div className="mt-4 grid gap-2">
                {assetSelection.candidates.map((candidate) => {
                  const key = instagramAssetKey(candidate);
                  return (
                    <label key={key} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
                      <input
                        type="radio"
                        name="instagram-asset"
                        value={key}
                        checked={selectedAssetKey === key}
                        onChange={(event) => onSelectedAssetKeyChange(event.target.value)}
                        className="mt-1 accent-[var(--brand)]"
                      />
                      <span>
                        <span className="block text-sm font-medium text-white">{candidate.instagramUsername || "Instagram sin nombre"}</span>
                        <span className="mt-1 block text-xs text-white/55">Page: {candidate.pageName || candidate.pageId || "-"}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <Button className="mt-4 rounded-2xl px-5" disabled={!selectedAssetKey || busy} onClick={onConnectSelectedAsset}>
                {busy ? "Conectando..." : "Conectar cuenta seleccionada"}
              </Button>
            </div>
          ) : null}

          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="text-sm font-medium text-white">Permisos requeridos por Meta</p>
            <p className="mt-2 text-sm leading-6 text-white/62">
              La app solicita permisos de Instagram Messaging y administracion de metadata de Page. Meta puede requerir App Review o Advanced Access antes de habilitar cuentas reales fuera de roles de prueba.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function WhatsAppStatusPanel({
  status,
  onRefresh
}: {
  status: PortalWhatsAppStatus | null;
  onRefresh: () => void;
}) {
  const connected = Boolean(status?.channel.connected);
  const webhookRecent = Number(status?.webhook.events24h || 0) > 0;
  const deliveryIssue = connected && !webhookRecent;
  const handoffsOpen = Number(status?.handoffs.openCount || 0) > 0;
  const generatedAt = formatDateTime(status?.generatedAt || null);
  const lastWebhookAt = formatDateTime(status?.webhook.lastReceived?.receivedAt || null) || "Sin registro";
  const lastInboundAt = formatDateTime(status?.messages.lastInbound?.createdAt || null) || "Sin registro";
  const lastOutboundAt = formatDateTime(status?.messages.lastOutbound?.createdAt || null) || "Sin registro";
  const job = status?.jobs.lastConversationReply || null;
  const lastWebhookError = status?.errors.lastWebhookError?.reason || "Sin errores de webhook";
  const lastJobError = status?.errors.lastJobError?.lastError || "Sin errores de job";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Diagnostico operativo</h2>
          <p className="text-sm text-muted">Senales compactas para saber si Meta entrega, Opturon guarda y el bot puede responder.</p>
        </div>
        <Button variant="secondary" className="rounded-2xl" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refrescar estado
        </Button>
      </div>

      <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))]">
        <CardHeader
          action={
            <div className="flex flex-wrap gap-2">
              <Badge variant={connected ? "success" : "warning"}>{connected ? "Conectado" : "Sin conectar"}</Badge>
              <Badge variant={webhookRecent ? "success" : "warning"}>
                {webhookRecent ? "Webhook reciente" : "Sin eventos recientes"}
              </Badge>
              {deliveryIssue ? <Badge variant="danger">Posible problema de entrega</Badge> : null}
              {handoffsOpen ? <Badge variant="warning">Handoffs abiertos</Badge> : null}
            </div>
          }
        >
          <div>
            <CardTitle className="text-xl">Lectura del canal</CardTitle>
            <CardDescription>
              Si WhatsApp muestra doble tilde pero no cambia el ultimo webhook, el problema esta antes de Opturon: Meta/Webhook delivery.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="grid gap-3 md:grid-cols-3">
              <StatusMetric icon={<Activity className="h-4 w-4" />} label="Webhooks 24 hs" value={String(status?.webhook.events24h ?? 0)} elevated />
              <StatusMetric icon={<MessageSquareText className="h-4 w-4" />} label="Inbound 24 hs" value={String(status?.messages.inbound24h ?? 0)} elevated />
              <StatusMetric icon={<MessageSquareText className="h-4 w-4" />} label="Outbound 24 hs" value={String(status?.messages.outbound24h ?? 0)} elevated />
            </div>

            <div className="rounded-[24px] border border-white/8 bg-surface/55 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Prueba manual</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Envia un WhatsApp al numero conectado y verifica si cambia el ultimo webhook.
              </p>
              <p className="mt-3 rounded-2xl border border-dashed border-[color:var(--border)] bg-bg/45 px-3 py-2 text-sm text-muted">
                Si el telefono marca doble tilde y este panel no actualiza, revisa entrega en Meta Webhooks.
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            <StatusGroup title="Ultima actividad" rows={[["Webhook", lastWebhookAt], ["Inbound", lastInboundAt], ["Outbound", lastOutboundAt]]} />
            <StatusGroup
              title="Automatizacion"
              rows={[
                ["Ultimo job", job?.status || "Sin registro"],
                ["Intentos", job ? String(job.attempts) : "-"],
                ["Actualizado", formatDateTime(job?.updatedAt || null) || "-"]
              ]}
            />
            <StatusGroup
              title="Bloqueos humanos"
              rows={[
                ["Handoffs", String(status?.handoffs.openCount ?? 0)],
                ["Bloqueadas", String(status?.handoffs.blockedConversationCount ?? 0)],
                ["Regla", status?.handoffs.explanation || "Sin handoffs abiertos"]
              ]}
            />
            <StatusGroup title="Canal" rows={[["Provider", status?.channel.provider || "-"], ["Actualizado", generatedAt || "-"], ["Bot", status?.botRuntime.enabled === false ? "Pausado" : "Activo"]]} />
          </div>

          <div className="rounded-[24px] border border-white/8 bg-bg/35 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Errores recientes</p>
                <p className="mt-1 text-sm text-muted">Senales de webhook y job sin romper el layout si el error es largo.</p>
              </div>
              <Badge variant={lastWebhookError.includes("Sin errores") && lastJobError.includes("Sin errores") ? "success" : "warning"}>
                {lastWebhookError.includes("Sin errores") && lastJobError.includes("Sin errores") ? "Sin errores" : "Revisar"}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ErrorLine label="Webhook" value={lastWebhookError} />
              <ErrorLine label="Job" value={lastJobError} />
            </div>
          </div>

          <p className="text-xs text-muted">
            Para cambios de conexion, WABA, tokens o suscripcion Meta, contacta soporte Opturon. El portal cliente es solo lectura.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

function StatusMetric({
  icon,
  label,
  value,
  elevated = false
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  elevated?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${elevated ? "border-white/10 bg-white/[0.045]" : "border-[color:var(--border)] bg-surface/65"}`}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
        {icon ? <span className="text-brandBright">{icon}</span> : null}
        <span>{label}</span>
      </div>
      <p className="mt-2 break-words text-sm font-medium text-text">{value}</p>
    </div>
  );
}

function StatusGroup({
  title,
  rows
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-surface/55 p-4">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3 text-sm">
            <span className="w-28 shrink-0 text-muted">{label}</span>
            <span className="min-w-0 break-words text-text">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}

function ErrorLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[color:var(--border)] bg-surface/60 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 line-clamp-3 break-words text-sm text-text">{value}</p>
    </div>
  );
}

type InstagramAssetSelection = {
  selectionToken: string;
  candidates: PortalInstagramCandidate[];
};

function readInstagramAssetSelection(searchParams: { get: (name: string) => string | null }): InstagramAssetSelection | null {
  if (searchParams.get("instagram") !== "select") return null;
  const selectionToken = String(searchParams.get("selectionToken") || "").trim();
  const encodedCandidates = String(searchParams.get("candidates") || "").trim();
  if (!selectionToken || !encodedCandidates) return null;

  try {
    const padded = encodedCandidates.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encodedCandidates.length / 4) * 4, "=");
    const json = JSON.parse(atob(padded)) as PortalInstagramCandidate[];
    const candidates = Array.isArray(json)
      ? json
          .map((candidate) => ({
            pageId: String(candidate?.pageId || "").trim() || null,
            pageName: String(candidate?.pageName || "").trim() || null,
            instagramUserId: String(candidate?.instagramUserId || "").trim() || null,
            instagramUsername: String(candidate?.instagramUsername || "").trim() || null
          }))
          .filter((candidate) => candidate.pageId || candidate.instagramUserId)
      : [];
    return candidates.length ? { selectionToken, candidates } : null;
  } catch {
    return null;
  }
}

function instagramAssetKey(candidate: PortalInstagramCandidate) {
  return `${candidate.pageId || "page"}:${candidate.instagramUserId || "instagram"}`;
}

function instagramErrorCopy(reason: string) {
  const safeReason = String(reason || "").trim();
  if (!safeReason || safeReason === "connected") return null;

  if (safeReason === "instagram_business_account_not_found") {
    return {
      title: "No encontramos una cuenta profesional de Instagram vinculada",
      description: "Vincula Instagram como cuenta profesional a una pagina de Facebook y volve a intentar."
    };
  }

  if (
    safeReason === "invalid_scope" ||
    safeReason.toLowerCase().includes("invalid scopes") ||
    safeReason === "instagram_pages_lookup_failed" ||
    safeReason === "instagram_page_subscription_failed" ||
    safeReason.includes("permission") ||
    safeReason.includes("OAuthException")
  ) {
    return {
      title: "Meta rechazo los permisos solicitados",
      description: "Si tu app usa Facebook Login for Business, configura el Login Configuration ID en Opturon. Instagram Messaging tambien puede requerir App Review o Advanced Access."
    };
  }

  if (safeReason === "instagram_multiple_assets_found") {
    return {
      title: "Encontramos mas de una cuenta disponible",
      description: "Selecciona cual queres conectar para completar la configuracion."
    };
  }

  if (safeReason === "instagram_asset_selection_expired") {
    return {
      title: "La seleccion vencio",
      description: "Inicia nuevamente la conexion de Instagram para obtener una seleccion vigente."
    };
  }

  return {
    title: "No se pudo completar la conexion de Instagram",
    description: "Reintenta el flujo OAuth. Si el problema persiste, revisa la configuracion de Meta."
  };
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function whatsappHubMeta(
  whatsapp: WhatsAppConnectionStatus,
  effectiveState: WhatsAppConnectionStatus["state"],
  launchMessage: string | null
) {
  if (effectiveState === "connected") {
    return {
      state: effectiveState,
      label: "Conectado",
      variant: "success" as const,
      dotClass: "bg-emerald-400",
      title: "Tu WhatsApp Business ya esta activo",
      description: "Tu numero principal ya esta conectado a Opturon y listo para responder desde el inbox.",
      helper: launchMessage || whatsapp.helper,
      channelValue: whatsapp.channelStatus || "Activo",
      webhookValue: whatsapp.webhookActive ? "Activo" : "Pendiente",
      webhookTone: whatsapp.webhookActive ? ("success" as const) : ("warning" as const),
      primaryAction: "open_link" as const,
      primaryHref: "/app/inbox",
      primaryLabel: "Abrir inbox",
      secondaryHref: "/app/integrations",
      secondaryLabel: "Gestionar conexion",
      supportLabel: "Necesito ayuda",
      benefits: [
        { title: "Inbox listo", detail: "Tus conversaciones reales ya pueden entrar directo al portal." },
        { title: "Equipo alineado", detail: "Todo el espacio opera sobre el mismo canal correcto." },
        { title: "Automatizaciones", detail: "Las reglas y respuestas van a quedar apoyadas sobre esta conexion." }
      ]
    };
  }

  if (effectiveState === "ambiguous_configuration" || effectiveState === "error") {
    return {
      state: effectiveState,
      label: effectiveState === "error" ? "Error" : "Requiere revision",
      variant: "danger" as const,
      dotClass: "bg-rose-400",
      title: "Necesitamos revisar la configuracion del canal",
      description: "Detectamos una inconsistencia antes de activar tu WhatsApp y preferimos no operar sobre un canal dudoso.",
      helper: launchMessage || whatsapp.helper,
      channelValue: whatsapp.channelStatus || "Revision",
      webhookValue: whatsapp.webhookActive ? "Parcial" : "Pendiente",
      webhookTone: "danger" as const,
      primaryAction: "open_link" as const,
      primaryHref: "/app/integrations",
      primaryLabel: "Revisar conexion",
      secondaryHref: "/app/inbox",
      secondaryLabel: "Ver inbox",
      supportLabel: "Necesito ayuda",
      benefits: [
        { title: "UI segura", detail: "No mostramos un numero ambiguo ni contaminamos el inbox con un canal equivocado." },
        { title: "Tenant aislado", detail: "La activacion se destraba solo cuando el canal correcto queda resuelto." },
        { title: "Siguiente paso claro", detail: "El owner sabe que necesita revisar la conexion." }
      ]
    };
  }

  if (effectiveState === "launching" || effectiveState === "pending_meta") {
    return {
      state: effectiveState,
      label: effectiveState === "launching" ? "Preparando conexion" : "Pendiente de Meta",
      variant: "warning" as const,
      dotClass: "bg-amber-300",
      title: "Estamos preparando tu conexion con Meta",
      description: "Validamos el espacio y dejamos listo el contexto para iniciar WhatsApp Business sin exponer configuracion tecnica innecesaria.",
      helper: launchMessage || "El siguiente paso es completar el flujo real de alta guiada con las credenciales finales del espacio.",
      channelValue: "Preparando",
      webhookValue: "Pendiente",
      webhookTone: "warning" as const,
      primaryAction: "connect_meta" as const,
      primaryHref: null,
      primaryLabel: "Pedir ayuda a Opturon",
      secondaryHref: "/app/inbox",
      secondaryLabel: "Ver inbox",
      supportLabel: "Necesito ayuda",
      benefits: [
        { title: "Tenant correcto", detail: "La conexion se prepara con el espacio correcto." },
        { title: "Sin datos tecnicos", detail: "No le pedimos al cliente WABA, tokens ni IDs manuales." },
        { title: "Base escalable", detail: "La siguiente etapa puede recibir el resultado real de Meta sin rehacer la UX." }
      ]
    };
  }

  return {
    state: effectiveState,
    label: "Sin conectar",
    variant: "warning" as const,
    dotClass: "bg-amber-300",
    title: "WhatsApp pendiente de activacion",
    description: "Opturon administra la conexion del canal para evitar cambios que puedan cortar la atencion.",
    helper: launchMessage || "Si necesitas activar o revisar WhatsApp, pedi ayuda al equipo de Opturon.",
    channelValue: "Sin conectar",
    webhookValue: "Pendiente",
    webhookTone: "warning" as const,
    primaryAction: "connect_meta" as const,
    primaryHref: null,
    primaryLabel: "Pedir ayuda a Opturon",
    secondaryHref: "/app/inbox",
    secondaryLabel: "Ver inbox",
    supportLabel: "Necesito ayuda",
    benefits: [
      { title: "Recibir mensajes", detail: "Tus conversaciones van a entrar directo a la bandeja del espacio." },
      { title: "Responder desde Opturon", detail: "El equipo atiende desde un solo lugar." },
      { title: "Automatizar", detail: "El canal conectado habilita respuestas y seguimiento comercial." }
    ]
  };
}

function stateMeta(state: IntegrationState): {
  label: string;
  detail: string;
  variant: "muted" | "warning" | "success" | "danger";
} {
  if (state === "connected") return { label: "Activo", detail: "", variant: "success" };
  if (state === "connecting") return { label: "En preparacion", detail: "", variant: "warning" };
  if (state === "error") return { label: "Revisar", detail: "", variant: "danger" };
  return { label: "Proximo", detail: "", variant: "muted" };
}
