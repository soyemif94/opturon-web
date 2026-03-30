"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  CopyPlus,
  KeyRound,
  LifeBuoy,
  LoaderCircle,
  PhoneCall,
  PlugZap,
  RefreshCw,
  ShieldAlert
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

  const templatesByKey = useMemo(() => {
    const map = new Map<string, PortalWhatsAppTemplate>();
    for (const item of liveTemplates) {
      const current = map.get(item.templateKey);
      if (!current || new Date(item.updatedAt || 0).getTime() > new Date(current.updatedAt || 0).getTime()) {
        map.set(item.templateKey, item);
      }
    }
    return map;
  }, [liveTemplates]);

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
    if (options?.openHelp) setManualHelpOpen(true);
  }

  async function handleMetaConnect() {
    setLaunchState("launching");
    setLaunchMessage(null);
    setLaunchIssueKind(null);

    try {
      const result = await beginMetaWhatsAppConnection();

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
      toast.success(result.state === "connected" ? "WhatsApp conectado" : "Conexion actualizada", result.message);
    } catch (error) {
      setLaunchState("idle");
      const details = getMetaEmbeddedSignupErrorDetails(error);
      setLaunchIssueKind(details.kind);
      setLaunchMessage(details.message);

      if (details.kind === "meta_blocked" || details.kind === "timeout") {
        toast.error("Meta no habilito la conexion guiada", details.message);
        focusManualConnection();
        return;
      }

      if (details.kind !== "cancelled") {
        toast.error("No pudimos iniciar la conexion", details.message);
      }
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
        | { data?: { status?: "connected" | "pending_meta"; validation?: { displayPhoneNumber?: string | null } }; error?: string; detail?: string }
        | null;

      if (!response.ok) {
        throw new Error(json?.detail || json?.error || "No pudimos validar el canal en Meta.");
      }

      await refreshWhatsAppStatus();
      router.refresh();
      toast.success(
        json?.data?.status === "connected" ? "WhatsApp conectado" : "Conexion validada",
        json?.data?.status === "connected"
          ? `El canal ${json?.data?.validation?.displayPhoneNumber || manualForm.phoneNumberId} ya quedo asociado a tu espacio.`
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
    setDiscoveryMessage("Buscando activos de WhatsApp en Meta Business...");
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
        throw new Error(formatDiscoverAssetsError(json?.error, json?.detail));
      }

      const items = json?.data?.items || [];
      setDiscoveryItems(items);
      setDiscoveryMessage(items.length ? null : "No encontramos activos accesibles con ese token. Puedes completar WABA ID y Phone Number ID manualmente.");
    } catch (error) {
      setDiscoveryMessage(error instanceof Error ? error.message : "No pudimos descubrir activos en Meta.");
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
      const json = (await response.json().catch(() => null)) as { data?: { created?: boolean }; error?: string; detail?: string } | null;

      if (!response.ok) {
        throw new Error(json?.detail || json?.error || "No pudimos crear la plantilla en Meta.");
      }

      await refreshTemplates();
      toast.success(json?.data?.created === false ? "Plantilla ya disponible" : "Plantilla creada");
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

  const readinessItems = [
    { label: "Canal del espacio", value: meta.channelValue, tone: meta.variant },
    { label: "Webhook", value: meta.webhookValue, tone: meta.webhookTone },
    { label: "Numero conectado", value: liveWhatsApp.connectedNumber || "Pendiente", tone: liveWhatsApp.connectedNumber ? "muted" : "warning" }
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
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Estado del canal</p>
              <div className="mt-2 flex items-center gap-3">
                <span className={`inline-flex h-3 w-3 rounded-full ${meta.dotClass}`} />
                <p className="text-lg font-semibold text-white">{meta.label}</p>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">{meta.helper}</p>
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

            {launchMessage ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-3 text-sm text-muted">{launchMessage}</div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {meta.primaryAction === "connect_meta" ? (
                <Button className="rounded-2xl px-5" onClick={() => void handleMetaConnect()} disabled={launchState === "launching"}>
                  {launchState === "launching" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {meta.primaryLabel}
                </Button>
              ) : (
                <Button asChild className="rounded-2xl px-5">
                  <Link href={meta.primaryHref || "/app/inbox"}>{meta.primaryLabel}</Link>
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
          <CardHeader action={<Badge variant="muted">Foco actual</Badge>}>
            <div>
              <CardTitle className="text-xl">Como queda la jerarquia</CardTitle>
              <CardDescription>La pantalla ahora comunica foco, solidez y estado real del producto.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[
              "WhatsApp queda como integracion principal y conserva toda su profundidad operativa.",
              "CRM externo queda visible como siguiente fase real, sin abrir una promesa sobredimensionada.",
              "Agenda pasa a ser un modulo interno del dashboard, no una integracion externa."
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-3 text-sm text-muted">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Panorama de producto</h2>
            <p className="text-sm text-muted">Solo mostramos lo que hoy aporta valor real o lo que ya tiene una direccion clara dentro de Opturon.</p>
          </div>
          <Badge variant="muted">Promesa acotada</Badge>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
          {productCards.map((integration) => {
            const state = stateMeta(integration.state);
            return (
              <Card key={integration.id} className="border-white/6 bg-card/90">
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
                  <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">{integration.detail}</div>
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

          <Card className="border-white/6 bg-card/90">
            <CardHeader action={<Badge variant="warning">Fuera de foco</Badge>}>
              <div>
                <CardTitle className="text-xl">Integraciones que salen del frente</CardTitle>
                <CardDescription>No ocupan protagonismo en esta fase para no prometer mas de lo que hoy esta consolidado.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {[
                "Instagram deja de aparecer como canal principal activo.",
                "Facebook Messenger deja de aparecer como integracion principal.",
                "Webchat no compite por jerarquia mientras no tenga madurez real.",
                "Google Calendar no se abre en esta fase porque Agenda es nativa."
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-3 text-sm text-muted">{item}</div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section
        ref={manualConnectionRef}
        tabIndex={-1}
        className="grid gap-5 outline-none xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]"
      >
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="warning">WhatsApp principal</Badge>}>
            <div>
              <CardTitle className="text-xl">Conexion manual asistida</CardTitle>
              <CardDescription>Completa WABA ID, Phone Number ID y tu Access Token para validar el canal directamente contra Meta.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
              No te pedimos configuracion tecnica de webhook ni pasos raros. Solo validamos tu WABA, tu numero y el token del canal para asociarlo al espacio correcto.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">WABA ID</span>
                <Input value={manualForm.wabaId} onChange={(event) => setManualForm((current) => ({ ...current, wabaId: event.target.value }))} placeholder="Ej. 178912345678901" autoComplete="off" inputMode="numeric" disabled={manualBusy} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Phone Number ID</span>
                <Input value={manualForm.phoneNumberId} onChange={(event) => setManualForm((current) => ({ ...current, phoneNumberId: event.target.value }))} placeholder="Ej. 109876543210987" autoComplete="off" inputMode="numeric" disabled={manualBusy} />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Access Token</span>
                <Input type="password" value={manualForm.accessToken} onChange={(event) => setManualForm((current) => ({ ...current, accessToken: event.target.value }))} placeholder="Pega aqui tu token de Meta" autoComplete="off" disabled={manualBusy} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Nombre del canal (opcional)</span>
                <Input value={manualForm.channelName} onChange={(event) => setManualForm((current) => ({ ...current, channelName: event.target.value }))} placeholder="Sucursal Palermo" autoComplete="off" disabled={manualBusy} />
              </label>
            </div>

            <div className="space-y-3 rounded-2xl border border-dashed border-[color:var(--border)] bg-bg/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Autodeteccion avanzada</p>
                  <p className="mt-1 text-sm text-muted">Requiere permisos avanzados de Meta Business y puede no funcionar con todos los tokens.</p>
                </div>
                <Button variant="ghost" className="rounded-2xl" onClick={() => void handleDiscoverAssets()} disabled={discoveryBusy || !manualForm.accessToken.trim()}>
                  {discoveryBusy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Autodetectar activos
                </Button>
              </div>
              {discoveryMessage ? <p className="text-sm text-muted">{discoveryMessage}</p> : null}
            </div>

            {discoveryItems.length ? (
              <div className="space-y-2 rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                {discoveryItems.map((item) => (
                  <button
                    key={`${item.wabaId}:${item.phoneNumberId}`}
                    type="button"
                    onClick={() => applyDiscoveredAsset(item)}
                    className="w-full rounded-2xl border border-[color:var(--border)] bg-bg/70 p-4 text-left transition hover:border-brand/40 hover:bg-bg"
                  >
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="mt-2 text-xs text-muted">WABA ID: {item.wabaId}</p>
                    <p className="text-xs text-muted">Phone Number ID: {item.phoneNumberId}</p>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl" onClick={() => void handleManualConnect()} disabled={manualBusy}>
                {manualBusy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Conectar manualmente
              </Button>
              <Dialog open={manualHelpOpen} onOpenChange={setManualHelpOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="rounded-2xl">Necesito ayuda con mis datos</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Donde encontrar estos datos en Meta</DialogTitle>
                    <DialogDescription>Te mostramos exactamente que copiar para conectar tu canal sin configuraciones raras.</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <HelperBlock title="WABA ID" description="Es el identificador de tu cuenta de WhatsApp Business." bullets={["No es tu email", "No es tu numero de telefono", "Es un numero largo"]} example="178912345678901" />
                    <HelperBlock title="Phone Number ID" description="Es el identificador interno del numero conectado en WhatsApp Cloud API." bullets={["No es el numero visible de WhatsApp", "Tambien es un numero largo"]} example="109876543210987" />
                    <HelperBlock title="Access Token" description="Es el token de acceso que autoriza a Meta a validar y usar ese canal." bullets={["Debe ser el token con acceso a esa cuenta y ese numero"]} example="EAAJ..." />
                  </div>

                  <DialogFooter className="justify-between">
                    <Button asChild variant="secondary" className="rounded-2xl">
                      <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">Abrir Meta for Developers</a>
                    </Button>
                    <Button asChild variant="ghost" className="rounded-2xl">
                      <a href={SUPPORT_LINK} target="_blank" rel="noreferrer">Hablar con soporte</a>
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">Validacion real</Badge>}>
            <div>
              <CardTitle className="text-xl">Que valida Opturon</CardTitle>
              <CardDescription>Antes de asociar el canal al tenant, validamos acceso real en Meta para evitar cruces entre espacios.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[
              "El token permite leer la WABA indicada.",
              "El Phone Number ID existe y es accesible con ese token.",
              "El numero realmente pertenece a esa WABA.",
              "El canal no esta ya asociado a otro espacio.",
              "Si Meta rechaza la suscripcion, mostramos el error real antes de guardar una conexion incompleta."
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-3 text-sm text-muted">{item}</div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Plantillas de WhatsApp</h2>
            <p className="text-sm text-muted">Blueprints base de Opturon para crear templates aprobables por cada WABA sin pedir configuracion manual.</p>
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
                  <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">{statusMeta.detail}</div>
                  <div className="flex flex-wrap gap-3">
                    <Button className="rounded-2xl" onClick={() => void handleCreateTemplate(blueprint.key, blueprint.defaultLanguage)} disabled={isBusy || liveWhatsApp.state !== "connected"}>
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

function formatDiscoverAssetsError(errorCode: string | null | undefined, detail: string | null | undefined) {
  const code = String(errorCode || "").trim();
  if (code === "meta_insufficient_permissions") {
    return "Tu token no tiene permisos para listar negocios o WABAs. Puedes continuar conectando manualmente.";
  }
  if (code === "meta_business_assets_not_found") {
    return "No encontramos activos accesibles con ese token. Si ya conoces tu WABA ID y tu Phone Number ID, puedes continuar con conexion manual.";
  }
  return String(detail || "").trim() || "No pudimos autodetectar activos desde Meta. Puedes continuar con conexion manual.";
}

function templateStatusMeta(status: string): {
  label: string;
  detail: string;
  variant: "muted" | "warning" | "success" | "danger";
} {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "approved") {
    return { label: "Aprobada", detail: "La plantilla ya esta aprobada en tu WABA y lista para usarse en automatizaciones futuras.", variant: "success" };
  }
  if (normalized === "pending" || normalized === "in_review") {
    return { label: "En revision", detail: "Meta recibio la plantilla y todavia no termino la aprobacion.", variant: "warning" };
  }
  if (normalized === "rejected" || normalized === "paused" || normalized === "disabled") {
    return { label: "Requiere revision", detail: "Meta no dejo la plantilla operativa. Conviene revisar el copy o crear una variante nueva.", variant: "danger" };
  }
  if (normalized === "draft") {
    return { label: "Borrador", detail: "La plantilla existe en Opturon, pero todavia no fue enviada a Meta para este espacio.", variant: "muted" };
  }
  return { label: "Sin crear", detail: "Todavia no existe una version de esta plantilla dentro del WhatsApp Business del tenant.", variant: "muted" };
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
      primaryLabel: "Intentar conexion guiada con Meta",
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
    title: "Conecta tu WhatsApp Business",
    description: "Activa tu canal principal para recibir mensajes reales, responder desde Opturon y automatizar conversaciones.",
    helper: launchMessage || whatsapp.helper,
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
