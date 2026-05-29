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
  { value: "retail_products", label: "Tienda de ropa" },
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

type EssentialBlueprint = {
  id: string;
  title: string;
  description: string;
  icon: AutomationModule["icon"];
  chips: readonly string[];
  templateKey?: string;
  runtimeNames?: readonly string[];
  presetKey?: string;
};

const ESSENTIAL_BLUEPRINTS: EssentialBlueprint[] = [
  {
    id: "welcome",
    title: "Bienvenida automatica",
    description: "Saluda al cliente y ordena el primer paso de la conversacion.",
    icon: "welcome" as const,
    chips: ["Esencial", "Primer mensaje"],
    templateKey: "conversation_welcome",
    runtimeNames: ["Conversational Welcome Menu"],
    presetKey: "welcome"
  },
  {
    id: "handoff",
    title: "Derivacion a humano",
    description: "Pasa la conversacion a una persona cuando hace falta ayuda real.",
    icon: "handoff" as const,
    chips: ["Esencial", "Atencion humana"],
    templateKey: "conversation_human_handoff",
    runtimeNames: ["Conversational Menu Human"],
    presetKey: "handoff"
  },
  {
    id: "off-hours",
    title: "Fuera de horario",
    description: "Avisa al cliente cuando estas fuera de horario o con respuesta temporal.",
    icon: "followup" as const,
    chips: ["Base guiada", "Horario"],
    presetKey: "off-hours"
  },
  {
    id: "fallback",
    title: "Respuesta cuando no entiende",
    description: "Recupera la conversacion cuando el mensaje sale del flujo esperado.",
    icon: "fallback" as const,
    chips: ["Esencial", "Rescate"],
    templateKey: "conversation_fallback",
    runtimeNames: ["Conversational Menu Fallback"],
    presetKey: "faq"
  },
  {
    id: "pricing",
    title: "Consulta de precios",
    description: "Responde consultas comerciales sobre precios o planes.",
    icon: "bot" as const,
    chips: ["Esencial", "Ventas"],
    templateKey: "conversation_pricing_menu",
    runtimeNames: ["Conversational Menu Pricing"],
    presetKey: "faq"
  },
  {
    id: "catalog",
    title: "Catalogo inteligente",
    description: "Muestra productos cuando el cliente pregunta por lo que vendes.",
    icon: "catalog" as const,
    chips: ["Esencial", "Productos"],
    templateKey: "conversation_products_menu",
    runtimeNames: ["Conversational Menu Products"],
    presetKey: "size-guide"
  }
] as const;

type RecommendationBlueprint = {
  id: string;
  title: string;
  description: string;
  icon: AutomationModule["icon"];
  badge: string;
  templateKey?: string;
  presetKey?: string;
  requiredCapabilities?: string[];
};

const RECOMMENDED_BY_BUSINESS: Record<string, RecommendationBlueprint[]> = {
  retail_products: [
    {
      id: "size-guide",
      title: "Consulta de talles",
      description: "Reduce dudas repetidas y ayuda a cerrar ventas mas rapido.",
      icon: "faq",
      badge: "Muy recomendada",
      presetKey: "size-guide",
      requiredCapabilities: ["catalog"]
    },
    {
      id: "outfit",
      title: "Recomendacion de productos",
      description: "Sugiere productos complementarios y mejora el ticket promedio.",
      icon: "catalog",
      badge: "Para vender mas",
      presetKey: "outfit",
      requiredCapabilities: ["catalog"]
    },
    {
      id: "cart-recovery",
      title: "Recuperacion de carrito",
      description: "Te ayuda a retomar conversaciones que quedaron sin cierre.",
      icon: "followup",
      badge: "Muy recomendada",
      presetKey: "followup",
      requiredCapabilities: ["whatsapp"]
    },
    {
      id: "promotions",
      title: "Promociones automaticas",
      description: "Deja listas respuestas para promos, temporadas o acciones puntuales.",
      icon: "payments",
      badge: "Campanas",
      presetKey: "promotions",
      requiredCapabilities: ["whatsapp"]
    }
  ],
  beauty_salon: [
    {
      id: "agenda",
      title: "Agenda de turnos",
      description: "Orienta reservas y consultas de disponibilidad sin friccion.",
      icon: "calendar",
      badge: "Muy recomendada",
      templateKey: "agenda_booking",
      requiredCapabilities: ["agenda", "whatsapp"]
    },
    {
      id: "reminders",
      title: "Recordatorios de asistencia",
      description: "Ayuda a reducir ausencias con mensajes previos al turno.",
      icon: "followup",
      badge: "Para ordenar agenda",
      templateKey: "appointment_reminders",
      requiredCapabilities: ["agenda", "whatsapp"]
    },
    {
      id: "lead-capture",
      title: "Captar prospectos",
      description: "Pide datos y deja encaminada la primera conversacion.",
      icon: "faq",
      badge: "Muy recomendada",
      presetKey: "lead-capture",
      requiredCapabilities: ["whatsapp"]
    }
  ],
  default: [
    {
      id: "faq",
      title: "Preguntas frecuentes",
      description: "Deja preparadas respuestas para horarios, direccion o dudas repetidas.",
      icon: "faq",
      badge: "Muy recomendada",
      presetKey: "faq",
      requiredCapabilities: ["whatsapp"]
    },
    {
      id: "lead-capture",
      title: "Captar prospectos",
      description: "Pide datos clave y ordena el primer contacto comercial.",
      icon: "faq",
      badge: "Para ordenar ventas",
      presetKey: "lead-capture",
      requiredCapabilities: ["whatsapp"]
    },
    {
      id: "followup",
      title: "Seguimiento comercial",
      description: "Te deja una base lista para retomar conversaciones importantes.",
      icon: "followup",
      badge: "Muy recomendada",
      presetKey: "followup",
      requiredCapabilities: ["whatsapp"]
    },
    {
      id: "agenda",
      title: "Agenda / turnos",
      description: "Ideal si trabajas con reuniones, reservas o visitas agendadas.",
      icon: "calendar",
      badge: "Si usas agenda",
      templateKey: "agenda_booking",
      requiredCapabilities: ["agenda", "whatsapp"]
    }
  ]
};

const PERSONALIZED_PRESETS = [
  {
    id: "vacations",
    title: "Vacaciones o cierre temporal",
    description: "Para avisar una pausa puntual sin depender de soporte.",
    icon: "followup" as const,
    badge: "Lista para usar",
    presetKey: "vacations"
  },
  {
    id: "promotions",
    title: "Promo temporal",
    description: "Ideal para descuentos, fechas especiales o una accion de ventas.",
    icon: "payments" as const,
    badge: "Campana puntual",
    presetKey: "promotions"
  },
  {
    id: "event",
    title: "Evento especial",
    description: "Para lanzamientos, eventos, ferias o mensajes extraordinarios.",
    icon: "bot" as const,
    badge: "Personalizable",
    presetKey: "outfit"
  },
  {
    id: "custom",
    title: "Crear automatizacion personalizada",
    description: "Para casos especiales que no entran en una base comun.",
    icon: "bot" as const,
    badge: "Avanzada",
    presetKey: "custom"
  }
] as const;

function summarizeTrigger(automation: PortalAutomation) {
  if (automation.trigger.type === "keyword") {
    return automation.trigger.keyword ? `Se activa cuando detecta "${automation.trigger.keyword}"` : "Se activa con una palabra clave";
  }
  if (automation.trigger.type === "off_hours") return "Se activa fuera del horario operativo";
  if (automation.trigger.type === "new_contact") return "Se activa cuando escriben por primera vez";
  return "Se activa cuando entra un mensaje";
}

function summarizeActions(automation: PortalAutomation) {
  return automation.actions
    .map((action) => {
      if (action.type === "send_message") {
        const preview = String(action.message || "").trim();
        return preview ? preview : "Envia un mensaje";
      }
      if (action.type === "assign_human") return "Deriva con una persona";
      if (action.type === "tag_contact") {
        const tag = String(action.tag || "").trim();
        return tag ? `Etiqueta ${tag}` : "Etiqueta al contacto";
      }
      return action.type;
    })
    .join(" · ");
}

function iconFromTemplate(template: PortalAutomationCatalogItem): AutomationModule["icon"] {
  const raw = `${template.key} ${template.name} ${template.description || ""}`.toLowerCase();
  if (raw.includes("catalog") || raw.includes("product")) return "catalog";
  if (raw.includes("agenda") || raw.includes("turno") || raw.includes("reserva")) return "calendar";
  if (raw.includes("payment") || raw.includes("invoice") || raw.includes("cobro")) return "payments";
  if (raw.includes("human") || raw.includes("handoff") || raw.includes("deriv")) return "handoff";
  if (raw.includes("welcome") || raw.includes("bienvenida")) return "welcome";
  if (raw.includes("fallback")) return "fallback";
  return "bot";
}

function commercialCopyForAutomation(automation: PortalAutomation) {
  const raw = `${automation.name} ${automation.trigger.type} ${automation.actions.map((action) => action.type).join(" ")}`.toLowerCase();
  if (raw.includes("welcome")) return { name: "Bienvenida automatica", icon: "welcome" as const };
  if (raw.includes("human")) return { name: "Derivacion a humano", icon: "handoff" as const };
  if (raw.includes("pricing")) return { name: "Consulta de precios", icon: "bot" as const };
  if (raw.includes("product")) return { name: "Catalogo inteligente", icon: "catalog" as const };
  if (raw.includes("fallback")) return { name: "Respuesta cuando no entiende", icon: "fallback" as const };
  if (raw.includes("payment") || raw.includes("cobro")) return { name: "Cobros y comprobantes", icon: "payments" as const };
  return { name: automation.name, icon: "bot" as const };
}

type EssentialModuleResult = {
  module: AutomationModule;
  primaryAutomationId: string | null;
};

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

  const businessTypeLabel = useMemo(() => {
    const current = BUSINESS_TYPE_OPTIONS.find((item) => item.value === profile?.businessType);
    return current?.label || "tu negocio";
  }, [profile?.businessType]);

  const enabledCapabilities = useMemo(() => {
    return new Set((profile?.capabilities || []).map((item) => String(item || "").trim().toLowerCase()));
  }, [profile?.capabilities]);

  const catalogByKey = useMemo(() => new Map(catalogItems.map((item) => [item.key, item])), [catalogItems]);

  const duplicateCountsByName = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, automation) => {
      const key = String(automation.name || "").trim();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [items]);

  const essentialModules = useMemo<EssentialModuleResult[]>(() => {
    const consumedIds = new Set<string>();
    const results: EssentialModuleResult[] = [];

    for (const blueprint of ESSENTIAL_BLUEPRINTS) {
      const matches = items
        .filter((automation) => blueprint.runtimeNames?.includes(automation.name as never))
        .sort((a, b) => Number(b.enabled) - Number(a.enabled) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const primary = matches[0] || null;
      if (primary) {
        consumedIds.add(primary.id);
      }

      if (primary) {
        const isProtected = PROTECTED_RUNTIME_AUTOMATION_NAMES.has(primary.name);
        results.push({
          primaryAutomationId: primary.id,
          module: {
            id: primary.id,
            rawName: primary.name,
            name: blueprint.title,
            description: blueprint.description,
            state: primary.enabled ? "activa" : "inactiva",
            enabled: primary.enabled,
            summary: summarizeActions(primary) || "Sin mensaje principal todavia.",
            trigger: summarizeTrigger(primary),
            action: summarizeActions(primary) || "Sin mensaje principal todavia.",
            icon: blueprint.icon,
            chips: [...blueprint.chips],
            actionHref: blueprint.presetKey ? `/app/automations/new?template=${encodeURIComponent(blueprint.presetKey)}` : "/app/automations/new",
            actionLabel: "Ver base",
            actionVariant: "secondary",
            canDelete: !isProtected || (duplicateCountsByName[primary.name] || 0) > 1,
            showToggle: true
          }
        });
        continue;
      }

      if (blueprint.templateKey) {
        const template = catalogByKey.get(blueprint.templateKey) || null;
        if (template) {
          const state = !template.compatible ? "requiere datos" : template.effectiveEnabled ? "ya configurada" : "disponible";
          results.push({
            primaryAutomationId: null,
            module: {
              id: blueprint.id,
              name: blueprint.title,
              description: blueprint.description,
              state,
              summary:
                state === "requiere datos"
                  ? `Para activarla necesitas ${template.missingCapabilities.join(", ")}.`
                  : state === "ya configurada"
                    ? "La base esta lista, pero todavia no se materializo como una automatizacion visible."
                    : "Viene lista para activarse sin empezar desde cero.",
              trigger: state === "requiere datos" ? "Primero completa los datos faltantes" : "Lista para usar",
              action: blueprint.description,
              icon: blueprint.icon,
              chips: state === "requiere datos" ? ["Requiere datos", "Esencial"] : [...blueprint.chips],
              actionHref: state === "requiere datos" ? "#advanced-config" : "/app/automations",
              actionLabel: state === "requiere datos" ? "Ver requisitos" : state === "ya configurada" ? "Entender base" : "Activar base",
              actionVariant: state === "ya configurada" ? "secondary" : "primary",
              onAction: state === "disponible" ? () => void handleToggleTemplate(template) : null,
              showToggle: false
            }
          });
          continue;
        }
      }

      results.push({
        primaryAutomationId: null,
        module: {
          id: blueprint.id,
          name: blueprint.title,
          description: blueprint.description,
          state: "disponible",
          summary:
            blueprint.id === "off-hours"
              ? "Todavia se configura como una base guiada desde el builder."
              : "Tienes la base lista para crearla guiado paso a paso.",
          trigger: "Base guiada",
          action: blueprint.description,
          icon: blueprint.icon,
          chips: [...blueprint.chips],
          actionHref: blueprint.presetKey ? `/app/automations/new?template=${encodeURIComponent(blueprint.presetKey)}` : "/app/automations/new",
          actionLabel: "Usar base",
          actionVariant: "primary",
          showToggle: false
        }
      });
    }

    return results;
  }, [catalogByKey, duplicateCountsByName, items]);

  const primaryEssentialIds = useMemo(
    () => new Set(essentialModules.map((item) => item.primaryAutomationId).filter(Boolean) as string[]),
    [essentialModules]
  );

  const extraAutomationModules = useMemo<AutomationModule[]>(() => {
    return items
      .filter((automation) => !primaryEssentialIds.has(automation.id))
      .map((automation) => {
        const copy = commercialCopyForAutomation(automation);
        const duplicateCount = duplicateCountsByName[automation.name] || 0;
        const isProtected = PROTECTED_RUNTIME_AUTOMATION_NAMES.has(automation.name);
        return {
          id: automation.id,
          rawName: automation.name,
          name: duplicateCount > 1 ? `${copy.name} (copia extra)` : copy.name,
          description:
            duplicateCount > 1
              ? "Es una copia adicional de una base del asistente. Puedes borrarla si no la necesitas."
              : automation.description || "Automatizacion creada o ajustada para un caso particular del negocio.",
          state: automation.enabled ? "activa" : "inactiva",
          enabled: automation.enabled,
          summary: summarizeActions(automation) || "Sin mensaje principal todavia.",
          trigger: summarizeTrigger(automation),
          action: summarizeActions(automation) || "Sin mensaje principal todavia.",
          icon: copy.icon,
          chips: duplicateCount > 1 ? ["Duplicada", isProtected ? "Base esencial" : "Editable"] : [isProtected ? "Base extra" : "Personalizada", "Editable"],
          actionHref: `/app/automations/new?template=${encodeURIComponent(copy.name.toLowerCase().includes("bienvenida") ? "welcome" : "custom")}`,
          actionLabel: "Ajustar con guia",
          actionVariant: "secondary",
          canDelete: !isProtected || duplicateCount > 1,
          showToggle: true
        };
      });
  }, [duplicateCountsByName, items, primaryEssentialIds]);

  const recommendedModules = useMemo<AutomationModule[]>(() => {
    const source =
      profile?.businessType === "retail_products"
        ? RECOMMENDED_BY_BUSINESS.retail_products
        : profile?.businessType === "beauty_salon"
          ? RECOMMENDED_BY_BUSINESS.beauty_salon
          : RECOMMENDED_BY_BUSINESS.default;

    return source.map((item) => {
      const template = item.templateKey ? catalogByKey.get(item.templateKey) || null : null;
      const missingRequiredCapabilities = (item.requiredCapabilities || []).filter((capability) => !enabledCapabilities.has(capability));
      const alreadyVisible =
        ESSENTIAL_BLUEPRINTS.some((essential) => essential.title === item.title) ||
        extraAutomationModules.some((module) => module.name.startsWith(item.title));

      if (template) {
        const state = !template.compatible
          ? "requiere datos"
          : template.effectiveEnabled
            ? "ya configurada"
            : "disponible";

        return {
          id: item.id,
          name: item.title,
          description: item.description,
          state,
          summary:
            state === "requiere datos"
              ? `Para activarla necesitas ${template.missingCapabilities.join(", ")}.`
              : state === "ya configurada"
                ? "Ya esta lista dentro de tu espacio."
                : "La puedes activar con un click sin empezar desde cero.",
          trigger: state === "requiere datos" ? "Completa primero los requisitos" : "Lista para sumar al asistente",
          action: item.description,
          icon: item.icon,
          chips: [item.badge, businessTypeLabel],
          actionHref: state === "requiere datos" ? "#advanced-config" : "/app/automations",
          actionLabel: state === "requiere datos" ? "Ver requisitos" : state === "ya configurada" ? "Ya configurada" : "Activar automatizacion",
          actionVariant: state === "ya configurada" ? "secondary" : "primary",
          onAction: state === "disponible" ? () => void handleToggleTemplate(template) : null,
          showToggle: false
        };
      }

      if (alreadyVisible) {
        return {
          id: item.id,
          name: item.title,
          description: item.description,
          state: "ya configurada",
          summary: "Ya tienes una base equivalente visible en tu espacio.",
          trigger: "Ya disponible",
          action: item.description,
          icon: item.icon,
          chips: [item.badge, "Ya configurada"],
          actionHref: "/app/automations",
          actionLabel: "Ya configurada",
          actionVariant: "secondary",
          showToggle: false
        };
      }

      const requiresData = missingRequiredCapabilities.length > 0;
      return {
        id: item.id,
        name: item.title,
        description: item.description,
        state: requiresData ? "requiere datos" : "disponible",
        summary: requiresData
          ? `Para usarla necesitas ${missingRequiredCapabilities.join(", ")}.`
          : "Abre una base guiada y prellenada para activarla mas rapido.",
        trigger: requiresData ? "Necesita datos del negocio" : "Base guiada lista para usar",
        action: item.description,
        icon: item.icon,
        chips: [item.badge, businessTypeLabel],
        actionHref: requiresData ? "#advanced-config" : `/app/automations/new?template=${encodeURIComponent(item.presetKey || item.id)}`,
        actionLabel: requiresData ? "Ver requisitos" : "Activar automatizacion",
        actionVariant: requiresData ? "secondary" : "primary",
        showToggle: false
      };
    });
  }, [businessTypeLabel, catalogByKey, enabledCapabilities, extraAutomationModules, profile?.businessType]);

  const personalizedPresetModules = useMemo<AutomationModule[]>(
    () =>
      PERSONALIZED_PRESETS.map((preset) => ({
        id: preset.id,
        name: preset.title,
        description: preset.description,
        state: "disponible",
        summary: "Abre una guia simple para crear algo especial sin empezar desde una hoja en blanco.",
        trigger: "Caso especial del negocio",
        action: preset.description,
        icon: preset.icon,
        chips: [preset.badge, "Personalizada"],
        actionHref: `/app/automations/new?template=${encodeURIComponent(preset.presetKey)}`,
        actionLabel: "Crear con guia",
        actionVariant: "primary",
        showToggle: false
      })),
    []
  );

  const heroStats = useMemo(() => {
    const activeEssentials = essentialModules.filter((item) => item.module.state === "activa" || item.module.state === "ya configurada").length;
    const activeExtras = extraAutomationModules.filter((item) => item.state === "activa").length;
    return {
      activeEssentials,
      recommendedReady: recommendedModules.filter((item) => item.state === "disponible").length,
      customCount: extraAutomationModules.length,
      totalVisible: activeEssentials + activeExtras
    };
  }, [essentialModules, extraAutomationModules, recommendedModules]);

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
      toast.success("Configuracion avanzada actualizada");
      window.location.reload();
    } catch (error) {
      toast.error("No se pudo guardar la configuracion", error instanceof Error ? error.message : "unknown_error");
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
      toast.success(nextEnabled ? "Base activada" : "Base desactivada");
      window.location.reload();
    } catch (error) {
      toast.error("No se pudo actualizar la base", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setPendingTemplateKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brandBright">
            Centro de automatizaciones
          </div>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">Entiende rapido que ya tienes, que te conviene activar y que puedes personalizar.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted lg:text-base">
            Primero ves las funciones esenciales del asistente. Despues las recomendaciones para vender o atender mejor. Al final, las automatizaciones especiales para tu negocio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary" className="rounded-2xl px-5">
            <Link href="#automation-help">
              <CircleHelp className="mr-2 h-4 w-4" />
              Como funciona
            </Link>
          </Button>
          <Button asChild className="rounded-2xl px-5">
            <Link href="/app/automations/new?template=custom">
              <Plus className="mr-2 h-4 w-4" />
              Crear automatizacion personalizada
            </Link>
          </Button>
        </div>
      </section>

      <Card className="overflow-hidden border-white/8 bg-[linear-gradient(135deg,rgba(192,80,0,0.18),rgba(14,18,28,0.96))] shadow-[0_18px_60px_rgba(176,80,0,0.18)]">
        <CardContent className="grid gap-5 p-6 xl:grid-cols-[minmax(0,1fr)_220px_220px_220px] xl:items-center">
          <div>
            <h3 className="text-[2rem] font-semibold leading-tight text-white">Tu asistente comercial ya puede trabajar sobre una base mucho mas clara.</h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              Las esenciales son el punto de partida. Las recomendadas te ayudan a vender mejor. Las personalizadas resuelven casos especiales.
            </p>
          </div>
          <SummaryMetric label="Esenciales listas" value={String(heroStats.activeEssentials)} helper="Funciones base visibles y controlables" tone="orange" />
          <SummaryMetric label="Recomendadas listas" value={String(heroStats.recommendedReady)} helper="Puedes activarlas rapido si te sirven" tone="green" />
          <SummaryMetric label="Personalizadas" value={String(heroStats.customCount)} helper="Casos especiales creados en tu espacio" tone="orange" />
        </CardContent>
      </Card>

      <SectionIntro
        title="A. Automatizaciones esenciales"
        description="Estas son las funciones basicas del asistente. Deben ser faciles de entender, encender o apagar, sin lenguaje tecnico."
      />
      <AutomationsList
        modules={essentialModules.map((item) => item.module)}
        pendingAutomationId={pendingAutomationId}
        pendingAction={pendingAction}
        onToggleEnabled={handleToggleEnabled}
        onDelete={handleDeleteAutomation}
      />

      <SectionIntro
        title={`B. Recomendadas para ${businessTypeLabel}`}
        description="Estas automatizaciones todavia no son lo principal del asistente, pero pueden ayudarte a vender o atender mejor segun tu negocio."
      />
      <AutomationsList modules={recommendedModules} pendingAutomationId={pendingAutomationId} pendingAction={pendingAction} />

      <SectionIntro
        title="C. Personalizadas"
        description="Estas son para el 10% de casos especiales: vacaciones, promos puntuales, eventos, mensajes temporales o algo muy propio de tu negocio."
      />
      <div className="grid gap-4 xl:grid-cols-4">
        {personalizedPresetModules.map((module) => (
          <PresetCard key={module.id} module={module} />
        ))}
      </div>

      <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-xl font-semibold text-white">Crear algo especial no deberia sentirse tecnico.</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              El builder nuevo te guia paso a paso para responder, derivar, acompañar ventas o dejar un mensaje temporal sin depender de soporte.
            </p>
          </div>
          <Button asChild className="rounded-2xl px-5">
            <Link href="/app/automations/new?template=custom">Abrir builder guiado</Link>
          </Button>
        </CardContent>
      </Card>

      {extraAutomationModules.length ? (
        <>
          <SectionIntro
            title="Extras creadas y copias revisables"
            description="Aqui aparecen automatizaciones personalizadas, ajustes especiales o copias extras que si puedes revisar o borrar cuando corresponde."
          />
          <AutomationsList
            modules={extraAutomationModules}
            pendingAutomationId={pendingAutomationId}
            pendingAction={pendingAction}
            onToggleEnabled={handleToggleEnabled}
            onDelete={handleDeleteAutomation}
          />
        </>
      ) : null}

      {!extraAutomationModules.length ? (
        <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
          <CardContent className="p-5">
            <AutomationsEmptyState />
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card id="recent-activity" className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-2xl font-semibold text-white">Actividad reciente</h3>
                <p className="mt-2 text-sm text-muted">Cuando el bot responda, derive o envie mensajes, lo veras aqui.</p>
              </div>
              <Button asChild variant="secondary" className="rounded-2xl">
                <Link href="/app/automations">
                  <History className="mr-2 h-4 w-4" />
                  Ver historial
                </Link>
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
                <p className="mt-2">Cuando el bot responda, derive o envie mensajes, vas a ver aqui la actividad real del asistente.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="automation-help" className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
          <CardContent className="space-y-4 p-5">
            <div>
              <h3 className="text-2xl font-semibold text-white">Necesitas ayuda?</h3>
              <p className="mt-2 text-sm leading-6 text-muted">La idea es que entiendas que tocar y que dejar quieto sin miedo a romper nada.</p>
            </div>

            {[
              {
                title: "Empieza por esenciales",
                copy: "Si algo ya esta funcionando, lo veras en el primer bloque y puedes encenderlo o apagarlo.",
                href: "/app/automations"
              },
              {
                title: "Activa recomendadas rapido",
                copy: "Si una recomendada sirve para tu negocio, activala con un click o entra con una base guiada.",
                href: "/app/automations"
              },
              {
                title: "Usa el builder solo para casos especiales",
                copy: "Vacaciones, promos puntuales y mensajes unicos viven mejor como personalizadas.",
                href: "/app/automations/new?template=custom"
              }
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
              <p className="text-sm leading-6 text-muted">
                Si una automatizacion dice "Requiere datos", normalmente falta WhatsApp conectado o alguna capacidad del negocio todavia no activada.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card id="advanced-config" className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
        <CardContent className="space-y-4 p-5">
          <div>
            <h3 className="text-xl font-semibold text-white">Configuracion avanzada del asistente</h3>
            <p className="mt-2 text-sm leading-6 text-muted">Esto no deberia ser lo primero que tocas. Solo ayuda a que Opturon recomiende mejor segun tu negocio.</p>
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
                  <p className="text-xs text-muted">Solo hace falta tocar esto si una recomendacion te marca que faltan datos o capacidades.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-lg font-semibold text-white">Bases disponibles en tu espacio</h4>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Aqui ves todas las bases detectadas para tu tenant, incluso las que todavia requieren datos o canal conectado.
                  </p>
                </div>

                {catalogItems.length ? (
                  catalogItems.map((template) => (
                    <div key={template.key} className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-black/12 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{template.name}</p>
                          <Badge variant={template.compatible ? (template.effectiveEnabled ? "success" : "muted") : "warning"}>
                            {template.compatible ? (template.effectiveEnabled ? "Lista" : "Disponible") : "Requiere datos"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {template.compatible
                            ? template.description || "Base disponible para este negocio."
                            : `Necesita ${template.missingCapabilities.join(", ")} para estar lista.`}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={template.tenantEnabled ? "secondary" : "primary"}
                        disabled={pendingTemplateKey === template.key || !template.compatible}
                        onClick={() => void handleToggleTemplate(template)}
                      >
                        {pendingTemplateKey === template.key ? "Guardando..." : template.tenantEnabled ? "Deshabilitar" : "Habilitar"}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-muted">
                    Todavia no hay bases detectadas para este espacio.
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

function SectionIntro({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-2xl font-semibold text-white">{title}</h3>
      <p className="max-w-3xl text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

function PresetCard({ module }: { module: AutomationModule }) {
  return (
    <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
      <CardContent className="space-y-4 p-5">
        <div className={cn("inline-flex h-14 w-14 items-center justify-center rounded-[22px] border", iconTone(module.icon))}>
          <span className="text-lg font-semibold text-white">{module.name.slice(0, 1)}</span>
        </div>
        <div>
          <h4 className="text-xl font-semibold text-white">{module.name}</h4>
          <p className="mt-2 text-sm leading-6 text-muted">{module.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(module.chips || []).slice(0, 2).map((chip) => (
            <span key={chip} className="rounded-xl border border-white/8 bg-black/12 px-3 py-1.5 text-xs text-text">
              {chip}
            </span>
          ))}
        </div>
        <Button asChild className="w-full rounded-2xl">
          <Link href={module.actionHref || "/app/automations/new?template=custom"}>{module.actionLabel || "Crear con guia"}</Link>
        </Button>
      </CardContent>
    </Card>
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

function iconTone(icon: AutomationModule["icon"]) {
  if (icon === "welcome") return "border-emerald-400/35 bg-emerald-500/18 text-emerald-200 shadow-[0_0_0_1px_rgba(52,211,153,0.12),0_16px_30px_rgba(16,185,129,0.16)]";
  if (icon === "catalog") return "border-sky-400/35 bg-sky-500/18 text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_16px_30px_rgba(59,130,246,0.16)]";
  if (icon === "handoff") return "border-violet-400/35 bg-violet-500/18 text-violet-200 shadow-[0_0_0_1px_rgba(167,139,250,0.12),0_16px_30px_rgba(124,58,237,0.16)]";
  if (icon === "followup") return "border-orange-400/35 bg-orange-500/18 text-orange-200 shadow-[0_0_0_1px_rgba(251,146,60,0.12),0_16px_30px_rgba(234,88,12,0.16)]";
  if (icon === "payments") return "border-rose-400/35 bg-rose-500/18 text-rose-200 shadow-[0_0_0_1px_rgba(251,113,133,0.12),0_16px_30px_rgba(225,29,72,0.16)]";
  if (icon === "fallback" || icon === "faq") return "border-amber-400/35 bg-amber-500/18 text-amber-200 shadow-[0_0_0_1px_rgba(251,191,36,0.12),0_16px_30px_rgba(217,119,6,0.16)]";
  if (icon === "calendar") return "border-orange-400/35 bg-orange-500/18 text-orange-200 shadow-[0_0_0_1px_rgba(251,146,60,0.12),0_16px_30px_rgba(234,88,12,0.16)]";
  return "border-brand/35 bg-brand/18 text-brandBright shadow-[0_0_0_1px_rgba(249,115,22,0.12),0_16px_30px_rgba(192,80,0,0.16)]";
}
