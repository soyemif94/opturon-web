"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Instagram, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PortalInstagramCandidate, PortalInstagramStatus } from "@/lib/api";
import type { WhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";
import { getTrackedWhatsAppLink } from "@/lib/whatsapp";

export type ClientInstagramAssetSelection = {
  selectionToken: string;
  candidates: PortalInstagramCandidate[];
};

type FriendlyState = "disconnected" | "connecting" | "connected" | "error";

const WHATSAPP_CONNECT_LINK = getTrackedWhatsAppLink({
  origin: "client-integrations-connect",
  prefill: "Hola Opturon. Quiero conectar WhatsApp Business en mi espacio."
});

const WHATSAPP_MANAGE_LINK = getTrackedWhatsAppLink({
  origin: "client-integrations-manage",
  prefill: "Hola Opturon. Quiero gestionar la conexion de WhatsApp Business de mi espacio."
});

export function ClientIntegrationsExperience({
  whatsapp,
  instagramStatus,
  instagramError,
  instagramMode,
  assetSelection,
  selectedAssetKey,
  instagramBusy,
  onSelectedAssetKeyChange,
  onConnectSelectedAsset,
  onRefreshInstagram
}: {
  whatsapp: WhatsAppConnectionStatus;
  instagramStatus: PortalInstagramStatus | null;
  instagramError?: string | null;
  instagramMode?: string | null;
  assetSelection: ClientInstagramAssetSelection | null;
  selectedAssetKey: string;
  instagramBusy: boolean;
  onSelectedAssetKeyChange: (value: string) => void;
  onConnectSelectedAsset: () => void;
  onRefreshInstagram: () => void;
}) {
  const whatsappState = resolveWhatsAppState(whatsapp);
  const instagramState = resolveInstagramState({
    status: instagramStatus,
    error: instagramError,
    mode: instagramMode,
    hasSelection: Boolean(assetSelection?.candidates.length),
    busy: instagramBusy
  });
  const connectedNumber = formatCustomerPhone(whatsapp.connectedNumber || null);
  const instagramUsername = formatInstagramUsername(instagramStatus?.channel?.instagramUsername || null);

  return (
    <section
      aria-label="Canales disponibles"
      data-client-integrations
      className="grid min-w-0 gap-4 md:grid-cols-2 md:gap-5"
    >
      <ClientIntegrationCard
        icon={<MessageCircle className="h-6 w-6" />}
        iconClassName="border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
        title="WhatsApp Business"
        description={whatsappCopy(whatsappState)}
        state={whatsappState}
        detail={whatsappState === "connected" ? connectedNumber : undefined}
        actions={
          whatsappState === "connected" ? (
            <Button asChild variant="secondary" className="w-full rounded-xl sm:w-auto">
              <a href={WHATSAPP_MANAGE_LINK} target="_blank" rel="noreferrer">Gestionar</a>
            </Button>
          ) : whatsappState === "connecting" ? (
            <Button disabled className="w-full rounded-xl sm:w-auto">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Conectando
            </Button>
          ) : (
            <Button asChild className="w-full rounded-xl sm:w-auto">
              <a href={WHATSAPP_CONNECT_LINK} target="_blank" rel="noreferrer">
                {whatsappState === "error" ? "Solicitar ayuda" : "Conectar WhatsApp"}
              </a>
            </Button>
          )
        }
      />

      <ClientIntegrationCard
        icon={<Instagram className="h-6 w-6" />}
        iconClassName="border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300"
        title="Instagram"
        description={instagramCopy(instagramState)}
        state={instagramState}
        detail={instagramState === "connected" ? instagramUsername : undefined}
        actions={
          instagramState === "connected" ? (
            <Button asChild variant="secondary" className="w-full rounded-xl sm:w-auto">
              <Link href="/app/inbox">Gestionar</Link>
            </Button>
          ) : instagramState === "connecting" ? (
            <Button disabled className="w-full rounded-xl sm:w-auto">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Conectando
            </Button>
          ) : instagramState === "error" ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button asChild className="w-full rounded-xl sm:w-auto">
                <a href="/api/app/integrations/instagram/start">Intentar nuevamente</a>
              </Button>
              <Button type="button" variant="secondary" className="w-full rounded-xl sm:w-auto" onClick={onRefreshInstagram}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar
              </Button>
            </div>
          ) : (
            <Button asChild className="w-full rounded-xl sm:w-auto">
              <a href="/api/app/integrations/instagram/start">Conectar Instagram</a>
            </Button>
          )
        }
      >
        {assetSelection?.candidates.length ? (
          <div className="mt-5 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4" data-instagram-selection>
            <p className="text-sm font-medium">Elegí la cuenta que querés conectar</p>
            <p className="mt-1 text-xs leading-5 text-muted">Encontramos más de una cuenta disponible.</p>
            <div className="mt-3 grid gap-2">
              {assetSelection.candidates.map((candidate) => {
                const key = instagramAssetKey(candidate);
                return (
                  <label key={key} className="flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-[color:var(--border)] bg-card/70 px-3 py-3">
                    <input
                      type="radio"
                      name="instagram-asset"
                      value={key}
                      checked={selectedAssetKey === key}
                      onChange={(event) => onSelectedAssetKeyChange(event.target.value)}
                      className="mt-1 accent-[var(--brand)]"
                    />
                    <span className="min-w-0 break-words text-sm">
                      {formatInstagramUsername(candidate.instagramUsername || null)}
                    </span>
                  </label>
                );
              })}
            </div>
            <Button
              type="button"
              className="mt-3 w-full rounded-xl"
              disabled={!selectedAssetKey || instagramBusy}
              onClick={onConnectSelectedAsset}
            >
              {instagramBusy ? "Conectando..." : "Conectar cuenta seleccionada"}
            </Button>
          </div>
        ) : null}

        {instagramState === "connected" && instagramStatus?.channel?.instagramUserId ? (
          <details className="mt-5 rounded-xl border border-[color:var(--border)] bg-surface/45 px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright">
              Detalles de conexión
            </summary>
            <p className="mt-2 break-all text-xs text-muted">
              Professional Account ID: {instagramStatus.channel.instagramUserId}
            </p>
          </details>
        ) : null}
      </ClientIntegrationCard>
    </section>
  );
}

function ClientIntegrationCard({
  icon,
  iconClassName,
  title,
  description,
  state,
  detail,
  actions,
  children
}: {
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  description: string;
  state: FriendlyState;
  detail?: string;
  actions: React.ReactNode;
  children?: React.ReactNode;
}) {
  const stateMeta = friendlyStateMeta(state);
  return (
    <Card data-integration-state={state} className="min-w-0 overflow-hidden border-[color:var(--border)] bg-card/90">
      <CardContent className="flex h-full min-w-0 flex-col p-5 sm:p-6">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${iconClassName}`}>{icon}</span>
          <Badge variant={stateMeta.variant}>
            {state === "connected" ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : null}
            {state === "error" ? <AlertCircle className="mr-1 h-3.5 w-3.5" /> : null}
            {stateMeta.label}
          </Badge>
        </div>
        <div className="mt-5 min-w-0">
          <h2 className="break-words text-xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          {detail ? <p className="mt-3 break-words text-sm font-medium">{detail}</p> : null}
        </div>
        {children}
        <div className="mt-auto pt-6">{actions}</div>
      </CardContent>
    </Card>
  );
}

function resolveWhatsAppState(whatsapp: WhatsAppConnectionStatus): FriendlyState {
  if (whatsapp.state === "connected") return "connected";
  if (whatsapp.state === "launching" || whatsapp.state === "pending_meta") return "connecting";
  if (whatsapp.state === "error" || whatsapp.state === "ambiguous_configuration") return "error";
  return "disconnected";
}

function resolveInstagramState({
  status,
  error,
  mode,
  hasSelection,
  busy
}: {
  status: PortalInstagramStatus | null;
  error?: string | null;
  mode?: string | null;
  hasSelection: boolean;
  busy: boolean;
}): FriendlyState {
  if (status?.state === "connected" && status.channel) return "connected";
  if (busy || (mode === "select" && hasSelection)) return "connecting";
  if (error || mode === "error") return "error";
  return "disconnected";
}

function friendlyStateMeta(state: FriendlyState): {
  label: string;
  variant: "muted" | "warning" | "success" | "danger";
} {
  if (state === "connected") return { label: "Conectado", variant: "success" };
  if (state === "connecting") return { label: "Conectando", variant: "warning" };
  if (state === "error") return { label: "Necesita atención", variant: "danger" };
  return { label: "Sin conectar", variant: "muted" };
}

function whatsappCopy(state: FriendlyState) {
  if (state === "connected") return "Tu equipo ya puede gestionar las conversaciones de WhatsApp desde Opturon.";
  if (state === "connecting") return "Estamos completando la conexión de tu cuenta. Esto puede demorar unos minutos.";
  if (state === "error") return "No pudimos confirmar la conexión. Te ayudamos a revisarla sin pedirte datos técnicos.";
  return "Conectá tu número de negocio para recibir y gestionar conversaciones en Opturon.";
}

function instagramCopy(state: FriendlyState) {
  if (state === "connected") return "Tu cuenta profesional está vinculada y disponible en el Inbox.";
  if (state === "connecting") return "Completá la selección para terminar de vincular tu cuenta profesional.";
  if (state === "error") return "No pudimos completar la conexión. Podés intentarlo nuevamente.";
  return "Vinculá tu cuenta profesional para ver sus conversaciones en el Inbox.";
}

function formatCustomerPhone(value: string | null) {
  const normalized = String(value || "").trim();
  if (!normalized) return "Número conectado";
  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 7) return normalized;
  const prefix = normalized.startsWith("+") ? "+" : "";
  return `${prefix}${digits.slice(0, 3)} •••• ${digits.slice(-4)}`;
}

function formatInstagramUsername(value: string | null) {
  const normalized = String(value || "").trim().replace(/^@+/, "");
  return normalized ? `@${normalized}` : "Cuenta profesional";
}

function instagramAssetKey(candidate: PortalInstagramCandidate) {
  return candidate.instagramUserId || candidate.instagramUsername || "instagram";
}
