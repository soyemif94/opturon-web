"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, RefreshCw, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortalWhatsAppCanaryAttempt, PortalWhatsAppCanaryWorkspace } from "@/lib/api";

const COPY: Record<string, string> = {
  whatsapp_canary_load_failed: "No se pudo cargar el espacio de prueba de WhatsApp.",
  whatsapp_canary_sync_failed: "No se pudieron actualizar las plantillas desde Meta.",
  meta_templates_sync_failed: "Meta no respondió correctamente al actualizar las plantillas.",
  meta_templates_response_invalid: "Meta devolvió una respuesta de plantillas inválida.",
  meta_templates_pagination_invalid: "Meta devolvió una paginación de plantillas inválida.",
  meta_templates_pagination_limit_exceeded: "La sincronización alcanzó el límite seguro de páginas de Meta.",
  whatsapp_channel_provider_invalid: "El canal activo no usa WhatsApp Cloud API.",
  whatsapp_template_sync_tenant_mapping_missing: "El workspace no tiene un tenant externo válido para sincronizar.",
  whatsapp_channel_not_found: "No hay un canal de WhatsApp configurado para este workspace.",
  whatsapp_channel_not_connected: "El canal de WhatsApp no está activo.",
  whatsapp_channel_not_ready: "El canal de WhatsApp no tiene todas las credenciales requeridas.",
  whatsapp_template_not_found: "La plantilla ya no existe en este WABA.",
  whatsapp_template_not_sendable: "Meta no permite enviar esta plantilla en su estado actual.",
  whatsapp_template_component_unsupported: "Esta plantilla requiere un componente multimedia que Canary Phase1 no puede completar de forma segura.",
  whatsapp_template_variables_missing: "Completa todas las variables requeridas.",
  whatsapp_canary_recipient_not_authorized: "El destinatario no esta activo o no tiene consentimiento registrado.",
  whatsapp_canary_send_failed: "Meta rechazo el envio. Revisa el detalle tecnico seguro.",
  whatsapp_canary_delivery_unknown: "El resultado es ambiguo. No se reenvia automaticamente para evitar duplicados."
};

function previewParts(template: PortalWhatsAppCanaryWorkspace["templates"][number] | undefined, values: Record<string, string>) {
  const definition = template?.definition || {};
  type Component = { type?: string; text?: string; buttons?: Array<{ text?: string; url?: string }> };
  const provider = definition.provider as { components?: Component[] } | undefined;
  const blueprint = definition.blueprint as { components?: Component[] } | undefined;
  const components = provider?.components || (definition.components as Component[] | undefined) || blueprint?.components || [];
  return components.map((component, index) => {
    if (String(component.type || "").toLowerCase() === "buttons") {
      const text = (component.buttons || []).map((button, buttonIndex) => {
        let url = String(button.url || "");
        template?.variables.filter((item) => item.componentIndex === index && item.buttonIndex === buttonIndex).forEach((item) => {
          url = url.replaceAll(`{{${item.position}}}`, values[item.key] || `{{${item.position}}}`);
        });
        return [button.text, url].filter(Boolean).join(" · ");
      }).filter(Boolean).join("\n");
      return { type: "button", text };
    }
    let text = String(component.text || "");
    template?.variables.filter((item) => item.componentIndex === index).forEach((item) => {
      text = text.replaceAll(`{{${item.position}}}`, values[item.key] || `{{${item.position}}}`);
    });
    return { type: String(component.type || "body"), text };
  }).filter((item) => item.text);
}

export function WhatsAppTemplateCanary() {
  const [workspace, setWorkspace] = useState<PortalWhatsAppCanaryWorkspace | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState<PortalWhatsAppCanaryAttempt | null>(null);
  const [key, setKey] = useState(() => `wa-canary-${crypto.randomUUID()}`);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const template = workspace?.templates.find((item) => item.id === templateId);
  const recipient = workspace?.recipients.find((item) => item.id === recipientId);
  const ready = Boolean(template?.canSend && recipient && template.variables.every((item) => values[item.key]?.trim()));

  async function load() {
    const response = await fetch("/api/app/integrations/whatsapp/templates/canary", { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.data) throw new Error(String(json?.error || "whatsapp_canary_load_failed"));
    setWorkspace(json.data);
    setError(null);
    if (attempt) setAttempt(json.data.attempts.find((item: PortalWhatsAppCanaryAttempt) => item.id === attempt.id) || attempt);
  }

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    setRefreshMessage(null);
    try {
      const response = await fetch("/api/app/integrations/whatsapp/templates/canary/refresh", { method: "POST" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.data) throw new Error(String(json?.error || "whatsapp_canary_sync_failed"));
      setWorkspace(json.data);
      const count = Number(json.data.sync?.syncedCount || 0);
      setRefreshMessage(count > 0 ? `${count} plantilla${count === 1 ? "" : "s"} actualizada${count === 1 ? "" : "s"} desde Meta.` : "Meta no devolvió plantillas para este WABA.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "whatsapp_canary_sync_failed");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { void load().catch((cause) => setError(cause.message)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!attempt || !["sent", "delivered"].includes(attempt.status)) return;
    const timer = window.setInterval(() => void load().catch(() => undefined), 5000);
    return () => window.clearInterval(timer);
  });

  function newAttempt() { setKey(`wa-canary-${crypto.randomUUID()}`); setAttempt(null); setError(null); }
  async function send() {
    if (!ready || busy) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/app/integrations/whatsapp/templates/canary", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, recipientId, variables: values, idempotencyKey: key }) });
      const json = await response.json().catch(() => null);
      if (!response.ok) { if (json?.attempt) setAttempt(json.attempt); throw new Error(String(json?.error || "whatsapp_canary_send_failed")); }
      setAttempt(json.data.attempt);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "whatsapp_canary_send_failed"); }
    finally { setBusy(false); }
  }

  const preview = useMemo(() => previewParts(template, values), [template, values]);
  return <section id="whatsapp-templates-canary" className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Templates / Canary</h2><p className="text-sm text-muted">Envio real e inmediato, solo a destinatarios internos consentidos.</p></div><Button variant="secondary" disabled={refreshing} onClick={() => void refresh()}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />{refreshing ? "Actualizando…" : "Actualizar desde Meta"}</Button></div>
    {refreshMessage ? <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-100">{refreshMessage}</p> : null}
    {workspace ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="WABA" value={workspace.channel.wabaId} /><Metric label="Numero conectado" value={workspace.channel.displayPhoneNumber || workspace.channel.phoneNumberId} /><Metric label="Display name" value={workspace.channel.verifiedName || "No informado"} /><Metric label="Conexion" value={workspace.channel.status || "Sin estado"} /></div> : null}
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.72fr)]">
      <Card><CardHeader><div><CardTitle>Preparar prueba</CardTitle><CardDescription>Solo templates APPROVED habilitan el envio.</CardDescription></div></CardHeader><CardContent className="grid gap-4 pt-0">
        <Field label="Plantilla e idioma"><select className="wa-canary-control wa-canary-select" data-canary-control="template" value={templateId} onChange={(event) => { setTemplateId(event.target.value); setValues({}); newAttempt(); }}><option value="">Seleccionar plantilla</option>{workspace?.templates.map((item) => <option key={item.id} value={item.id}>{item.metaTemplateName} · {item.language} · {item.status.toUpperCase()}</option>)}</select></Field>
        {workspace && workspace.templates.length === 0 ? <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">No hay plantillas de Meta disponibles para este WABA. Usá “Actualizar desde Meta”.</p> : null}
        {workspace && workspace.templates.length > 0 && !workspace.templates.some((item) => item.canSend) ? <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">No hay plantillas APPROVED compatibles con Canary.</p> : null}
        {template ? <div className="flex gap-2"><Badge variant={template.canSend ? "success" : "warning"}>{template.status.toUpperCase()}</Badge><Badge variant="outline">{template.category}</Badge></div> : null}
        {template?.unsupportedReason ? <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">Template aprobado, pero no enviable en Canary: requiere header multimedia o un boton dinamico no soportado.</p> : null}
        <Field label="Destinatario autorizado"><select className="wa-canary-control wa-canary-select" data-canary-control="recipient" value={recipientId} onChange={(event) => { setRecipientId(event.target.value); newAttempt(); }}><option value="">Seleccionar destinatario</option>{workspace?.recipients.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.phoneMasked}</option>)}</select></Field>
        {template?.variables.map((item) => <Field key={item.key} label={item.label}><input className="wa-canary-control" data-canary-control="variable" value={values[item.key] || ""} onChange={(event) => { setValues((current) => ({ ...current, [item.key]: event.target.value })); newAttempt(); }} placeholder={`Valor para ${item.label}`} /></Field>)}
        {workspace && workspace.recipients.length === 0 ? <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">No hay destinatarios internos activos con consentimiento granted.</p> : null}
        {error ? <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-100">{COPY[error] || "No fue posible completar la operacion."}{attempt?.errorDetail ? ` Detalle: ${attempt.errorDetail}` : ""}</p> : null}
        <Button disabled={!ready || busy} onClick={() => void send()}><Send className="mr-2 h-4 w-4" />{busy ? "Enviando…" : "Enviar prueba ahora"}</Button>
      </CardContent></Card>
      <div className="space-y-4"><Card><CardHeader><div><CardTitle>Preview</CardTitle><CardDescription>Confirmacion operativa, no simulacion de entrega.</CardDescription></div></CardHeader><CardContent className="space-y-3 pt-0"><p className="text-xs text-muted">Desde {workspace?.channel.displayPhoneNumber || workspace?.channel.phoneNumberId || "-"} · Para {recipient?.phoneMasked || "-"}</p><div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/8 p-4 text-sm leading-6">{preview.length ? preview.map((item, index) => <p key={`${item.type}-${index}`}><span className="mr-2 text-[10px] uppercase text-muted">{item.type}</span>{item.text}</p>) : "Selecciona una plantilla para previsualizar."}</div></CardContent></Card>
      {attempt ? <AttemptCard attempt={attempt} onRetry={newAttempt} /> : null}</div>
    </div>
    {workspace?.attempts.length ? <Card><CardHeader><div><CardTitle>Actividad reciente</CardTitle><CardDescription>Ultimos intentos de este workspace.</CardDescription></div></CardHeader><CardContent className="grid gap-2 pt-0">{workspace.attempts.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 px-3 py-2 text-xs"><span>{item.templateName} · {item.recipientName || item.recipientMasked}</span><Badge variant={item.status === "failed" ? "danger" : item.status === "read" ? "success" : "muted"}>{item.status}</Badge></div>)}</CardContent></Card> : null}
  </section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm"><span className="text-muted">{label}</span>{children}</label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-2xl border border-white/8 bg-card/80 p-4"><p className="text-[10px] uppercase tracking-wider text-muted">{label}</p><p className="mt-1 truncate text-sm font-medium" title={value}>{value}</p></div>; }
function AttemptCard({ attempt, onRetry }: { attempt: PortalWhatsAppCanaryAttempt; onRetry: () => void }) {
  const success = ["sent", "delivered", "read"].includes(attempt.status);
  return <Card><CardHeader><div><CardTitle className="flex items-center gap-2">{success ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <CircleAlert className="h-5 w-5 text-amber-300" />}Resultado real</CardTitle><CardDescription>Sin estados simulados.</CardDescription></div></CardHeader><CardContent className="space-y-3 pt-0 text-sm"><div className="flex flex-wrap gap-2">{["sent", "delivered", "read"].map((status) => <Badge key={status} variant={attempt.status === status || (status === "sent" && success) ? "success" : "muted"}>{status}</Badge>)}</div><p className="break-all text-xs text-muted">wamid: {attempt.providerMessageId || "Meta no devolvio ID"}</p>{attempt.errorCode ? <p className="text-red-200">{attempt.errorCode}{attempt.errorDetail ? ` · ${attempt.errorDetail}` : ""}</p> : null}{attempt.conversationId ? <Button asChild variant="secondary" className="w-full"><a href={`/app/inbox?conversation=${attempt.conversationId}`}>Abrir conversacion en Inbox</a></Button> : null}{["failed", "unknown_delivery"].includes(attempt.status) ? <Button variant="secondary" className="w-full" onClick={onRetry}>Preparar nuevo intento</Button> : null}</CardContent></Card>;
}
