"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Instagram, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import type { PortalInstagramCandidate, PortalInstagramStatus, PortalWhatsAppStatus } from "@/lib/api";
import type { WhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";
import {
  beginMetaWhatsAppConnection,
  getMetaEmbeddedSignupUserMessage,
  prepareMetaWhatsAppConnection,
  type WhatsAppConnectionMode
} from "@/lib/meta-whatsapp-signup";
import { getTrackedWhatsAppLink } from "@/lib/whatsapp";

export type ClientInstagramAssetSelection = {
  selectionToken: string;
  candidates: PortalInstagramCandidate[];
};

type FriendlyState = "disconnected" | "connecting" | "connected" | "error";

const WHATSAPP_MANAGE_LINK = getTrackedWhatsAppLink({
  origin: "client-integrations-manage",
  prefill: "Hola Opturon. Quiero gestionar la conexion de WhatsApp Business de mi espacio."
});

export function ClientIntegrationsExperience({
  whatsapp,
  coexistenceStatus,
  instagramStatus,
  instagramError,
  instagramMode,
  assetSelection,
  selectedAssetKey,
  instagramBusy,
  onSelectedAssetKeyChange,
  onConnectSelectedAsset,
  onRefreshInstagram,
  onDisconnectInstagram
}: {
  whatsapp: WhatsAppConnectionStatus;
  coexistenceStatus: PortalWhatsAppStatus["coexistence"];
  instagramStatus: PortalInstagramStatus | null;
  instagramError?: string | null;
  instagramMode?: string | null;
  assetSelection: ClientInstagramAssetSelection | null;
  selectedAssetKey: string;
  instagramBusy: boolean;
  onSelectedAssetKeyChange: (value: string) => void;
  onConnectSelectedAsset: () => void;
  onRefreshInstagram: () => void;
  onDisconnectInstagram: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [whatsappSignupBusy, setWhatsAppSignupBusy] = useState(false);
  const [whatsappSignupReady, setWhatsAppSignupReady] = useState(false);
  const [whatsappSignupError, setWhatsAppSignupError] = useState<string | null>(null);
  const isCoexistence = whatsapp.connectionMode === "COEXISTENCE";
  const whatsappState = isCoexistence && coexistenceStatus?.status !== "active"
    ? "error"
    : resolveWhatsAppState(whatsapp);
  const instagramState = resolveInstagramState({
    status: instagramStatus,
    error: instagramError,
    mode: instagramMode,
    hasSelection: Boolean(assetSelection?.candidates.length),
    busy: instagramBusy
  });
  const connectedNumber = formatCustomerPhone(whatsapp.connectedNumber || null);
  const instagramUsername = formatInstagramUsername(instagramStatus?.channel?.instagramUsername || null);

  function prepareWhatsAppSignup() {
    setWhatsAppSignupError(null);
    return prepareMetaWhatsAppConnection()
      .then(() => setWhatsAppSignupReady(true))
      .catch((error) => {
        setWhatsAppSignupError(getMetaEmbeddedSignupUserMessage(error));
      });
  }

  useEffect(() => {
    if (whatsappState === "connected" || whatsappState === "connecting") return;
    let active = true;
    void prepareMetaWhatsAppConnection().then(
      () => { if (active) setWhatsAppSignupReady(true); },
      (error) => {
        if (active) setWhatsAppSignupError(getMetaEmbeddedSignupUserMessage(error));
      }
    );
    return () => {
      active = false;
    };
  }, [whatsappState]);

  async function handleConnectWhatsApp(requestedConnectionMode: WhatsAppConnectionMode) {
    if (whatsappSignupBusy || !whatsappSignupReady) return;

    setWhatsAppSignupBusy(true);
    setWhatsAppSignupError(null);
    try {
      await beginMetaWhatsAppConnection({ requestedConnectionMode });
    } catch (error) {
      setWhatsAppSignupError(getMetaEmbeddedSignupUserMessage(error));
    } finally {
      setWhatsAppSignupBusy(false);
      router.refresh();
    }
  }

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
        description={whatsappCopy(whatsappState, isCoexistence, coexistenceStatus?.status)}
        state={whatsappState}
        detail={whatsappState === "connected"
          ? isCoexistence ? `Modo: WhatsApp Business + Opturon · ${formatCoexistencePhone(coexistenceStatus?.phoneLast4)}` : connectedNumber
          : undefined}
        children={isCoexistence ? (
          <div className={`mt-4 rounded-xl border px-3 py-2.5 text-xs leading-5 ${coexistenceStatus?.status === "active" ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-100" : "border-amber-400/20 bg-amber-400/5 text-amber-100"}`}>
            <p className="font-medium">{coexistenceStatus?.status === "active" ? "Coexistencia activa" : coexistenceStatus?.status === "reconnection_required" ? "WhatsApp Business requiere reconexión" : coexistenceStatus?.status === "disconnected" ? "Coexistencia desconectada" : "Estado de Coexistence sin verificar"}</p>
            {coexistenceStatus?.status === "active" ? (
              <p className="mt-1">Historial anterior: {customerSyncLabel(coexistenceStatus.historySyncStatus)}. Contactos: {customerSyncLabel(coexistenceStatus.contactsSyncStatus)}.</p>
            ) : <p className="mt-1">La conexión no se considera activa hasta que Meta confirme el estado del número.</p>}
          </div>
        ) : undefined}
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
            <div className="flex w-full flex-col gap-2 sm:w-auto">
              {whatsappSignupError ? <p role="alert" className="text-sm text-destructive">{whatsappSignupError}</p> : null}
              {whatsappSignupError && !whatsappSignupReady ? (
                <Button type="button" variant="secondary" onClick={() => void prepareWhatsAppSignup()}>
                  Reintentar preparación
                </Button>
              ) : null}
              <div className="flex w-full flex-col gap-2 sm:w-auto">
                {whatsapp.coexistencePilotEnabled ? (
                  <p className="max-w-sm text-xs leading-5 text-muted">
                    Conectá el número que ya usás en WhatsApp Business y seguí respondiendo desde tu teléfono mientras Opturon gestiona los mensajes. El historial previo solo se importa si Meta lo ofrece y aceptás compartirlo durante el alta.
                  </p>
                ) : null}
                <Button
                  type="button"
                  className="w-full rounded-xl sm:w-auto"
                  disabled={whatsappSignupBusy || !whatsappSignupReady}
                  onClick={() => void handleConnectWhatsApp("API_ONLY")}
                >
                  {whatsappSignupBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Conectando</> : "Conectar WhatsApp"}
                </Button>
                {whatsapp.coexistencePilotEnabled ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full rounded-xl sm:w-auto"
                    disabled={whatsappSignupBusy || !whatsappSignupReady}
                    onClick={() => void handleConnectWhatsApp("COEXISTENCE")}
                  >
                    Ya uso WhatsApp Business
                  </Button>
                ) : null}
              </div>
            </div>
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
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button asChild variant="secondary" className="w-full rounded-xl sm:w-auto">
                <Link href="/app/inbox">Gestionar</Link>
              </Button>
              <ConfirmDialog
                title={`¿Desconectar ${instagramUsername}?`}
                description="Dejarás de recibir y responder mensajes nuevos de esta cuenta en Opturon. Tus conversaciones e historial no se eliminarán."
                confirmText="Desconectar Instagram"
                cancelText="Cancelar"
                variant="destructive"
                onConfirm={onDisconnectInstagram}
                trigger={
                  <Button type="button" variant="destructive" className="w-full rounded-xl sm:w-auto" disabled={instagramBusy}>
                    Desconectar Instagram
                  </Button>
                }
              />
            </div>
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

function whatsappCopy(state: FriendlyState, isCoexistence = false, coexistenceStatus?: string | null) {
  if (state === "connected" && isCoexistence) return "Seguí respondiendo desde WhatsApp Business y gestioná las conversaciones desde Opturon.";
  if (state === "error" && isCoexistence) return coexistenceStatus === "reconnection_required" || coexistenceStatus === "disconnected"
    ? "Meta indica que este número necesita reconectarse antes de operar en modo Coexistence."
    : "No pudimos verificar que WhatsApp Business + Opturon siga activo. Revisá el estado antes de operar.";
  if (state === "connected") return "Tu equipo ya puede gestionar las conversaciones de WhatsApp desde Opturon.";
  if (state === "connecting") return "Estamos completando la conexión de tu cuenta. Esto puede demorar unos minutos.";
  if (state === "error") return "No pudimos confirmar la conexión. Te ayudamos a revisarla sin pedirte datos técnicos.";
  return "Conectá tu número de negocio para recibir y gestionar conversaciones en Opturon.";
}

function formatCoexistencePhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 4 ? `•••• ${digits}` : "Número protegido";
}

function customerSyncLabel(status: string) {
  const labels: Record<string, string> = {
    not_requested: "no importado",
    requested: "pendiente",
    syncing: "sincronizando",
    completed: "sincronización completada",
    declined: "no importado (no compartido)",
    failed: "no disponible; los mensajes nuevos siguen funcionando",
    expired: "fuera de la ventana de importación"
  };
  return labels[status] || "sin verificar";
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
