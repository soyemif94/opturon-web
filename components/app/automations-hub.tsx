"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, UserRound } from "lucide-react";
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
    return { active, pending, recommended };
  }, [modules]);

  const compatibleCatalog = useMemo(
    () => catalogItems.filter((item) => item.compatible),
    [catalogItems]
  );

  const incompatibleCatalog = useMemo(
    () => catalogItems.filter((item) => !item.compatible),
    [catalogItems]
  );

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
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden border-white/6 bg-[linear-gradient(135deg,rgba(192,80,0,0.18),rgba(24,24,24,0.96))] shadow-[0_18px_60px_rgba(176,80,0,0.16)]">
          <CardHeader action={<Badge variant="warning">Centro de automatizacion</Badge>}>
            <div>
              <CardTitle className="text-2xl">Automatiza respuestas y acciones cuando llegan mensajes de WhatsApp</CardTitle>
              <CardDescription>
                Revisa que automatizaciones ya estan activas, cuales conviene preparar y como ayudarte a responder mas rapido sin sumar complejidad.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <p className="max-w-3xl text-sm leading-7 text-muted">
              Las automatizaciones de Opturon te ayudan a responder fuera de horario, calificar prospectos automaticamente e iniciar flujos de conversacion sin depender de configuraciones tecnicas.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-2xl px-5">
                <Link href="/app/automations/new">Crear primera automatizacion</Link>
              </Button>
              <Button asChild variant="secondary" className="rounded-2xl px-5">
                <Link href="/app/automations/templates">Ver recomendaciones</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">Resumen</Badge>}>
            <div>
              <CardTitle className="text-xl">Estado general</CardTitle>
              <CardDescription>Indicadores simples para entender que ya esta automatizado y que falta activar.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            <StatBlock label="Automatizaciones activas" value={String(stats.active)} />
            <StatBlock label="Pendientes de configuracion" value={String(stats.pending)} />
            <StatBlock label="Recomendadas" value={String(stats.recommended)} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="outline">Perfil del tenant</Badge>}>
            <div>
              <CardTitle className="text-xl">Compatibilidad por rubro</CardTitle>
              <CardDescription>Define el tipo de negocio y las capacidades disponibles para mostrar solo automatizaciones coherentes.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de negocio</label>
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
              <p className="text-sm font-medium">Capacidades disponibles</p>
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
                        if (active) {
                          current.delete(capability.value);
                        } else {
                          current.add(capability.value);
                        }
                        void saveBusinessProfile({ capabilities: Array.from(current) });
                      }}
                    >
                      {capability.label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted">
                WhatsApp y Contactos pueden resolverse automaticamente por el workspace. Agenda, Catalogo y Cobros marcan compatibilidad funcional.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="warning">Catalogo maestro</Badge>}>
            <div>
              <CardTitle className="text-xl">Automatizaciones disponibles</CardTitle>
              <CardDescription>Este listado ordena lo que Opturon ofrece globalmente y separa lo compatible de lo que todavia no aplica a este negocio.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {compatibleCatalog.length > 0 ? (
              <div className="space-y-3">
                {compatibleCatalog.map((template) => (
                  <div key={template.key} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{template.name}</p>
                          <Badge variant={template.effectiveEnabled ? "success" : "muted"}>
                            {template.effectiveEnabled ? "Activa" : "Disponible"}
                          </Badge>
                          <Badge variant="outline">{template.category}</Badge>
                          <Badge variant="muted">{template.managedBy === "hybrid" ? "Conectada al runtime" : "Catalogo estructural"}</Badge>
                        </div>
                        <p className="text-sm leading-6 text-muted">{template.description}</p>
                        <p className="text-xs text-muted">
                          Requiere: {template.requiredCapabilities.length ? template.requiredCapabilities.join(", ") : "sin requisitos extra"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={template.tenantEnabled ? "secondary" : "primary"}
                        disabled={pendingTemplateKey === template.key}
                        onClick={() => void handleToggleTemplate(template)}
                      >
                        {pendingTemplateKey === template.key
                          ? "Guardando..."
                          : template.tenantEnabled
                            ? "Deshabilitar"
                            : "Habilitar"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-4 text-sm text-muted">
                Todavia no hay automatizaciones compatibles con el perfil actual. Ajusta rubro o capacidades para destrabar opciones.
              </div>
            )}

            {incompatibleCatalog.length > 0 ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                <p className="text-sm font-semibold">Fuera de compatibilidad por ahora</p>
                <div className="mt-3 space-y-2">
                  {incompatibleCatalog.map((template) => (
                    <div key={template.key} className="rounded-2xl border border-[color:var(--border)] bg-card/85 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{template.name}</span>
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
        <AutomationsList
          modules={modules}
          pendingAutomationId={pendingAutomationId}
          pendingAction={pendingAction}
          onToggleEnabled={handleToggleEnabled}
          onDelete={handleDelete}
        />
      ) : (
        <AutomationsEmptyState />
      )}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="outline">Como ayuda al negocio</Badge>}>
            <div>
              <CardTitle className="text-xl">Que resuelve este modulo</CardTitle>
              <CardDescription>Explicacion simple para que un negocio entienda rapidamente el valor de automatizar.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 md:grid-cols-2">
            {[
              "Explica que partes del primer contacto ya estan automatizadas.",
              "Muestra que modulos estan activos y cuales faltan configurar.",
              "Ayuda a responder mas rapido sin sumar trabajo manual.",
              "Hace mas clara la propuesta comercial de Opturon para duenos de negocio."
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="warning">Siguiente paso</Badge>}>
            <div>
              <CardTitle className="text-xl">Accion rapida recomendada</CardTitle>
              <CardDescription>Orientacion clara para saber por donde seguir.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[
              { icon: CheckCircle2, text: "Revisar bienvenidas y preguntas frecuentes activas" },
              { icon: Clock3, text: "Definir fuera de horario y recordatorios" },
              { icon: UserRound, text: "Configurar handoff a humano para casos sensibles" }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.text} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <Icon className="h-4 w-4 text-brandBright" />
                    </span>
                    <p className="text-sm leading-6 text-muted">{item.text}</p>
                  </div>
                </div>
              );
            })}
            <Button asChild className="rounded-2xl">
              <Link href="/app/automations">Centro de automatizacion</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
