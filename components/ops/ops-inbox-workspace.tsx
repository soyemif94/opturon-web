"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowRightLeft,
  Bot,
  Building2,
  Clock3,
  Flag,
  PauseCircle,
  Search,
  ShieldAlert,
  Sparkles,
  UserRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/ui/cn";

type OpsInboxItem = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantStatus: string;
  contactName: string;
  contactPhone?: string;
  status: "nueva" | "activa" | "esperando respuesta" | "resuelta" | "urgente";
  attention: "bot" | "humano" | "derivada";
  unreadCount: number;
  priority: "normal" | "hot";
  slaMinutes: number;
  lastMessageAt: string;
  lastMessagePreview: string;
  channelStatus: "ok" | "warning" | "error";
  assignedTo?: string;
  leadStage: string;
  tags: string[];
  alerts: string[];
  notes: Array<{ id: string; text: string; createdAt: string }>;
  messages: Array<{ id: string; direction: "inbound" | "outbound" | "system"; text: string; timestamp: string }>;
};

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "urgent", label: "Urgentes" },
  { key: "unassigned", label: "Sin asignar" },
  { key: "sla", label: "SLA en riesgo" },
  { key: "incidents", label: "Incidencias" }
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export function OpsInboxWorkspace({ items }: { items: OpsInboxItem[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(items[0]?.id);
  const [localItems, setLocalItems] = useState(items);

  const visibleItems = useMemo(() => {
    const term = search.toLowerCase().trim();
    return localItems.filter((item) => {
      const matchesSearch =
        !term ||
        `${item.contactName} ${item.contactPhone || ""} ${item.tenantName} ${item.lastMessagePreview}`.toLowerCase().includes(term);

      if (!matchesSearch) return false;
      if (filter === "urgent") return item.status === "urgente" || item.priority === "hot";
      if (filter === "unassigned") return !item.assignedTo;
      if (filter === "sla") return item.slaMinutes > 45;
      if (filter === "incidents") return item.alerts.length > 0 || item.channelStatus === "error";
      return true;
    });
  }, [filter, localItems, search]);

  const selected = visibleItems.find((item) => item.id === selectedId) || visibleItems[0] || localItems[0];

  function updateSelected(patch: Partial<OpsInboxItem>) {
    if (!selected) return;
    setLocalItems((prev) => prev.map((item) => (item.id === selected.id ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(192,80,0,0.12),rgba(18,18,18,0.96)_42%,rgba(14,14,14,0.98))] p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge variant="warning">Supervisor inbox</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Centro de control de conversaciones multi-cliente</h1>
            <p className="mt-3 text-sm leading-7 text-muted lg:text-base">
              Vista global para supervisar conversaciones, detectar incidencias, intervenir el bot y entender el estado operativo de cada tenant.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <OpsStat label="Conversaciones abiertas" value={String(localItems.length)} />
            <OpsStat label="Sin asignar" value={String(localItems.filter((item) => !item.assignedTo).length)} />
            <OpsStat label="Incidencias" value={String(localItems.filter((item) => item.alerts.length > 0 || item.channelStatus === "error").length)} />
          </div>
        </div>
      </section>

      <div className="grid h-[calc(100vh-220px)] min-h-[760px] gap-4 xl:grid-cols-[380px_minmax(0,1fr)_360px]">
        <aside className="min-h-0">
          <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] shadow-[0_20px_60px_rgba(0,0,0,0.20)]">
            <div className="border-b border-[color:var(--border)] bg-surface/85 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Ops inbox</p>
                  <h2 className="mt-1 text-lg font-semibold">Cola global</h2>
                </div>
                <Badge variant="muted">Multi-tenant</Badge>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-bg/70 px-3 py-2.5">
                <Search className="h-4 w-4 text-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por contacto, empresa o mensaje"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                  <button key={item.key} type="button" onClick={() => setFilter(item.key)}>
                    <Badge variant={filter === item.key ? "warning" : "outline"}>{item.label}</Badge>
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "w-full rounded-[24px] border p-4 text-left transition-all duration-200",
                    selected?.id === item.id
                      ? "border-brand/40 bg-brand/10 shadow-[0_0_0_1px_rgba(192,80,0,0.12)]"
                      : "border-[color:var(--border)] bg-card/70 hover:border-white/12 hover:bg-surface/65"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.contactName}</p>
                      <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
                        <Building2 className="h-3.5 w-3.5" />
                        {item.tenantName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">{relativeLabel(item.lastMessageAt)}</span>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{item.lastMessagePreview}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {item.attention}
                    </Badge>
                    {item.unreadCount > 0 ? <Badge variant="warning">{item.unreadCount} no leidos</Badge> : null}
                    {item.priority === "hot" ? <Badge variant="danger">urgente</Badge> : null}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className={cn("font-medium", item.slaMinutes > 45 ? "text-amber-300" : "text-emerald-300")}>SLA {item.slaMinutes}m</span>
                    <span className="text-muted">{item.assignedTo || "sin asignar"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="min-h-0">
          <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] shadow-[0_20px_60px_rgba(0,0,0,0.20)]">
            {selected ? (
              <>
                <header className="border-b border-[color:var(--border)] bg-surface/92 p-4 backdrop-blur">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-xl font-semibold">{selected.contactName}</h2>
                        <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {selected.tenantName} · {selected.contactPhone || "Sin telefono"} · responsable {selected.assignedTo || "sin asignar"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {selected.attention}
                      </Badge>
                      <Badge variant={selected.channelStatus === "error" ? "danger" : selected.channelStatus === "warning" ? "warning" : "success"}>
                        canal {selected.channelStatus}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <ActionButton icon={UserRound} label="Tomar conversacion" onClick={() => updateSelected({ assignedTo: "Ops supervisor", attention: "humano" })} />
                    <ActionButton icon={ArrowRightLeft} label="Reasignar" onClick={() => updateSelected({ assignedTo: "Equipo soporte" })} />
                    <ActionButton icon={PauseCircle} label={selected.attention === "bot" ? "Pausar bot" : "Reactivar bot"} onClick={() => updateSelected({ attention: selected.attention === "bot" ? "derivada" : "bot" })} />
                    <ActionButton
                      icon={ShieldAlert}
                      label="Marcar incidencia"
                      onClick={() =>
                        updateSelected({
                          alerts: selected.alerts.length > 0 ? selected.alerts : [...selected.alerts, "Incidencia operativa en seguimiento"],
                          channelStatus: selected.channelStatus === "error" ? "warning" : "error"
                        })
                      }
                    />
                    <ActionButton icon={Archive} label="Archivar" onClick={() => updateSelected({ status: "resuelta" })} />
                  </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(176,80,0,0.07),transparent_24%)] p-4">
                  <div className="space-y-3">
                    <div className="rounded-[24px] border border-[color:var(--border)] bg-card/60 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Sparkles className="h-3.5 w-3.5 text-brandBright" />
                        Vista supervisor con contexto multi-cliente, SLA y canal para intervenir rapido.
                      </div>
                    </div>

                    {selected.messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.direction === "outbound" ? "justify-end" : message.direction === "system" ? "justify-center" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[76%] rounded-[24px] px-4 py-3 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.12)]",
                            message.direction === "outbound" && "bg-[linear-gradient(135deg,rgba(192,80,0,0.24),rgba(176,80,0,0.14))] text-text",
                            message.direction === "inbound" && "border border-[color:var(--border)] bg-card/90 text-text",
                            message.direction === "system" && "border border-emerald-500/18 bg-emerald-500/10 text-emerald-100"
                          )}
                        >
                          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
                            {message.direction === "outbound" ? <UserRound className="h-3.5 w-3.5" /> : message.direction === "system" ? <Sparkles className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                            <span>{message.direction === "outbound" ? "Supervisor" : message.direction === "system" ? "Operacion" : "Contacto"}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-6">{message.text}</p>
                          <p className="mt-2 text-[11px] text-muted">{new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </main>

        <aside className="min-h-0">
          {selected ? (
            <div className="h-full space-y-4 overflow-y-auto pr-1">
              <Card className="border-white/6 bg-card/90">
                <CardHeader action={<Badge variant="muted">Tenant owner</Badge>}>
                  <div>
                    <CardTitle className="text-xl">Ficha operativa</CardTitle>
                    <CardDescription>Contacto, tenant y estado general del canal.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/60 p-4">
                    <p className="text-base font-semibold">{selected.contactName}</p>
                    <p className="mt-1 text-sm text-muted">{selected.contactPhone || "Sin telefono"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selected.tags.map((tag) => (
                        <Badge key={tag} variant="muted" className="capitalize">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <InfoRow label="Cliente / tenant" value={selected.tenantName} />
                    <InfoRow label="Estado del canal" value={selected.channelStatus} />
                    <InfoRow label="Responsable" value={selected.assignedTo || "Sin asignar"} />
                    <InfoRow label="Lead stage" value={selected.leadStage} />
                    <InfoRow label="Ultima actividad" value={new Date(selected.lastMessageAt).toLocaleString()} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/6 bg-card/90">
                <CardHeader action={<Badge variant={selected.alerts.length > 0 ? "danger" : "success"}>{selected.alerts.length > 0 ? "Atencion" : "Estable"}</Badge>}>
                  <div>
                    <CardTitle className="text-xl">Alertas</CardTitle>
                    <CardDescription>Senales operativas que requieren supervision.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {selected.alerts.length > 0 ? (
                    selected.alerts.map((alert, index) => (
                      <div key={`${selected.id}-alert-${index}`} className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span className="leading-6">{alert}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">Sin alertas operativas activas.</div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/6 bg-card/90">
                <CardHeader action={<Badge variant="outline">Resumen</Badge>}>
                  <div>
                    <CardTitle className="text-xl">Resumen operativo</CardTitle>
                    <CardDescription>Contexto rapido para intervenir sin perder tiempo.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
                    Conversacion {selected.status} con {selected.attention === "bot" ? "automatizacion activa" : "intervencion humana"} sobre la cuenta {selected.tenantName}.
                  </div>
                  <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                    <p className="text-sm font-medium">Notas supervisor</p>
                    <ul className="mt-3 space-y-2 text-sm text-muted">
                      {selected.notes.map((note) => (
                        <li key={note.id} className="rounded-xl border border-[color:var(--border)] bg-bg/70 px-3 py-2">
                          <p>{note.text}</p>
                          <p className="mt-1 text-xs text-muted">{new Date(note.createdAt).toLocaleString()}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function OpsStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-card/70 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted hover:text-text"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-bg/70 px-3 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

function statusVariant(status: OpsInboxItem["status"]): "warning" | "success" | "danger" | "muted" {
  if (status === "urgente") return "danger";
  if (status === "nueva" || status === "esperando respuesta") return "warning";
  if (status === "activa") return "success";
  return "muted";
}

function relativeLabel(dateString: string) {
  const value = new Date(dateString).getTime();
  if (Number.isNaN(value)) return "sin fecha";
  const diffMs = Date.now() - value;
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}
