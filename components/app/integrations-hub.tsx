"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Cable,
  CalendarDays,
  CheckCircle2,
  CopyPlus,
  Instagram,
  LifeBuoy,
  LoaderCircle,
  MessageCircle,
  MessageSquareText,
  PhoneCall,
  PlugZap,
  ShieldAlert,
  RefreshCw,
  KeyRound,
  Webhook
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import type {
  PortalWhatsAppDiscoveredAsset,
  PortalWhatsAppTemplate,
  PortalWhatsAppTemplateBlueprint
} from "@/lib/api";
import {
  beginMetaWhatsAppConnection,
  getMetaEmbeddedSignupErrorDetails,
  type MetaEmbeddedSignupErrorKind
} from "@/lib/meta-whatsapp-signup";
import type { WhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";
import { getTrackedWhatsAppLink } from "@/lib/whatsapp";

type IntegrationState = "not_connected" | "connecting" | "connected" | "error";

type IntegrationCard = {
  id: string;
  name: string;
  description: string;
  state: IntegrationState;
  availability: "disponible" | "proximamente" | "en preparacion";
  cta: string;
  icon: React.ComponentType<{ className?: string }>;
  helper?: string;
};

const SUPPORT_LINK = getTrackedWhatsAppLink({
  origin: "audit-intake",
  prefill: "Hola Opturon. Necesito ayuda para conectar WhatsApp Business en mi workspace."
});

const integrations: IntegrationCard[] = [
  {
    id: "instagram",
    name: "Instagram",
    description: "Centraliza mensajes directos y consultas comerciales en el mismo workspace.",
    state: "connecting",
    availability: "en preparacion",
    cta: "Preparar canal",
    icon: Instagram,
    helper: "Ideal para negocios que atienden consultas por redes y campanas."
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    description: "Unifica conversaciones de Facebook con el resto de tu operacion comercial.",
    state: "not_connected",
    availability: "proximamente",
    cta: "Ver roadmap",
    icon: MessageCircle,
    helper: "Pensado para equipos que reciben consultas desde anuncios y redes."
  },
  {
    id: "webchat",
    name: "Webchat",
    description: "Recibe prospectos desde tu sitio web y canalizalos al inbox del equipo.",
    state: "connected",
    availability: "disponible",
    cta: "Gestionar widget",
    icon: Webhook,
    helper: "Muy util para captar consultas sin depender solo de WhatsApp."
  },
  {
    id: "calendar",
    name: "Google Calendar",
    description: "Coordina turnos, reuniones o seguimientos directamente desde la conversacion.",
    state: "not_connected",
    availability: "en preparacion",
    cta: "Explorar integracion",
    icon: CalendarDays,
    helper: "Un paso natural para negocios que coordinan citas o demos."
  },
  {
    id: "crm",
    name: "CRM externo",
    description: "Empuja contactos, etapas y actividad hacia tu CRM comercial actual.",
    state: "error",
    availability: "disponible",
    cta: "Revisar conexion",
    icon: PlugZap,
    helper: "Sincroniza tu pipeline comercial con lo que sucede en el inbox."
  }
];

export function IntegrationsHub({
  whatsapp,
  templateBlueprints,
  templates
}: {
  whatsapp: WhatsAppConnectionStatus;
  templateBlueprints: PortalWhatsAppTemplateBlueprint[];
  templates: PortalWhatsAppTemplate[];
}) {
  const router = useRouter();
  const manualConnectionRef = useRef<HTMLElement | null>(null);
  const [liveWhatsApp, setLiveWhatsApp] = useState(whatsapp);
  const [liveTemplates, setLiveTemplates] = useState(templates);
  const [launchState, setLaunchState] = useState<"idle" | "launching" | "pending_meta">("idle");
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);
  const [launchIssueKind, setLaunchIssueKind] = useState<MetaEmbeddedSignupErrorKind | null>(null);
  const [templatesBusy, setTemplatesBusy] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState({
    wabaId: "",
    phoneNumberId: "",
    accessToken: "",
    channelName: ""
  });
  const [manualBusy, setManualBusy] = useState(false);
  const [manualHelpOpen, setManualHelpOpen] = useState(false);
  const [discoveryBusy, setDiscoveryBusy] = useState(false);
  const [discoveryItems, setDiscoveryItems] = useState<PortalWhatsAppDiscoveredAsset[]>([]);
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null);

  const effectiveState =
    launchState === "launching"
      ? "launching"
      : launchState === "pending_meta" && liveWhatsApp.state !== "connected"
        ? "pending_meta"
        : liveWhatsApp.state;

  const meta = useMemo(
    () => whatsappHubMeta(liveWhatsApp, effectiveState, launchMessage),
    [effectiveState, launchMessage, liveWhatsApp]
  );

  async function refreshWhatsAppStatus() {
    const response = await fetch("/api/app/integrations/whatsapp", { cache: "no-store" });
    if (!response.ok) return;
    const json = (await response.json().catch(() => null)) as { data?: WhatsAppConnectionStatus } | null;
    if (json?.data) {
      setLiveWhatsApp(json.data);
      router.refresh();
    }
  }

  async function refreshTemplates() {
    const response = await fetch("/api/app/integrations/whatsapp/templates", { cache: "no-store" });
    if (!response.ok) return;
    const json = (await response.json().catch(() => null)) as { data?: { templates?: PortalWhatsAppTemplate[] } } | null;
    setLiveTemplates(json?.data?.templates || []);
  }

  function focusManualConnection(options?: { openHelp?: boolean }) {
    manualConnectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    manualConnectionRef.current?.focus({ preventScroll: true });

    if (options?.openHelp) {
      setManualHelpOpen(true);
    }
  }

  async function handleMetaConnect() {
    console.info("[meta-embedded-signup-ui] click_received", {
      currentState: liveWhatsApp.state
    });
    setLaunchState("launching");
    setLaunchMessage(null);
    setLaunchIssueKind(null);

    try {
      const result = await beginMetaWhatsAppConnection();
      setLaunchIssueKind(null);
      if (result.state === "pending_meta") {
        setLaunchState("pending_meta");
        setLaunchMessage(result.message);
        await refreshWhatsAppStatus();
        toast.success("Conexion en curso", result.message);
        return;
      }

      setLaunchState(result.state === "connected" ? "idle" : "pending_meta");
      setLaunchMessage(result.message);
      await refreshWhatsAppStatus();
      toast.success(
        result.state === "connected" ? "WhatsApp conectado" : "Conexion actualizada",
        result.message
      );
    } catch (error) {
      setLaunchState("idle");
      const details = getMetaEmbeddedSignupErrorDetails(error);
      console[details.kind === "meta_blocked" || details.kind === "cancelled" ? "warn" : "error"](
        "[meta-embedded-signup-ui] launch_failed",
        {
          kind: details.kind,
          code: details.code,
          fallbackToManual: details.fallbackToManual,
          error: details.message
        }
      );
      setLaunchIssueKind(details.kind);
      setLaunchMessage(details.message);

      if (details.kind === "meta_blocked" || details.kind === "timeout") {
        toast.error("Meta no habilitó la conexión guiada", details.message);
        focusManualConnection();
        return;
      }

      if (details.kind === "cancelled") {
        return;
      }

      toast.error("No pudimos iniciar la conexion", details.message);
    }
  }

  async function handleManualConnect() {
    setManualBusy(true);
    try {
      const response = await fetch("/api/app/integrations/whatsapp/manual-connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(manualForm)
      });
      const json = (await response.json().catch(() => null)) as
        | {
            data?: {
              status?: "connected" | "pending_meta";
              validation?: {
                displayPhoneNumber?: string | null;
                verifiedName?: string | null;
                wabaName?: string | null;
              };
            };
            error?: string;
            detail?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(json?.detail || json?.error || "No pudimos validar el canal en Meta.");
      }

      await refreshWhatsAppStatus();
      router.refresh();
      toast.success(
        json?.data?.status === "connected" ? "WhatsApp conectado" : "Conexion validada",
        json?.data?.status === "connected"
          ? `El canal ${json?.data?.validation?.displayPhoneNumber || manualForm.phoneNumberId} ya quedo asociado a tu workspace.`
          : "La validacion salio bien, pero falta terminar la suscripcion de la app en Meta."
      );
    } catch (error) {
      toast.error("No pudimos conectar el canal", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setManualBusy(false);
    }
  }

  async function handleDiscoverAssets() {
    if (!manualForm.accessToken.trim()) return;
    setDiscoveryBusy(true);
    setDiscoveryMessage("Buscando cuentas de WhatsApp en Meta...");
    setDiscoveryItems([]);
    try {
      const response = await fetch("/api/app/integrations/whatsapp/discover-assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ accessToken: manualForm.accessToken })
      });
      const json = (await response.json().catch(() => null)) as
        | { data?: { items?: PortalWhatsAppDiscoveredAsset[] }; error?: string; detail?: string }
        | null;

      if (!response.ok) {
        throw new Error(json?.detail || json?.error || "No pudimos descubrir activos desde Meta.");
      }

      const items = json?.data?.items || [];
      setDiscoveryItems(items);
      if (items.length) {
        setDiscoveryMessage(null);
        toast.success("Cuentas detectadas", `Encontramos ${items.length} opcion(es) para este token.`);
      } else {
        setDiscoveryMessage("No encontramos cuentas accesibles con ese token. Puedes completar WABA ID y Phone Number ID manualmente.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos descubrir cuentas en Meta.";
      setDiscoveryMessage(message);
      toast.error("No pudimos detectar tus cuentas", message);
    } finally {
      setDiscoveryBusy(false);
    }
  }

  function applyDiscoveredAsset(item: PortalWhatsAppDiscoveredAsset) {
    setManualForm((current) => ({
      ...current,
      wabaId: item.wabaId,
      phoneNumberId: item.phoneNumberId,
      channelName: current.channelName || item.verifiedName || item.displayPhoneNumber || "Canal WhatsApp"
    }));
    setDiscoveryMessage(`Usaremos ${item.label} para completar la conexion manual.`);
  }

  async function handleCreateTemplate(templateKey: string, language: string) {
    setTemplatesBusy(templateKey);
    try {
      const response = await fetch("/api/app/integrations/whatsapp/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ templateKey, language })
      });
      const json = (await response.json().catch(() => null)) as
        | { data?: { template?: PortalWhatsAppTemplate; created?: boolean }; error?: string; detail?: string }
        | null;

      if (!response.ok) {
        throw new Error(json?.detail || json?.error || "No pudimos crear la plantilla en Meta.");
      }

      await refreshTemplates();
      toast.success(
        json?.data?.created === false ? "Plantilla ya disponible" : "Plantilla creada",
        json?.data?.created === false
          ? "La plantilla ya existia para este workspace y quedo reutilizada."
          : "La plantilla se envio a Meta y quedo asociada a tu WhatsApp."
      );
    } catch (error) {
      toast.error("No pudimos crear la plantilla", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setTemplatesBusy(null);
    }
  }

  async function handleSyncTemplates() {
    setTemplatesBusy("sync");
    try {
      const response = await fetch("/api/app/integrations/whatsapp/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "sync" })
      });
      const json = (await response.json().catch(() => null)) as
        | { data?: { syncedCount?: number; templates?: PortalWhatsAppTemplate[] }; error?: string; detail?: string }
        | null;
      if (!response.ok) {
        throw new Error(json?.detail || json?.error || "No pudimos sincronizar estados de templates.");
      }
      setLiveTemplates(json?.data?.templates || []);
      toast.success("Templates sincronizados", `Actualizamos ${json?.data?.syncedCount || 0} templates desde Meta.`);
    } catch (error) {
      toast.error("No pudimos sincronizar templates", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setTemplatesBusy(null);
    }
  }

  const templatesByKey = useMemo(() => {
    const map = new Map<string, PortalWhatsAppTemplate>();
    for (const item of liveTemplates) {
      const current = map.get(item.templateKey);
      if (!current) {
        map.set(item.templateKey, item);
        continue;
      }
      if (new Date(item.updatedAt || 0).getTime() > new Date(current.updatedAt || 0).getTime()) {
        map.set(item.templateKey, item);
      }
    }
    return map;
  }, [liveTemplates]);

  const readinessItems = [
    {
      label: "Canal del workspace",
      value: meta.channelValue,
      tone: meta.variant
    },
    {
      label: "Webhook",
      value: meta.webhookValue,
      tone: meta.webhookTone
    },
    {
      label: "Numero conectado",
      value: liveWhatsApp.connectedNumber || "Pendiente",
      tone: liveWhatsApp.connectedNumber ? "muted" : "warning"
    }
  ] as const;

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card className="overflow-hidden border-brand/25 bg-[linear-gradient(135deg,rgba(192,80,0,0.18),rgba(24,24,24,0.96))] shadow-[0_18px_60px_rgba(176,80,0,0.16)]">
          <CardHeader action={<Badge variant={meta.variant}>{meta.label}</Badge>}>
            <div className="flex items-start gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-brand/30 bg-brand/15 text-brandBright">
                {meta.state === "ambiguous_configuration" ? <ShieldAlert className="h-6 w-6" /> : <PhoneCall className="h-6 w-6" />}
              </span>
              <div>
                <CardTitle className="text-2xl">{meta.title}</CardTitle>
                <CardDescription>{meta.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Estado del canal</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className={`inline-flex h-3 w-3 rounded-full ${meta.dotClass}`} />
                    <p className="text-lg font-semibold text-white">{meta.label}</p>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">{meta.helper}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">Siguiente paso</p>
                  <p className="mt-2 font-medium">{meta.nextStep}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {readinessItems.map((item) => (
                <StatusStat key={item.label} label={item.label} value={item.value} tone={item.tone} />
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {meta.benefits.map((item) => (
                <div key={item.title} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
                </div>
              ))}
            </div>

            {launchIssueKind === "meta_blocked" || launchIssueKind === "timeout" ? (
              <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-4 text-sm text-white/80">
                <p className="font-semibold text-white">Meta no habilitó el alta embebida para esta app</p>
                <p className="mt-2 leading-6">
                  Meta no habilitó Embedded Signup para esta app. Puedes continuar ahora mismo con la conexión manual
                  asistida sin perder el progreso.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button className="rounded-2xl" onClick={() => focusManualConnection()}>
                    Ir a conexion manual
                  </Button>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => focusManualConnection({ openHelp: true })}>
                    Ver ayuda
                  </Button>
                  <Button variant="ghost" className="rounded-2xl" onClick={() => void handleMetaConnect()} disabled={launchState === "launching"}>
                    Reintentar con Meta
                  </Button>
                </div>
              </div>
            ) : launchMessage ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-3 text-sm text-muted">
                {launchMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {meta.primaryAction === "connect_meta" ? (
                <Button className="rounded-2xl px-5" onClick={() => void handleMetaConnect()} disabled={launchState === "launching"}>
                  {launchState === "launching" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {meta.primaryLabel}
                </Button>
              ) : meta.primaryHref ? (
                <Button asChild className="rounded-2xl px-5">
                  <Link href={meta.primaryHref}>{meta.primaryLabel}</Link>
                </Button>
              ) : (
                <Button className="rounded-2xl px-5" onClick={() => void handleMetaConnect()} disabled={launchState === "launching"}>
                  {launchState === "launching" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {meta.primaryLabel}
                </Button>
              )}

              {meta.secondaryHref ? (
                <Button asChild variant="secondary" className="rounded-2xl px-5">
                  <Link href={meta.secondaryHref}>{meta.secondaryLabel}</Link>
                </Button>
              ) : null}

              <Button asChild variant="ghost" className="rounded-2xl px-5">
                <a href={SUPPORT_LINK} target="_blank" rel="noreferrer">
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  {meta.supportLabel}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">Onboarding</Badge>}>
            <div>
              <CardTitle className="text-xl">Como se activa este canal</CardTitle>
              <CardDescription>Una experiencia pensada para conectar WhatsApp sin pedirle al cliente datos tecnicos innecesarios.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[
              {
                icon: Cable,
                title: "Conectas con Meta",
                detail: "El cliente inicia el flujo desde Opturon y selecciona el negocio o numero que quiere usar."
              },
              {
                icon: BadgeCheck,
                title: "Validamos la configuracion",
                detail: "Confirmamos que el numero y el canal queden asociados al workspace correcto antes de operar."
              },
              {
                icon: MessageSquareText,
                title: "Empiezas a responder",
                detail: "Cuando el canal queda resuelto, el inbox, el checklist y las automatizaciones se habilitan sobre esa conexion."
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <Icon className="h-4 w-4 text-brandBright" />
                    </span>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted">{item.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Canales e integraciones</h2>
            <p className="text-sm text-muted">Conexiones disponibles para centralizar atencion, prospectos y agenda desde un solo workspace.</p>
          </div>
          <Badge variant="muted">Centro de integraciones</Badge>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            const state = stateMeta(integration.state);
            return (
              <Card key={integration.id} className="border-white/6 bg-card/90">
                <CardHeader action={<Badge variant={state.variant}>{state.label}</Badge>}>
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-surface/80">
                      <Icon className="h-5 w-5 text-brandBright" />
                    </span>
                    <div>
                      <CardTitle className="text-xl">{integration.name}</CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{integration.availability}</Badge>
                    {integration.helper ? <Badge variant="muted">{integration.helper}</Badge> : null}
                  </div>
                  <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
                    {state.detail}
                  </div>
                  <Button variant={integration.state === "connected" ? "secondary" : "primary"} className="w-full rounded-2xl">
                    {integration.cta}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section
        ref={manualConnectionRef}
        tabIndex={-1}
        className="grid gap-5 outline-none xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]"
      >
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="warning">Ruta recomendada ahora</Badge>}>
            <div>
              <CardTitle className="text-xl">Conexion manual asistida</CardTitle>
              <CardDescription>
                Pega tu Access Token de Meta y deja que Opturon detecte automaticamente tus cuentas y numeros disponibles. Si lo prefieres, tambien puedes completar los IDs manualmente.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {launchIssueKind === "meta_blocked" ? (
              <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-white">Meta no habilitó el alta embebida para esta app</p>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  No te bloqueamos por eso. Puedes continuar ahora mismo con la conexión manual asistida validando tu
                  token, tu WABA y tu número directamente contra Meta.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button className="rounded-2xl" onClick={() => focusManualConnection()}>
                    Ir a conexion manual
                  </Button>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => focusManualConnection({ openHelp: true })}>
                    Ver ayuda
                  </Button>
                  <Button variant="ghost" className="rounded-2xl" onClick={() => void handleMetaConnect()} disabled={launchState === "launching"}>
                    Reintentar con Meta
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
              No te pedimos configuracion tecnica de webhook ni pasos raros. Solo validamos tu WABA, tu numero y el
              token del canal para asociarlo al workspace correcto.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">WABA ID</span>
                <Input
                  value={manualForm.wabaId}
                  onChange={(event) => setManualForm((current) => ({ ...current, wabaId: event.target.value }))}
                  placeholder="Ej. 178912345678901"
                  autoComplete="off"
                  inputMode="numeric"
                  disabled={manualBusy}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Phone Number ID</span>
                <Input
                  value={manualForm.phoneNumberId}
                  onChange={(event) => setManualForm((current) => ({ ...current, phoneNumberId: event.target.value }))}
                  placeholder="Ej. 109876543210987"
                  autoComplete="off"
                  inputMode="numeric"
                  disabled={manualBusy}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Access Token</span>
                <Input
                  type="password"
                  value={manualForm.accessToken}
                  onChange={(event) => setManualForm((current) => ({ ...current, accessToken: event.target.value }))}
                  placeholder="Pega aqui tu token de Meta"
                  autoComplete="off"
                  disabled={manualBusy}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Nombre del canal (opcional)</span>
                <Input
                  value={manualForm.channelName}
                  onChange={(event) => setManualForm((current) => ({ ...current, channelName: event.target.value }))}
                  placeholder="Sucursal Palermo"
                  autoComplete="off"
                  disabled={manualBusy}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => void handleDiscoverAssets()}
                disabled={discoveryBusy || !manualForm.accessToken.trim()}
              >
                {discoveryBusy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                Detectar mis cuentas
              </Button>
              {discoveryMessage ? <p className="self-center text-sm text-muted">{discoveryMessage}</p> : null}
            </div>

            {discoveryItems.length ? (
              <div className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                <div>
                  <p className="text-sm font-medium">Selecciona una cuenta detectada</p>
                  <p className="mt-1 text-sm text-muted">
                    Elegimos una opción y autocompletamos WABA ID, Phone Number ID y el nombre sugerido del canal.
                  </p>
                </div>

                <div className="space-y-2">
                  {discoveryItems.map((item) => (
                    <button
                      key={`${item.wabaId}:${item.phoneNumberId}`}
                      type="button"
                      onClick={() => applyDiscoveredAsset(item)}
                      className="w-full rounded-2xl border border-[color:var(--border)] bg-bg/70 p-4 text-left transition hover:border-brand/40 hover:bg-bg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <div className="mt-2 space-y-1 text-xs text-muted">
                            <p>WABA ID: {item.wabaId}</p>
                            <p>Phone Number ID: {item.phoneNumberId}</p>
                            {item.qualityRating ? <p>Quality: {item.qualityRating}</p> : null}
                          </div>
                        </div>
                        <Badge variant="outline">Usar</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl" onClick={() => void handleManualConnect()} disabled={manualBusy}>
                {manualBusy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Conectar manualmente
              </Button>
              <Dialog open={manualHelpOpen} onOpenChange={setManualHelpOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="rounded-2xl">
                    Necesito ayuda con mis datos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Dónde encontrar estos datos en Meta</DialogTitle>
                    <DialogDescription>
                      Te mostramos exactamente qué copiar para conectar tu canal sin configuraciones raras.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <HelperBlock
                      title="WABA ID"
                      description="Es el identificador de tu cuenta de WhatsApp Business."
                      bullets={[
                        "No es tu email",
                        "No es tu numero de telefono",
                        "Es un numero largo"
                      ]}
                      example="178912345678901"
                    />
                    <HelperBlock
                      title="Phone Number ID"
                      description="Es el identificador interno del numero conectado en WhatsApp Cloud API."
                      bullets={[
                        "No es el numero visible de WhatsApp",
                        "Tambien es un numero largo"
                      ]}
                      example="109876543210987"
                    />
                    <HelperBlock
                      title="Access Token"
                      description="Es el token de acceso que autoriza a Meta a validar y usar ese canal."
                      bullets={[
                        "Debe ser el token con acceso a esa cuenta y ese numero"
                      ]}
                      example="EAAJ..."
                    />

                    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                      <p className="text-sm font-medium">Paso a paso</p>
                      <div className="mt-3 space-y-2 text-sm text-muted">
                        <p>1. Entra a Meta for Developers</p>
                        <p>2. Abre tu app de WhatsApp</p>
                        <p>3. Ve a WhatsApp &gt; Configuracion de la API</p>
                        <p>4. Copia estos datos:</p>
                        <p>WhatsApp Business Account ID</p>
                        <p>Phone Number ID</p>
                        <p>Access Token</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                      <p className="text-sm font-medium">Importante</p>
                      <div className="mt-3 space-y-2 text-sm text-muted">
                        <p>No pegues tu email en WABA ID</p>
                        <p>No pegues tu numero de telefono en Phone Number ID</p>
                        <p>Si el token no tiene permisos, la conexion fallara</p>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="justify-between">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="secondary" className="rounded-2xl">
                        <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">
                          Abrir Meta for Developers
                        </a>
                      </Button>
                      <Button asChild variant="ghost" className="rounded-2xl">
                        <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noreferrer">
                          Abrir documentacion de WhatsApp
                        </a>
                      </Button>
                    </div>
                    <Button asChild variant="ghost" className="rounded-2xl">
                      <a href={SUPPORT_LINK} target="_blank" rel="noreferrer">
                        Hablar con soporte
                      </a>
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">Checklist</Badge>}>
            <div>
              <CardTitle className="text-xl">Que valida Opturon</CardTitle>
              <CardDescription>Antes de asociar el canal al tenant, validamos acceso real en Meta para evitar cruces entre workspaces.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[
              "El token permite leer la WABA indicada.",
              "El Phone Number ID existe y es accesible con ese token.",
              "El numero realmente pertenece a esa WABA.",
              "El canal no esta ya asociado a otro workspace.",
              "Si la suscripcion de la app falla, el canal queda pendiente y no se pierde la validacion."
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-3 text-sm text-muted">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Plantillas de WhatsApp</h2>
            <p className="text-sm text-muted">
              Blueprints base de Opturon para crear templates aprobables por cada WABA sin pedir configuracion manual.
            </p>
          </div>
          <Button variant="secondary" className="rounded-2xl" onClick={() => void handleSyncTemplates()} disabled={templatesBusy === "sync"}>
            {templatesBusy === "sync" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sincronizar estados
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {templateBlueprints.map((blueprint) => {
            const current = templatesByKey.get(blueprint.key) || null;
            const statusMeta = templateStatusMeta(current?.status || "not_created");
            const isBusy = templatesBusy === blueprint.key;
            return (
              <Card key={blueprint.key} className="border-white/6 bg-card/90">
                <CardHeader action={<Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>}>
                  <div>
                    <CardTitle className="text-lg">{blueprint.title}</CardTitle>
                    <CardDescription>{blueprint.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{blueprint.category}</Badge>
                    <Badge variant="muted">{blueprint.defaultLanguage}</Badge>
                    {current?.metaTemplateName ? <Badge variant="muted">{current.metaTemplateName}</Badge> : null}
                  </div>

                  <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
                    {statusMeta.detail}
                    {current?.rejectionReason ? (
                      <p className="mt-2 text-sm text-danger">Motivo reportado por Meta: {current.rejectionReason}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      className="rounded-2xl"
                      onClick={() => void handleCreateTemplate(blueprint.key, blueprint.defaultLanguage)}
                      disabled={isBusy || liveWhatsApp.state !== "connected"}
                    >
                      {isBusy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CopyPlus className="mr-2 h-4 w-4" />}
                      Crear en mi WhatsApp
                    </Button>
                    {current?.status ? (
                      <div className="inline-flex items-center rounded-2xl border border-[color:var(--border)] bg-surface/65 px-3 py-2 text-sm text-muted">
                        <CheckCircle2 className="mr-2 h-4 w-4 text-brandBright" />
                        Estado actual: {statusMeta.label}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function templateStatusMeta(status: string): {
  label: string;
  detail: string;
  variant: "muted" | "warning" | "success" | "danger";
} {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "approved") {
    return {
      label: "Aprobada",
      detail: "La plantilla ya esta aprobada en tu WABA y lista para usarse en automatizaciones futuras.",
      variant: "success"
    };
  }
  if (normalized === "pending" || normalized === "in_review") {
    return {
      label: "En revision",
      detail: "Meta recibio la plantilla y todavia no termino la aprobacion.",
      variant: "warning"
    };
  }
  if (normalized === "rejected" || normalized === "paused" || normalized === "disabled") {
    return {
      label: "Requiere revision",
      detail: "Meta no dejo la plantilla operativa. Conviene revisar el copy o crear una variante nueva.",
      variant: "danger"
    };
  }
  if (normalized === "draft") {
    return {
      label: "Borrador",
      detail: "La plantilla existe en Opturon, pero todavia no fue enviada a Meta para este workspace.",
      variant: "muted"
    };
  }
  return {
    label: "Sin crear",
    detail: "Todavia no existe una version de esta plantilla dentro del WhatsApp Business del tenant.",
    variant: "muted"
  };
}

function HelperBlock({
  title,
  description,
  bullets,
  example
}: {
  title: string;
  description: string;
  bullets: string[];
  example: string;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <div className="mt-3 space-y-2 text-sm text-muted">
        {bullets.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-[color:var(--border)] bg-bg/80 px-3 py-2 text-sm text-text">
        {title}: {example}
      </div>
    </div>
  );
}

function StatusStat({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "muted" | "warning" | "success" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
        <Badge variant={tone}>{value}</Badge>
      </div>
    </div>
  );
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
      nextStep: "Abre el inbox y valida una conversacion real.",
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
        { title: "Equipo alineado", detail: "Todo el workspace opera sobre el mismo canal correcto." },
        { title: "Automatizaciones", detail: "Las reglas y respuestas van a quedar apoyadas sobre esta conexion." }
      ]
    };
  }

  if (effectiveState === "launching") {
    return {
      state: effectiveState,
      label: "Preparando conexion",
      variant: "warning" as const,
      dotClass: "bg-amber-300",
      title: "Estamos preparando tu conexion con Meta",
      description: "Validamos el workspace y dejamos listo el contexto para iniciar WhatsApp Business sin exponer configuracion tecnica innecesaria.",
      helper: "Este paso deja lista la base para que el Embedded Signup use el tenant correcto y no mezcle canales entre negocios.",
      nextStep: "En unos segundos te mostramos como continuar la activacion.",
      channelValue: "Preparando",
      webhookValue: "Pendiente",
      webhookTone: "warning" as const,
      primaryAction: "connect_meta" as const,
      primaryHref: null,
      primaryLabel: "Intentar conexion guiada con Meta",
      secondaryHref: "/app/integrations",
      secondaryLabel: "Quedarme aca",
      supportLabel: "Hablar con soporte",
      benefits: [
        { title: "Tenant correcto", detail: "La conexion se prepara con el workspace y la clinica correctos." },
        { title: "Sin datos tecnicos", detail: "No le pedimos al cliente WABA, tokens ni IDs manuales." },
        { title: "Base escalable", detail: "La siguiente etapa puede recibir el resultado real de Meta sin rehacer la UX." }
      ]
    };
  }

  if (effectiveState === "pending_meta") {
    return {
      state: effectiveState,
      label: "Pendiente de Meta",
      variant: "warning" as const,
      dotClass: "bg-amber-300",
      title: "La conexion ya tiene base tecnica lista",
      description: "Estamos preparando la ultima parte del flujo de Meta para este workspace. No hace falta que cargues IDs ni configuraciones manuales.",
      helper: launchMessage || "El siguiente paso es completar el flujo real de Embedded Signup con las credenciales finales del workspace.",
      nextStep: "Cuando habilitemos la conexion automatica, vas a poder terminarla desde este mismo boton.",
      channelValue: whatsapp.channelStatus || "Pendiente",
      webhookValue: "Pendiente",
      webhookTone: "warning" as const,
      primaryAction: "connect_meta" as const,
      primaryHref: null,
      primaryLabel: "Reintentar conexion guiada",
      secondaryHref: "/app/inbox",
      secondaryLabel: "Ver inbox",
      supportLabel: "Necesito ayuda",
      benefits: [
        { title: "Base ya preparada", detail: "El workspace, el clinicId y el callback futuro ya quedaron definidos." },
        { title: "UX sin friccion", detail: "El cliente no se enfrenta a errores ni a una modal tecnica confusa." },
        { title: "Escalable", detail: "La misma base sirve para otros tenants sin acoplarse al demo." }
      ]
    };
  }

  if (effectiveState === "ambiguous_configuration") {
    return {
      state: effectiveState,
      label: "Requiere revision",
      variant: "danger" as const,
      dotClass: "bg-rose-400",
      title: "Necesitamos revisar la configuracion del canal",
      description: "Detectamos una configuracion pendiente antes de activar tu WhatsApp y preferimos no mostrar un numero incorrecto en el portal.",
      helper: whatsapp.helper,
      nextStep: "Revisemos la conexion para dejar un unico canal correcto en este workspace.",
      channelValue: "Configuracion ambigua",
      webhookValue: "Pendiente",
      webhookTone: "danger" as const,
      primaryAction: "open_link" as const,
      primaryHref: "/app/integrations",
      primaryLabel: "Revisar conexion",
      secondaryHref: null,
      secondaryLabel: "",
      supportLabel: "Contactar soporte",
      benefits: [
        { title: "UI segura", detail: "No mostramos un numero ambiguo ni contaminamos el inbox con un canal equivocado." },
        { title: "Tenant aislado", detail: "La activacion se destraba solo cuando el canal correcto queda resuelto para este negocio." },
        { title: "Siguiente paso claro", detail: "El owner sabe que necesita revisar la conexion, no adivinar IDs tecnicos." }
      ]
    };
  }

  if (effectiveState === "error") {
    return {
      state: effectiveState,
      label: "Error",
      variant: "danger" as const,
      dotClass: "bg-rose-400",
      title: "No pudimos validar tu canal",
      description: "Hay una falla real distinta a un workspace sin conectar y conviene revisarla antes de seguir.",
      helper: whatsapp.helper,
      nextStep: "Revisa la conexion o contacta soporte para destrabar la activacion.",
      channelValue: whatsapp.channelStatus || "Error",
      webhookValue: whatsapp.webhookActive ? "Parcial" : "Pendiente",
      webhookTone: "danger" as const,
      primaryAction: "open_link" as const,
      primaryHref: "/app/integrations",
      primaryLabel: "Revisar conexion",
      secondaryHref: null,
      secondaryLabel: "",
      supportLabel: "Contactar soporte",
      benefits: [
        { title: "Diagnostico claro", detail: "Separamos errores reales de un simple workspace sin canal conectado." },
        { title: "Fuente unica", detail: "La pantalla sigue leyendo el mismo estado tenant-scoped que el home y el inbox." },
        { title: "Sin datos falsos", detail: "Nunca mostramos el canal global ni un numero ajeno por error." }
      ]
    };
  }

  return {
    state: effectiveState,
    label: "Sin conectar",
    variant: "warning" as const,
    dotClass: "bg-amber-300",
    title: "Conecta tu WhatsApp Business",
    description: "Activa tu canal principal para recibir mensajes reales, responder desde Opturon y automatizar conversaciones sin configuracion tecnica compleja.",
    helper: whatsapp.helper,
    nextStep: "Conecta tu numero principal para empezar a ver conversaciones reales en el inbox.",
    channelValue: "Sin conectar",
    webhookValue: "Pendiente",
    webhookTone: "warning" as const,
    primaryAction: "connect_meta" as const,
    primaryHref: null,
    primaryLabel: "Intentar conexion guiada con Meta",
    secondaryHref: "/app/inbox",
    secondaryLabel: "Ver inbox",
    supportLabel: "Necesito ayuda",
    benefits: [
      { title: "Recibir mensajes", detail: "Tus conversaciones van a entrar directo al inbox del workspace." },
      { title: "Responder desde Opturon", detail: "El equipo atiende desde un solo lugar, sin cambiar de herramienta." },
      { title: "Automatizar", detail: "El canal conectado habilita respuestas, handoff y seguimiento comercial." }
    ]
  };
}

function stateMeta(state: IntegrationState): {
  label: string;
  detail: string;
  variant: "muted" | "warning" | "success" | "danger";
} {
  if (state === "connected") {
    return {
      label: "Conectado",
      detail: "La integracion esta lista para operar y mostrar actividad dentro del workspace.",
      variant: "success"
    };
  }
  if (state === "connecting") {
    return {
      label: "Conectando",
      detail: "La conexion esta en preparacion o a la espera de completar su activacion.",
      variant: "warning"
    };
  }
  if (state === "error") {
    return {
      label: "Error",
      detail: "Hay una inconsistencia de acceso o configuracion que conviene revisar antes de operar.",
      variant: "danger"
    };
  }
  return {
    label: "No conectado",
    detail: "Disponible para iniciar la conexion cuando el negocio quiera activarlo.",
    variant: "muted"
  };
}
