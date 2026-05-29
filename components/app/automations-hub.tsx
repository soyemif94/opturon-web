"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, Clock3, MessageCircleMore, PhoneCall, ShieldCheck, Sparkles, UserRound, Wand2 } from "lucide-react";
import { AutomationsEmptyState } from "@/components/app/automations-empty-state";
import { AutomationsList, type AutomationModule } from "@/components/app/automations-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import type { PortalAutomation, PortalAutomationCatalogItem, PortalBusinessSettings } from "@/lib/api";

const recommendedModules: AutomationModule[] = [
  {
    id: "welcome",
    name: "Bienvenida",
    description: "Recibe al contacto y encuadra el inicio de la conversacion.",
    state: "activa",
    summary: "Saludo inicial activo con mensaje de marca y primer filtro de intencion.",
    trigger: "Cuando llega el primer mensaje",
    action: "Enviar bienvenida y ordenar la intencion",
    icon: "sparkles"
  },
  {
    id: "off-hours",
    name: "Fuera de horario",
    description: "Responde automaticamente cuando el negocio no esta atendiendo.",
    state: "activa",
    summary: "Hoy informa horario y promete seguimiento del equipo al proximo bloque operativo.",
    trigger: "Mensaje recibido fuera de horario",
    action: "Informar horario y prometer seguimiento",
    icon: "moon"
  },
  {
    id: "handoff",
    name: "Derivacion a humano",
    description: "Escala conversaciones al equipo cuando hace falta intervencion.",
    state: "recomendada",
    summary: "Ideal para urgencias, prospectos calientes o consultas sensibles.",
    trigger: "Conversacion sensible o prospecto caliente",
    action: "Derivar al equipo humano",
    icon: "human"
  },
  {
    id: "faq",
    name: "Preguntas frecuentes",
    description: "Resuelve dudas repetidas para bajar carga manual.",
    state: "activa",
    summary: "Preparada para horarios, precios base, zonas y respuestas cortas.",
    trigger: "Consultas repetidas del cliente",
    action: "Responder FAQ automaticamente",
    icon: "faq"
  },
  {
    id: "lead-capture",
    name: "Captura de prospectos",
    description: "Pide datos basicos y ordena el primer contacto comercial.",
    state: "requiere configuracion",
    summary: "Falta definir que datos del prospecto quieres capturar primero.",
    trigger: "Primer contacto comercial",
    action: "Pedir datos clave del prospecto",
    icon: "phone"
  },
  {
    id: "appointments",
    name: "Agenda / turnos",
    description: "Guia reservas, confirmaciones o derivacion a agenda.",
    state: "recomendada",
    summary: "Pensada para clinicas, demos, reuniones y turnos comerciales.",
    trigger: "Consulta sobre turnos o reuniones",
    action: "Guiar reserva o derivar a agenda",
    icon: "calendar"
  },
  {
    id: "reminders",
    name: "Recordatorios",
    description: "Recupera conversaciones y evita que los prospectos se enfrien.",
    state: "inactiva",
    summary: "Todavia no se estan enviando recordatorios automaticos a contactos sin respuesta.",
    trigger: "Prospecto sin respuesta o seguimiento pendiente",
    action: "Enviar recordatorio automatico",
    icon: "alarm"
  },
  {
    id: "quick-replies",
    name: "Respuestas rapidas",
    description: "Sugerencias cortas para acelerar atencion y mantener consistencia.",
    state: "activa",
    summary: "Disponibles para soporte, ventas y handoff a humano desde el inbox.",
    trigger: "Respuesta frecuente del equipo",
    action: "Sugerir respuestas listas para usar",
    icon: "bot"
  }
];

const BUSINESS_TYPE_OPTIONS = [
  { value: "dental_clinic", label: "Clinica odontologica" },
  { value: "medical_clinic", label: "Clinica medica" },
  { value: "retail_products", label: "Comercio con productos" },
  { value: "services_general", label: "Servicios generales" },
  { value: "beauty_salon", label: "Peluqueria / estetica" }
] as const;

const CAPABILITY_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "contacts", label: "Contactos" },
  { value: "agenda", label: "Agenda" },
  { value: "catalog", label: "Catalogo" },
  { value: "payments", label: "Cobros" }
] as const;

function summarizeTrigger(automation: PortalAutomation) {
  if (automation.trigger.type === "keyword") {
    return automation.trigger.keyword ? `Cuando detecta la palabra "${automation.trigger.keyword}"` : "Cuando detecta una palabra clave";
  }
  if (automation.trigger.type === "off_hours") return "Cuando llega un mensaje fuera de horario";
  if (automation.trigger.type === "new_contact") return "Cuando entra un contacto nuevo";
  return "Cuando llega un mensaje";
}

function summarizeActions(automation: PortalAutomation) {
  return automation.actions
    .map((action) => {
      if (action.type === "send_message") {
        const preview = String(action.message || "").trim();
        return preview ? `Mensaje: ${preview}` : "Enviar mensaje";
      }
      if (action.type === "assign_human") return "Derivar a una persona del equipo";
      if (action.type === "tag_contact") {
        const tag = String(action.tag || "").trim();
        return tag ? `Etiqueta: ${tag}` : "Etiquetar contacto";
      }
      return action.type;
    })
    .join(" | ");
}

export function AutomationsHub({
  automations,
  catalog,
  businessProfile
}: {
  automations: PortalAutomation[];
  catalog: PortalAutomationCatalogItem[];
  businessProfile: PortalBusinessSettings | null;
}) {
  const [items, setItems] = useState(automations);
  const [catalogItems, setCatalogItems] = useState(catalog);
  const [profile, setProfile] = useState<PortalBusinessSettings | null>(businessProfile);
  const [pendingAutomationId, setPendingAutomationId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"toggle" | "delete" | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pendingTemplateKey, setPendingTemplateKey] = useState<string | null>(null);

  useEffect(() => {
    setItems(automations);
  }, [automations]);

  useEffect(() => {
    setCatalogItems(catalog);
  }, [catalog]);

  useEffect(() => {
    setProfile(businessProfile);
  }, [businessProfile]);

  const modules = useMemo<AutomationModule[]>(
    () =>
      items.map((automation) => ({
        id: automation.id,
        name: automation.name,
        description:
          automation.description ||
          (automation.enabled ? "Automatizacion activa en este espacio." : "Automatizacion creada pero todavia inactiva."),
        state: automation.enabled ? "activa" : "inactiva",
        enabled: automation.enabled,
        summary: summarizeActions(automation) || "Sin acciones configuradas",
        trigger: summarizeTrigger(automation),
        action: summarizeActions(automation) || "Sin acciones configuradas",
        channel: "WhatsApp",
        readiness: automation.enabled ? "Responde automaticamente" : "Pendiente de activacion",
        headline:
          automation.description ||
          (automation.enabled ? "Ayuda a responder, ordenar y derivar conversaciones en vivo." : "Disponible para sumarse a tu operacion automatica."),
        icon:
          automation.trigger.type === "off_hours"
            ? "moon"
            : automation.trigger.type === "new_contact"
              ? "phone"
              : automation.trigger.type === "keyword"
                ? "faq"
                : "sparkles"
      })),
    [items]
  );

  const stats = useMemo(() => {
    const active = modules.filter((item) => item.state === "activa").length;
    const pending = modules.filter((item) => item.state === "requiere configuracion").length;
    const recommended = recommendedModules.filter((item) => item.state === "recomendada").length;
    return { active, pending, recommended, total: modules.length };
  }, [modules]);

  const compatibleCatalog = useMemo(
    () => catalogItems.filter((item) => item.compatible),
    [catalogItems]
  );

  const incompatibleCatalog = useMemo(
    () => catalogItems.filter((item) => !item.compatible),
    [catalogItems]
  );

  const whatsappEnabled = useMemo(
    () => (profile?.capabilities || []).includes("whatsapp"),
    [profile]
  );

  const assistantState = useMemo(() => {
    if (!whatsappEnabled) {
      return {
        label: "Requiere configuracion",
        variant: "warning" as const,
        copy: "Conecta WhatsApp para activar respuestas automaticas y handoff comercial."
      };
    }
    if (stats.active > 0) {
      return {
        label: "Activo",
        variant: "success" as const,
        copy: "El asistente puede responder consultas, mostrar productos, compartir datos de pago y derivar a una persona cuando haga falta."
      };
    }
    return {
      label: "En espera",
      variant: "muted" as const,
      copy: "El canal esta listo, pero todavia no hay flujos activos resolviendo conversaciones."
    };
  }, [stats.active, whatsappEnabled]);

  const recommendedNextStep = useMemo(() => {
    if (!whatsappEnabled) return { title: "Conectar WhatsApp", href: "/app/integrations", label: "Ir a Integraciones" };
    if (!stats.active) return { title: "Activar primer flujo", href: "/app/automations/templates", label: "Ver recomendaciones" };
    return { title: "Revisar flujos activos", href: "/app/automations/templates", label: "Revisar flujos" };
  }, [stats.active, whatsappEnabled]);

  const activeCatalogCount = useMemo(
    () => compatibleCatalog.filter((item) => item.effectiveEnabled).length,
    [compatibleCatalog]
  );

  const conversationPreview = useMemo(() => {
    if (modules.some((module) => module.state === "activa")) {
      return {
        customer: "Cliente: Hola, quiero saber precios",
        bot: "Bot: Hola, te cuento las opciones disponibles y si quieres te derivo con una persona."
      };
    }
    return {
      customer: "Cliente: Hola, quiero saber precios",
      bot: whatsappEnabled
        ? "Bot: El canal esta listo. Activa una automatizacion para que esta respuesta salga de forma automatica."
        : "Bot: Conecta WhatsApp para habilitar respuestas automaticas y acompanamiento comercial."
    };
  }, [modules, whatsappEnabled]);

  async function handleToggleEnabled(module: AutomationModule) {
    const nextEnabled = module.state !== "activa";
    setPendingAutomationId(module.id);
    setPendingAction("toggle");

    try {
      const response = await fetch(`/api/app/automations/${encodeURIComponent(module.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success || !json?.data?.automation) {
        throw new Error(String(json?.error || "automation_update_failed"));
      }

      const updated = json.data.automation as PortalAutomation;
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(nextEnabled ? "Automatizacion activada" : "Automatizacion desactivada");
    } catch (error) {
      toast.error("No se pudo actualizar la automatizacion", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setPendingAutomationId(null);
      setPendingAction(null);
    }
  }

  async function handleDelete(module: AutomationModule) {
    const confirmed =
      typeof window === "undefined" ? false : window.confirm("¿Seguro que querés eliminar esta automatización?");
    if (!confirmed) {
      return;
    }

    setPendingAutomationId(module.id);
    setPendingAction("delete");

    try {
      const response = await fetch(`/api/app/automations/${encodeURIComponent(module.id)}`, {
        method: "DELETE"
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(String(json?.error || "automation_delete_failed"));
      }

      setItems((current) => current.filter((item) => item.id !== module.id));
      toast.success("Automatizacion eliminada");
    } catch (error) {
      toast.error("No se pudo eliminar la automatizacion", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setPendingAutomationId(null);
      setPendingAction(null);
    }
  }

  async function saveBusinessProfile(patch: Partial<PortalBusinessSettings>) {
    setSavingProfile(true);
    try {
      const response = await fetch("/api/app/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessType: patch.businessType ?? profile?.businessType ?? "services_general",
          capabilities: patch.capabilities ?? profile?.capabilities ?? []
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.detail || json?.error || "business_profile_update_failed"));
      }

      setProfile((current) => ({
        ...(current || {
          tenantId: "",
          clinicId: null,
          clinicName: null,
          profileImageUrl: "",
          legalName: "",
          taxId: "",
          taxIdType: "NONE",
          vatCondition: "",
          grossIncomeNumber: "",
          fiscalAddress: "",
          city: "",
          province: "",
          pointOfSaleSuggested: "",
          defaultSuggestedFiscalVoucherType: "NONE",
          accountantEmail: "",
          accountantName: "",
          openingHours: "",
          address: "",
          deliveryZones: "",
          paymentMethods: "",
          policies: "",
          businessType: "services_general",
          capabilities: []
        }),
        ...(json?.settings || {}),
        businessType: json?.settings?.businessType || patch.businessType || current?.businessType || "services_general",
        capabilities: Array.isArray(json?.settings?.capabilities)
          ? json.settings.capabilities
          : patch.capabilities || current?.capabilities || []
      }));
      toast.success("Perfil de automatizacion actualizado");
      window.location.reload();
    } catch (error) {
      toast.error("No se pudo guardar el perfil", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleToggleTemplate(template: PortalAutomationCatalogItem) {
    const nextEnabled = !template.tenantEnabled;
    setPendingTemplateKey(template.key);
    try {
      const response = await fetch(`/api/app/automations/catalog/${encodeURIComponent(template.key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success || !json?.data?.template) {
        throw new Error(String(json?.error || "automation_template_update_failed"));
      }

      setCatalogItems((current) => current.map((item) => (item.key === template.key ? json.data.template : item)));
      toast.success(nextEnabled ? "Template habilitado" : "Template deshabilitado");
      window.location.reload();
    } catch (error) {
      toast.error("No se pudo actualizar el template", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setPendingTemplateKey(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(192,80,0,0.24),transparent_24%),linear-gradient(180deg,rgba(12,16,24,0.98),rgba(9,13,20,0.96))] p-4 shadow-[var(--card-shadow)] md:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <Badge variant="warning">Automatizaciones</Badge>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Asistente comercial automatico</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Configura como Opturon responde, acompana y deriva conversaciones por WhatsApp.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">WhatsApp</Badge>
              <Badge variant={assistantState.variant}>{assistantState.label}</Badge>
              <Badge variant="success">Operacion en vivo</Badge>
              <Badge variant="muted">Atencion automatica</Badge>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatBlock label="Flujos activos" value={String(stats.active)} helper={`${stats.total} disponibles en este espacio`} />
            <StatBlock label="Catalogo compatible" value={String(compatibleCatalog.length)} helper={`${activeCatalogCount} ya activos`} />
            <StatBlock label="Canal" value={whatsappEnabled ? "Listo" : "Pendiente"} helper={whatsappEnabled ? "WhatsApp habilitado" : "Falta conectar WhatsApp"} />
            <StatBlock label="Siguiente foco" value={stats.pending ? String(stats.pending) : String(stats.recommended)} helper={stats.pending ? "Requieren configuracion" : "Recomendadas para activar"} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Card className="overflow-hidden border-white/8 bg-[linear-gradient(135deg,rgba(192,80,0,0.18),rgba(12,20,32,0.98))] shadow-[0_18px_60px_rgba(176,80,0,0.16)]">
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={assistantState.variant}>{assistantState.label}</Badge>
                  <Badge variant="outline">{whatsappEnabled ? "Canal listo" : "Canal pendiente"}</Badge>
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-white">Estado del asistente</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{assistantState.copy}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-2xl px-5">
                  <Link href={recommendedNextStep.href}>{recommendedNextStep.label}</Link>
                </Button>
                <Button asChild variant="secondary" className="rounded-2xl px-5">
                  <Link href="/app/automations/new">Nueva automatizacion</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <HeroMiniCard
                icon={<Bot className="h-4 w-4" />}
                title="Que responde hoy"
                copy={stats.active ? "Saluda, filtra intenciones y acompana conversaciones con flujos activos." : "Todavia no hay respuestas automaticas activas en este espacio."}
              />
              <HeroMiniCard
                icon={<PhoneCall className="h-4 w-4" />}
                title="Como deriva"
                copy={modules.some((module) => module.name.toLowerCase().includes("deriv")) ? "Puede pasar conversaciones a una persona cuando hace falta." : "Todavia no hay un flujo claro de handoff humano configurado."}
              />
              <HeroMiniCard
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Que respeta"
                copy="Las automatizaciones trabajan sobre WhatsApp y respetan pausas humanas cuando el equipo toma la conversacion."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
          <CardContent className="space-y-4 p-5">
            <div>
              <h3 className="text-xl font-semibold text-white">Resumen operativo</h3>
              <p className="mt-1 text-sm text-muted">Guia corta para entender que hace el bot hoy y cual es el siguiente mejor paso.</p>
            </div>

            <SidebarBullet title="Que hace el bot hoy" copy={stats.active ? `${stats.active} flujo(s) activos respondiendo o acompanando conversaciones.` : "No hay flujos activos todavia."} />
            <SidebarBullet title="Proxima mejora recomendada" copy={recommendedNextStep.title} />
            <SidebarBullet title="Estado del canal" copy={whatsappEnabled ? "WhatsApp disponible para respuestas automaticas." : "Conecta WhatsApp para activar respuestas automaticas."} />
            <SidebarBullet title="Ultimos ajustes" copy={savingProfile ? "Guardando cambios de compatibilidad..." : "Puedes ajustar rubro y capacidades desde esta misma pantalla."} />

            <div className="rounded-2xl border border-white/8 bg-black/12 p-4">
              <p className="text-sm font-medium text-white">Preview conversacional</p>
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-white/8 bg-surface/55 px-4 py-3 text-sm text-white">{conversationPreview.customer}</div>
                <div className="rounded-2xl border border-brand/25 bg-brand/10 px-4 py-3 text-sm text-brandBright">{conversationPreview.bot}</div>
              </div>
            </div>

            <Button asChild variant="secondary" className="w-full rounded-2xl">
              <Link href={recommendedNextStep.href}>
                {recommendedNextStep.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {!whatsappEnabled ? (
        <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Conecta WhatsApp para activar respuestas automaticas</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                El asistente comercial necesita el canal conectado para responder, derivar conversaciones y apoyar ventas en vivo.
              </p>
            </div>
            <Button asChild className="rounded-2xl px-5">
              <Link href="/app/integrations">Ir a Integraciones</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(300px,0.76fr)_minmax(0,1.24fr)]">
        <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-white">Contexto del negocio</h3>
                <p className="mt-1 text-sm text-muted">Ajusta rubro y capacidades para mostrar flujos coherentes con tu operacion.</p>
              </div>
              <Badge variant="outline">Perfil del tenant</Badge>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Tipo de negocio</label>
              <select
                className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                value={profile?.businessType || "services_general"}
                disabled={savingProfile}
                onChange={(event) => void saveBusinessProfile({ businessType: event.target.value })}
              >
                {BUSINESS_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-white">Capacidades activas</p>
              <div className="flex flex-wrap gap-2">
                {CAPABILITY_OPTIONS.map((capability) => {
                  const active = (profile?.capabilities || []).includes(capability.value);
                  return (
                    <Button
                      key={capability.value}
                      type="button"
                      size="sm"
                      variant={active ? "primary" : "secondary"}
                      disabled={savingProfile}
                      onClick={() => {
                        const current = new Set(profile?.capabilities || []);
                        if (active) current.delete(capability.value);
                        else current.add(capability.value);
                        void saveBusinessProfile({ capabilities: Array.from(current) });
                      }}
                    >
                      {capability.label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted">WhatsApp y Contactos habilitan automatizacion conversacional. Agenda, Catalogo y Cobros destraban flujos mas especificos.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-white">Flujos recomendados para este negocio</h3>
                <p className="mt-1 text-sm text-muted">Activa automatizaciones compatibles y detecta rapido lo que todavia falta preparar.</p>
              </div>
              <Badge variant="warning">Catalogo maestro</Badge>
            </div>

            {compatibleCatalog.length > 0 ? (
              <div className="space-y-3">
                {compatibleCatalog.map((template) => (
                  <div key={template.key} className="rounded-2xl border border-white/8 bg-black/12 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white">{template.name}</p>
                          <Badge variant={template.effectiveEnabled ? "success" : "muted"}>{template.effectiveEnabled ? "Activa" : "Disponible"}</Badge>
                          <Badge variant="outline">WhatsApp</Badge>
                        </div>
                        <p className="text-sm leading-6 text-muted">{template.description}</p>
                        <p className="text-xs text-muted">
                          {template.requiredCapabilities.length ? `Necesita ${template.requiredCapabilities.join(", ")}.` : "Lista para activarse sin requisitos extra."}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={template.tenantEnabled ? "secondary" : "primary"}
                        disabled={pendingTemplateKey === template.key}
                        onClick={() => void handleToggleTemplate(template)}
                      >
                        {pendingTemplateKey === template.key ? "Guardando..." : template.tenantEnabled ? "Deshabilitar" : "Habilitar"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-muted">
                Todavia no hay automatizaciones compatibles con el perfil actual. Ajusta rubro o capacidades para destrabar opciones.
              </div>
            )}

            {incompatibleCatalog.length > 0 ? (
              <div className="rounded-2xl border border-white/8 bg-black/12 p-4">
                <p className="text-sm font-semibold text-white">Que requiere configuracion previa</p>
                <div className="mt-3 space-y-2">
                  {incompatibleCatalog.map((template) => (
                    <div key={template.key} className="rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.03)] p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-white">{template.name}</span>
                        <Badge variant="muted">{template.category}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        {template.businessTypeMatch ? "Faltan capacidades: " : "No aplica a este rubro. "}
                        {template.businessTypeMatch ? template.missingCapabilities.join(", ") : template.businessTypes.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {modules.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-white">Flujos automaticos</h3>
              <p className="mt-1 text-sm text-muted">Cada card resume que responde el bot, cuando actua y si ya esta lista para operar.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{stats.active} activas</Badge>
              <Badge variant="muted">{stats.total - stats.active} en espera</Badge>
            </div>
          </div>
          <AutomationsList
            modules={modules}
            pendingAutomationId={pendingAutomationId}
            pendingAction={pendingAction}
            onToggleEnabled={handleToggleEnabled}
            onDelete={handleDelete}
          />
        </section>
      ) : (
        <AutomationsEmptyState />
      )}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
          <CardContent className="grid gap-3 p-5 md:grid-cols-2">
            {[
              {
                icon: <MessageCircleMore className="h-4 w-4" />,
                title: "Responde consultas frecuentes",
                copy: "Permite contestar rapido sin que el cliente sienta que esta hablando con un sistema tecnico."
              },
              {
                icon: <Wand2 className="h-4 w-4" />,
                title: "Ordena conversaciones",
                copy: "Ayuda a mostrar productos, compartir datos de pago y activar handoff en el momento correcto."
              },
              {
                icon: <CheckCircle2 className="h-4 w-4" />,
                title: "Acompana el proceso comercial",
                copy: "Hace visible que flujos ya estan prendidos y cuales conviene activar primero."
              },
              {
                icon: <Sparkles className="h-4 w-4" />,
                title: "Simplifica la operacion",
                copy: "Evita que Automatizaciones se lea como panel tecnico y lo convierte en centro de ayuda comercial."
              }
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/8 bg-black/12 p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-brandBright">{item.icon}</span>
                  <div>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
          <CardContent className="space-y-3 p-5">
            <div>
              <h3 className="text-xl font-semibold text-white">Proximo paso recomendado</h3>
              <p className="mt-1 text-sm text-muted">Una guia simple para avanzar sin perder tiempo en configuracion tecnica.</p>
            </div>
            {[
              "Revisar bienvenidas y preguntas frecuentes activas.",
              "Definir fuera de horario y recordatorios comerciales.",
              "Configurar handoff a humano para conversaciones sensibles."
            ].map((item) => (
              <SidebarBullet key={item} title={item} copy="Mantiene la operacion ordenada y mejora la conversion por WhatsApp." />
            ))}
            <Button asChild className="w-full rounded-2xl">
              <Link href={recommendedNextStep.href}>{recommendedNextStep.label}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatBlock({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/12 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-muted">{helper}</p>
    </div>
  );
}

function HeroMiniCard({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/12 p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-brandBright">{icon}</span>
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
        </div>
      </div>
    </div>
  );
}

function SidebarBullet({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/12 p-4">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
    </div>
  );
}
