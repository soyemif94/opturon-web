"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CircleHelp, History, Plus, Sparkles } from "lucide-react";
import { AutomationsEmptyState } from "@/components/app/automations-empty-state";
import { AutomationsList, type AutomationModule } from "@/components/app/automations-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/ui/cn";
import type { PortalAutomation, PortalAutomationCatalogItem, PortalBusinessSettings } from "@/lib/api";

const BUSINESS_TYPE_OPTIONS = [
  { value: "dental_clinic", label: "Clinica odontologica" },
  { value: "medical_clinic", label: "Clinica medica" },
  { value: "retail_products", label: "Tiendas de ropa" },
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

const PROTECTED_RUNTIME_AUTOMATION_NAMES = new Set([
  "Conversational Welcome Menu",
  "Conversational Menu Products",
  "Conversational Menu Pricing",
  "Conversational Menu Human",
  "Conversational Menu Fallback"
]);

type RecommendationBlueprint = {
  id: string;
  title: string;
  copy: string;
  icon: AutomationModule["icon"];
  templateKey?: string;
  presetKey?: string;
  requiredCapabilities?: string[];
};

const RECOMMENDED_BY_BUSINESS: Record<string, RecommendationBlueprint[]> = {
  retail_products: [
    { id: "size-guide", title: "Consulta de talles", copy: "Responde dudas de talles automaticamente", icon: "faq", presetKey: "size-guide", requiredCapabilities: ["catalog"] },
    { id: "outfit", title: "Recomendacion de outfit", copy: "Sugiere productos complementarios", icon: "catalog", presetKey: "outfit", requiredCapabilities: ["catalog"] },
    { id: "cart-recovery", title: "Recuperacion de carrito", copy: "Recupera clientes que no completaron compra", icon: "followup", presetKey: "followup", requiredCapabilities: ["whatsapp"] },
    { id: "promotions", title: "Promociones automaticas", copy: "Envia ofertas personalizadas a tus clientes", icon: "payments", presetKey: "promotions", requiredCapabilities: ["whatsapp"] }
  ],
  default: [
    { id: "faq", title: "Preguntas frecuentes", copy: "Reduce consultas repetidas automaticamente", icon: "faq", presetKey: "faq", requiredCapabilities: ["whatsapp"] },
    { id: "handoff", title: "Derivacion humana", copy: "Escala conversaciones al equipo cuando hace falta", icon: "handoff", templateKey: "conversation_human_handoff", requiredCapabilities: ["whatsapp"] },
    { id: "followup", title: "Seguimiento comercial", copy: "Recupera contactos sin respuesta", icon: "followup", presetKey: "followup", requiredCapabilities: ["whatsapp"] },
    { id: "agenda", title: "Agenda / turnos", copy: "Orienta reservas, demos o reuniones", icon: "calendar", templateKey: "agenda_booking", requiredCapabilities: ["agenda"] }
  ]
};

function summarizeTrigger(automation: PortalAutomation) {
  if (automation.trigger.type === "keyword") {
    return automation.trigger.keyword ? `Cliente pregunta por "${automation.trigger.keyword}"` : "Cliente escribe una palabra clave";
  }
  if (automation.trigger.type === "off_hours") return "Cliente escribe fuera de horario";
  if (automation.trigger.type === "new_contact") return "Cliente escribe por primera vez";
  return "Cliente inicia una conversacion";
}

function summarizeActions(automation: PortalAutomation) {
  return automation.actions
    .map((action) => {
      if (action.type === "send_message") {
        const preview = String(action.message || "").trim();
        return preview ? preview : "Responder automaticamente";
      }
      if (action.type === "assign_human") return "Deriva con una persona";
      if (action.type === "tag_contact") {
        const tag = String(action.tag || "").trim();
        return tag ? `Etiqueta ${tag}` : "Ordena el contacto";
      }
      return action.type;
    })
    .join(" · ");
}

function commercialCopyForAutomation(automation: PortalAutomation) {
  const raw = `${automation.name} ${automation.description || ""} ${automation.trigger.type} ${automation.actions.map((action) => action.type).join(" ")}`.toLowerCase();
  const hasHuman = automation.actions.some((action) => action.type === "assign_human") || raw.includes("handoff") || raw.includes("hum");
  const hasCatalog = raw.includes("catalog") || raw.includes("product");
  const hasPayment = raw.includes("payment") || raw.includes("cobro") || raw.includes("comprobante") || raw.includes("transfer");
  const hasFollowup = raw.includes("follow") || raw.includes("recordatorio") || raw.includes("off_hours");
  const hasFallback = raw.includes("fallback") || raw.includes("no entiende") || raw.includes("default");

  if (hasPayment) {
    return {
      name: "Cobros y comprobantes",
      description: "Envia link de pago y registra comprobantes automaticamente.",
      icon: "payments" as const,
      chips: ["Genera link de pago", "Confirma el pago"]
    };
  }

  if (hasHuman) {
    return {
      name: "Derivacion humana",
      description: "Pasa la conversacion a una persona cuando es necesario.",
      icon: "handoff" as const,
      chips: ["Detecta necesidad", "Notifica al equipo"]
    };
  }

  if (hasCatalog) {
    return {
      name: "Catalogo inteligente",
      description: "Muestra tus productos automaticamente cuando preguntan por algo.",
      icon: "catalog" as const,
      chips: ["Envia productos", "Responde consultas"]
    };
  }

  if (automation.trigger.type === "new_contact" || raw.includes("welcome") || raw.includes("bienvenida")) {
    return {
      name: "Bienvenida automatica",
      description: "Saluda y guia a tus clientes cuando te escriben por primera vez.",
      icon: "welcome" as const,
      chips: ["Da la bienvenida", "Muestra opciones"]
    };
  }

  if (hasFollowup) {
    return {
      name: "Seguimiento automatico",
      description: "Recupera clientes que no respondieron o quedaron pendientes.",
      icon: "followup" as const,
      chips: ["Envia recordatorios", "Reactiva conversaciones"]
    };
  }

  if (hasFallback) {
    return {
      name: "Respuesta cuando no entiende",
      description: "Mantiene la conversacion viva cuando el cliente sale del flujo esperado.",
      icon: "fallback" as const,
      chips: ["Ordena la conversacion", "Sugiere siguiente paso"]
    };
  }

  return {
    name: "Asistente conversacional",
    description: automation.description || "Responde consultas y ayuda a ordenar conversaciones automaticamente.",
    icon: "bot" as const,
    chips: ["Atiende por WhatsApp", "Acompana al cliente"]
  };
}

function commercialCopyForTemplate(template: PortalAutomationCatalogItem) {
  const raw = `${template.key} ${template.name} ${template.description || ""}`.toLowerCase();

  if (raw.includes("payment") || raw.includes("invoice") || raw.includes("cobro") || raw.includes("comprobante")) {
    return {
      name: "Cobros y comprobantes",
      description: "Comparte datos de pago y ayuda a ordenar comprobantes o validaciones.",
      icon: "payments" as const,
      chips: ["Cobros", "Pagos"]
    };
  }

  if (raw.includes("agenda") || raw.includes("turno") || raw.includes("reserva")) {
    return {
      name: "Agenda / turnos",
      description: "Orienta reservas, demos o turnos sin depender de respuesta manual.",
      icon: "calendar" as const,
      chips: ["Agenda", "Reservas"]
    };
  }

  if (raw.includes("catalog") || raw.includes("product")) {
    return {
      name: "Catalogo inteligente",
      description: "Muestra productos o propuestas comerciales cuando el cliente pregunta.",
      icon: "catalog" as const,
      chips: ["Catalogo", "Productos"]
    };
  }

  if (raw.includes("fallback") || raw.includes("no entiende")) {
    return {
      name: "Respuesta cuando no entiende",
      description: "Recupera la conversacion cuando el mensaje no entra en un flujo claro.",
      icon: "fallback" as const,
      chips: ["Fallback", "Ordena la conversacion"]
    };
  }

  if (raw.includes("human") || raw.includes("handoff") || raw.includes("deriv")) {
    return {
      name: "Derivacion humana",
      description: "Pasa la conversacion a una persona cuando hace falta intervencion humana.",
      icon: "handoff" as const,
      chips: ["Escala al equipo", "Atencion humana"]
    };
  }

  if (raw.includes("welcome") || raw.includes("bienvenida")) {
    return {
      name: "Bienvenida automatica",
      description: "Recibe al cliente y ordena el primer paso de la conversacion.",
      icon: "welcome" as const,
      chips: ["Primer mensaje", "Guia al cliente"]
    };
  }

  if (raw.includes("pricing") || raw.includes("precio") || raw.includes("plan")) {
    return {
      name: "Planes y precios",
      description: "Ayuda a responder consultas comerciales sobre precios o planes.",
      icon: "bot" as const,
      chips: ["Ventas", "Precios"]
    };
  }

  if (raw.includes("generated_sales_bot")) {
    return {
      name: "Asistente comercial",
      description: "Acompana consultas comerciales por WhatsApp con respuestas guiadas.",
      icon: "bot" as const,
      chips: ["Bot comercial", "WhatsApp"]
    };
  }

  return {
    name: template.name,
    description: template.description || "Base disponible para sumar al asistente del negocio.",
    icon: "bot" as const,
    chips: ["Opturon", "Base lista"]
  };
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
  const [selectedTab, setSelectedTab] = useState<"mine" | "recommended" | "templates">("mine");

  useEffect(() => {
    setItems(automations);
  }, [automations]);

  useEffect(() => {
    setCatalogItems(catalog);
  }, [catalog]);

  useEffect(() => {
    setProfile(businessProfile);
  }, [businessProfile]);

  const businessTypeLabel = useMemo(() => {
    const current = BUSINESS_TYPE_OPTIONS.find((item) => item.value === profile?.businessType);
    return current?.label || "tu negocio";
  }, [profile?.businessType]);

  const enabledCapabilities = useMemo(() => {
    return new Set((profile?.capabilities || []).map((item) => String(item || "").trim().toLowerCase()));
  }, [profile?.capabilities]);

  const duplicateCountsByName = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, automation) => {
      const key = String(automation.name || "").trim();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [items]);

  const modules = useMemo<AutomationModule[]>(
    () =>
      items.map((automation) => {
        const commercial = commercialCopyForAutomation(automation);
        const safeName = String(automation.name || "").trim();
        return {
          id: automation.id,
          name: commercial.name,
          description: commercial.description,
          state: automation.enabled ? "activa" : "inactiva",
          enabled: automation.enabled,
          summary: summarizeActions(automation) || "Sin accion principal configurada todavia.",
          trigger: summarizeTrigger(automation),
          action: summarizeActions(automation) || "Sin accion principal configurada todavia.",
          icon: commercial.icon,
          chips: commercial.chips,
          channel: "WhatsApp",
          actionHref: `/app/automations/templates?focus=${encodeURIComponent(automation.id)}`,
          actionLabel: "Configurar",
          actionVariant: "secondary",
          canDelete: !PROTECTED_RUNTIME_AUTOMATION_NAMES.has(safeName) || (duplicateCountsByName[safeName] || 0) > 1,
          showToggle: true
        };
      }),
    [duplicateCountsByName, items]
  );

  const compatibleCatalog = useMemo(() => catalogItems, [catalogItems]);
  const catalogByKey = useMemo(() => new Map(compatibleCatalog.map((item) => [item.key, item])), [compatibleCatalog]);

  const templateModules = useMemo<AutomationModule[]>(
    () =>
      compatibleCatalog
        .filter((template) => !template.effectiveEnabled || !template.compatible)
        .map((template) => ({
          ...(() => {
            const commercial = commercialCopyForTemplate(template);
            const state = !template.compatible ? "requiere datos" : template.effectiveEnabled ? "activa" : "disponible";
            return {
              id: template.key,
              name: commercial.name,
              description: commercial.description,
              state,
              summary:
                state === "requiere datos"
                  ? `Necesita ${template.missingCapabilities.join(", ")} para funcionar sin friccion.`
                  : template.description || "Disponible para activar cuando quieras.",
              trigger: state === "requiere datos" ? "Requiere datos del negocio o canal" : "Disponible para sumar al asistente",
              action: "Amplia respuestas, ventas o derivaciones segun el caso",
              icon: commercial.icon,
              chips: state === "requiere datos" ? ["Requiere datos", businessTypeLabel] : commercial.chips,
              channel: "WhatsApp",
              actionHref: state === "requiere datos" ? "#advanced-config" : "/app/automations/templates",
              actionLabel: state === "requiere datos" ? "Ver requisitos" : state === "activa" ? "Revisar" : "Activar",
              actionVariant: state === "activa" ? "secondary" : "primary",
              onAction: state === "disponible" ? () => void handleToggleTemplate(template) : null,
              showToggle: false
            };
          })(),
          channel: "WhatsApp",
        })),
    [businessTypeLabel, compatibleCatalog]
  );

  const recommendedModules = useMemo<AutomationModule[]>(() => {
    const base = profile?.businessType === "retail_products" ? RECOMMENDED_BY_BUSINESS.retail_products : RECOMMENDED_BY_BUSINESS.default;
    return base.map((item) => {
      const matchedTemplate = item.templateKey ? catalogByKey.get(item.templateKey) || null : null;
      const matchedAutomation = modules.find((module) => module.name === item.title) || null;
      const missingRequiredCapabilities = (item.requiredCapabilities || []).filter((capability) => !enabledCapabilities.has(capability));

      if (matchedTemplate) {
        const commercial = commercialCopyForTemplate(matchedTemplate);
        const state = !matchedTemplate.compatible
          ? "requiere datos"
          : matchedTemplate.effectiveEnabled
            ? "activa"
            : "disponible";

        return {
          id: item.id,
          name: item.title,
          description: item.copy,
          state,
          summary:
            state === "requiere datos"
              ? `Necesita ${matchedTemplate.missingCapabilities.join(", ")} para activarse.`
              : state === "activa"
                ? "Ya esta lista dentro del espacio y se puede revisar o desactivar."
                : "Ya viene preparada para activarse con un click.",
          trigger: state === "requiere datos" ? "Primero completa requisitos del negocio" : "Lista para sumar al asistente del negocio",
          action: item.copy,
          icon: commercial.icon,
          chips: state === "requiere datos" ? ["Requiere datos", businessTypeLabel] : ["Recomendada", businessTypeLabel],
          channel: "WhatsApp",
          actionHref: state === "requiere datos" ? "#advanced-config" : "/app/automations",
          actionLabel: state === "requiere datos" ? "Ver requisitos" : state === "activa" ? "Revisar" : "Activar",
          actionVariant: state === "activa" ? "secondary" : "primary",
          onAction: state === "disponible" ? () => void handleToggleTemplate(matchedTemplate) : null,
          showToggle: false
        };
      }

      if (matchedAutomation) {
        return {
          ...matchedAutomation,
          id: item.id,
          name: item.title,
          description: item.copy,
          state: "ya configurada",
          summary: "Ya existe una automatizacion de este tipo en tu espacio.",
          chips: ["Ya configurada", businessTypeLabel],
          actionHref: "/app/automations",
          actionLabel: "Revisar",
          actionVariant: "secondary",
          showToggle: false
        };
      }

      const requiresData = missingRequiredCapabilities.length > 0;
      return {
        id: item.id,
        name: item.title,
        description: item.copy,
        state: requiresData ? "requiere datos" : "disponible",
        summary: requiresData
          ? `Necesita ${missingRequiredCapabilities.join(", ")} para usar esta base.`
          : "Abre una base ya prellenada para que no empieces desde cero.",
        trigger: requiresData ? "Completa primero los datos necesarios" : "Lista para crear una version inicial",
        action: item.copy,
        icon: item.icon,
        chips: requiresData ? ["Requiere datos", businessTypeLabel] : ["Disponible", businessTypeLabel],
        channel: "WhatsApp",
        actionHref: requiresData ? "#advanced-config" : `/app/automations/new?template=${encodeURIComponent(item.presetKey || item.id)}`,
        actionLabel: requiresData ? "Ver requisitos" : "Usar base",
        actionVariant: requiresData ? "secondary" : "primary",
        showToggle: false
      };
    });
  }, [businessTypeLabel, catalogByKey, enabledCapabilities, modules, profile?.businessType]);

  const stats = useMemo(() => {
    const active = modules.filter((item) => item.state === "activa").length;
    return { active, total: modules.length };
  }, [modules]);

  const interaccionesAutomatizadas = useMemo(() => "--", []);
  const tiempoAhorrado = useMemo(() => "--", []);

  const activeTabModules = useMemo(() => {
    if (selectedTab === "recommended") return recommendedModules;
    if (selectedTab === "templates") return templateModules;
    return modules;
  }, [modules, recommendedModules, selectedTab, templateModules]);

  const selectedTabCopy = useMemo(() => {
    if (selectedTab === "mine") {
      return "Estas son las automatizaciones reales de tu negocio. Aqui ves que hace cada una, cuando actua y si esta activa.";
    }
    if (selectedTab === "recommended") {
      return "Estas automatizaciones todavia no estan activas y podrian ayudarte a vender o atender mejor.";
    }
    return "Estas son ideas listas para usar. No son lo mismo que tus automatizaciones activas hasta que decidas activarlas o configurarlas.";
  }, [selectedTab]);

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

  async function handleDeleteAutomation(module: AutomationModule) {
    setPendingAutomationId(module.id);
    setPendingAction("delete");

    try {
      const response = await fetch(`/api/app/automations/${encodeURIComponent(module.id)}`, {
        method: "DELETE"
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success || !json?.data?.automation) {
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
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl text-sm leading-6 text-muted">
          Usa las automatizaciones base para lo cotidiano y crea una personalizada solo para casos especiales, como vacaciones, avisos temporales o promociones puntuales.
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary" className="rounded-2xl px-5">
            <Link href="#automation-help">
              <CircleHelp className="mr-2 h-4 w-4" />
              Como funciona
            </Link>
          </Button>
          <Button asChild className="rounded-2xl px-5">
            <Link href="/app/automations/new">
              <Plus className="mr-2 h-4 w-4" />
              Nueva automatizacion
            </Link>
          </Button>
        </div>
      </section>

      <Card className="overflow-hidden border-white/8 bg-[linear-gradient(135deg,rgba(192,80,0,0.18),rgba(24,24,24,0.96))] shadow-[0_18px_60px_rgba(176,80,0,0.16)]">
        <CardContent className="grid gap-5 p-6 xl:grid-cols-[minmax(0,1fr)_220px_220px_220px] xl:items-center">
          <div>
            <h2 className="text-[2rem] font-semibold leading-tight text-white">Tu negocio puede automatizar mas de lo que imaginas</h2>
            <p className="mt-3 text-sm leading-6 text-muted">Activa automatizaciones listas para usar y ahorra tiempo todos los dias.</p>
          </div>
          <SummaryMetric label="Automatizaciones activas" value={String(stats.active)} helper={`${stats.total} configuradas en este espacio`} tone="orange" />
          <SummaryMetric label="Interacciones automatizadas" value={interaccionesAutomatizadas} helper="Sin metrica expuesta todavia" tone="green" />
          <SummaryMetric label="Tiempo ahorrado" value={tiempoAhorrado} helper="Sin metrica expuesta todavia" tone="orange" />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-6 border-b border-white/8 text-sm">
            {[
              { key: "mine", label: "Mis automatizaciones" },
              { key: "recommended", label: "Recomendadas para tu negocio", badge: recommendedModules.length },
              { key: "templates", label: "Ideas listas para usar" }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedTab(tab.key as typeof selectedTab)}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-1 pb-3 pt-1 transition",
                  selectedTab === tab.key ? "border-brand text-brandBright" : "border-transparent text-muted hover:text-white"
                )}
              >
                <span>{tab.label}</span>
                {tab.badge ? <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">{tab.badge}</span> : null}
              </button>
            ))}
          </div>
          <Button asChild variant="ghost" className="rounded-2xl text-text">
            <Link href="#recent-activity">
              <History className="mr-2 h-4 w-4" />
              Ver historial de ejecuciones
            </Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/12 px-4 py-3 text-sm leading-6 text-muted">{selectedTabCopy}</div>

        {selectedTab === "mine" && modules.length === 0 ? (
          <AutomationsEmptyState />
        ) : (
          <AutomationsList
            modules={activeTabModules}
            pendingAutomationId={pendingAutomationId}
            pendingAction={pendingAction}
            onToggleEnabled={selectedTab === "mine" ? handleToggleEnabled : undefined}
            onDelete={selectedTab === "mine" ? handleDeleteAutomation : undefined}
          />
        )}
      </section>

      <Card id="recommended" className="overflow-hidden border-white/8 bg-[linear-gradient(135deg,rgba(192,80,0,0.16),rgba(12,20,32,0.98))]">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-semibold text-white">Recomendadas para {businessTypeLabel}</h3>
              <CircleHelp className="h-4 w-4 text-muted" />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Estas automatizaciones todavia no estan activas y podrian ayudarte a vender o atender mejor.
            </p>
          </div>

          <div className="grid flex-1 gap-3 lg:grid-cols-4">
            {recommendedModules.slice(0, 4).map((module) => (
              <div key={module.id} className="rounded-2xl border border-white/8 bg-black/12 p-4">
                <p className="font-medium text-white">{module.name}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{module.description}</p>
              </div>
            ))}
          </div>

          <Button asChild className="rounded-2xl px-5">
            <Link href="/app/automations#recommended">Ver sugerencias</Link>
          </Button>
        </CardContent>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card id="recent-activity" className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-2xl font-semibold text-white">Ejecuciones recientes</h3>
                <p className="mt-2 text-sm text-muted">Ultimas ejecuciones de tus automatizaciones.</p>
              </div>
              <Button asChild variant="secondary" className="rounded-2xl">
                <Link href="/app/automations">Ver todas las ejecuciones</Link>
              </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/8">
              <div className="hidden grid-cols-[1.4fr_0.6fr_0.6fr_1.2fr_0.6fr_1fr] gap-4 border-b border-white/8 bg-black/12 px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-muted lg:grid">
                <span>Automatizacion</span>
                <span>Estado</span>
                <span>Ejecutada</span>
                <span>Disparador</span>
                <span>Interacciones</span>
                <span>Resultado</span>
              </div>
              <div className="flex flex-wrap gap-2 border-b border-white/8 px-4 py-3">
                <ExecutionStateChip label="Completada" tone="success" />
                <ExecutionStateChip label="Enviada" tone="info" />
                <ExecutionStateChip label="Fallida" tone="danger" />
                <ExecutionStateChip label="Pendiente" tone="warning" />
              </div>
              <div className="px-4 py-10 text-sm text-muted">
                <p>Todavia no hay ejecuciones recientes.</p>
                <p className="mt-2">Cuando el bot responda, derive o envie mensajes, vas a ver la actividad aca.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="automation-help" className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
          <CardContent className="space-y-4 p-5">
            <div>
              <h3 className="text-2xl font-semibold text-white">Necesitas ayuda?</h3>
              <p className="mt-2 text-sm leading-6 text-muted">Aprende a crear y optimizar tus automatizaciones.</p>
            </div>

            {[
              { title: "Guia rapida", copy: "Paso a paso para empezar", href: "/app/automations/templates" },
              { title: "Mejores practicas", copy: "Consejos para vender mas", href: "/app/automations/templates" },
              { title: "Centro de ayuda", copy: "Videos y articulos", href: "/app/automations/templates" }
            ].map((item) => (
              <Link key={item.title} href={item.href} className="block rounded-2xl border border-white/8 bg-black/12 p-4 transition hover:border-brand/30 hover:bg-brand/8">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-muted">{item.copy}</p>
                  </div>
                  <ArrowChip />
                </div>
              </Link>
            ))}

            <div className="rounded-2xl border border-white/8 bg-black/12 p-4">
              <p className="text-sm leading-6 text-muted">Las automatizaciones trabajan sobre WhatsApp y respetan pausas humanas.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card id="advanced-config" className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
        <CardContent className="space-y-4 p-5">
          <div>
            <h3 className="text-xl font-semibold text-white">Configuracion avanzada del asistente</h3>
            <p className="mt-2 text-sm leading-6 text-muted">Estos datos ayudan a Opturon a recomendar automatizaciones segun tu negocio.</p>
          </div>

          <details className="group rounded-2xl border border-white/8 bg-black/12 p-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-white">Ver ajustes avanzados</summary>
            <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Tipo de negocio</label>
                  <select
                    className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                    value={profile?.businessType || "services_general"}
                    disabled={savingProfile}
                    onChange={(event) => void saveBusinessProfile({ businessType: event.target.value })}
                  >
                    {BUSINESS_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">Capacidades del asistente</p>
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
                  <p className="text-xs text-muted">
                    No hace falta tocar esto salvo que quieras afinar recomendaciones o modulos avanzados.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-lg font-semibold text-white">Automatizaciones disponibles para activar</h4>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Estas ideas listas para usar no son lo mismo que tus automatizaciones activas hasta que decidas activarlas.
                  </p>
                </div>

                {compatibleCatalog.length ? (
                  compatibleCatalog.map((template) => (
                    <div key={template.key} className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-black/12 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{template.name}</p>
                          <Badge variant={template.effectiveEnabled ? "success" : "muted"}>
                            {template.effectiveEnabled ? "Activa" : "Disponible"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted">{template.description || "Idea disponible para sumar al asistente."}</p>
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
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-muted">
                    Todavia no hay automatizaciones disponibles para activar con el perfil actual.
                  </div>
                )}
              </div>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  helper,
  tone
}: {
  label: string;
  value: string;
  helper: string;
  tone: "orange" | "green";
}) {
  return (
    <div className="flex items-center gap-4">
      <span className={cn("inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border", tone === "orange" ? "border-brand/35 text-brandBright" : "border-emerald-500/35 text-emerald-300")}>
        {tone === "orange" ? <Sparkles className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
      </span>
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
        <p className="mt-1 text-sm text-muted">{helper}</p>
      </div>
    </div>
  );
}

function ArrowChip() {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-muted">
      <ArrowRight className="h-4 w-4" />
    </span>
  );
}

function ExecutionStateChip({
  label,
  tone
}: {
  label: string;
  tone: "success" | "info" | "danger" | "warning";
}) {
  const toneClass = {
    success: "border-emerald-500/25 bg-emerald-500/12 text-emerald-300",
    info: "border-sky-500/25 bg-sky-500/12 text-sky-300",
    danger: "border-rose-500/25 bg-rose-500/12 text-rose-300",
    warning: "border-amber-500/25 bg-amber-500/12 text-amber-300"
  } as const;

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", toneClass[tone])}>
      <span className="inline-flex h-2 w-2 rounded-full bg-current" />
      {label}
    </span>
  );
}
