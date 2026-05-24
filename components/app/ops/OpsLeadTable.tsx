"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ConversationRowData, LeadStatus } from "@/components/app/inbox/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type OpsSellerOption = {
  id: string;
  name: string;
  role: string | null;
};

const URGENT_RESPONSE_MINUTES = 30;
const COLD_LEAD_HOURS = 72;

function leadTone(status: LeadStatus) {
  if (status === "IN_CONVERSATION") return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  if (status === "FOLLOW_UP") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (status === "CLOSED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  return "border-white/10 bg-white/5 text-muted";
}

function leadLabel(status: LeadStatus) {
  if (status === "IN_CONVERSATION") return "En conversacion";
  if (status === "FOLLOW_UP") return "Seguimiento";
  if (status === "CLOSED") return "Cerrado";
  return "Nuevo";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function isUrgentLead(row: ConversationRowData) {
  return row.leadStatus !== "CLOSED" && row.unreadCount > 0 && row.slaMinutes >= URGENT_RESPONSE_MINUTES;
}

function isColdLead(row: ConversationRowData, now = new Date()) {
  if (row.leadStatus === "CLOSED") return false;
  if (row.unreadCount > 0 || row.nextActionAt) return false;
  const lastMessageAt = new Date(row.lastMessageAt);
  if (Number.isNaN(lastMessageAt.getTime())) return false;
  return now.getTime() - lastMessageAt.getTime() >= COLD_LEAD_HOURS * 60 * 60 * 1000;
}

function slaTone(type: "urgent" | "cold") {
  if (type === "urgent") return "border-red-500/30 bg-red-500/10 text-red-100";
  return "border-[#8f633d]/35 bg-[#8f633d]/12 text-[#f3dfc8]";
}

function sectionTone(variant?: "default" | "unassigned" | "cold") {
  if (variant === "unassigned") {
    return "border-[#c27a2c]/20 bg-[linear-gradient(180deg,rgba(192,80,0,0.10),rgba(255,255,255,0.02))]";
  }
  if (variant === "cold") {
    return "border-[#8f633d]/18 bg-[linear-gradient(180deg,rgba(143,99,61,0.10),rgba(255,255,255,0.02))]";
  }
  return "border-white/6 bg-card/90";
}

function rowTone(options: { unassigned: boolean; cold: boolean; urgent: boolean }) {
  if (options.unassigned) {
    return "border-[#c27a2c]/30 bg-[linear-gradient(135deg,rgba(192,80,0,0.12),rgba(255,255,255,0.02))] shadow-[0_0_0_1px_rgba(192,80,0,0.10),0_20px_40px_rgba(0,0,0,0.12)]";
  }
  if (options.cold) {
    return "border-[#8f633d]/28 bg-[linear-gradient(135deg,rgba(143,99,61,0.12),rgba(255,255,255,0.02))] shadow-[0_0_0_1px_rgba(143,99,61,0.08),0_18px_36px_rgba(0,0,0,0.10)]";
  }
  if (options.urgent) {
    return "border-brand/22 bg-[linear-gradient(135deg,rgba(192,80,0,0.08),rgba(255,255,255,0.02))]";
  }
  return "border-[color:var(--border)] bg-surface/55";
}

export function OpsLeadTable({
  title,
  description,
  rows,
  sellers,
  readOnly = false,
  assigningId,
  emptyMessage,
  showOwner = false,
  showFollowUp = false,
  showSlaSignals = true,
  sectionVariant = "default",
  compact = false,
  onAssign
}: {
  title: string;
  description: string;
  rows: ConversationRowData[];
  sellers: OpsSellerOption[];
  readOnly?: boolean;
  assigningId?: string | null;
  emptyMessage: string;
  showOwner?: boolean;
  showFollowUp?: boolean;
  showSlaSignals?: boolean;
  sectionVariant?: "default" | "unassigned" | "cold";
  compact?: boolean;
  onAssign: (conversationId: string, sellerUserId: string) => void;
}) {
  const router = useRouter();
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraftAssignments((current) => {
      const next = { ...current };
      for (const row of rows) {
        if (!Object.prototype.hasOwnProperty.call(next, row.id)) {
          next[row.id] = row.assignedSellerUserId || "";
        }
      }
      for (const id of Object.keys(next)) {
        if (!rows.some((row) => row.id === id)) {
          delete next[id];
        }
      }
      return next;
    });
  }, [rows]);

  return (
    <Card className={`${sectionTone(sectionVariant)} shadow-[var(--card-shadow)]`}>
      <CardHeader className={compact ? "pb-3" : "pb-4"}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl tracking-tight">{title}</CardTitle>
            <CardDescription className="mt-2 text-sm">{description}</CardDescription>
          </div>
          <Badge variant="outline">
            {rows.length} {rows.length === 1 ? "lead" : "leads"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={`pt-0 ${compact ? "space-y-2.5" : "space-y-3"}`}>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 px-4 py-5 text-sm text-muted">
            {emptyMessage}
          </div>
        ) : (
          rows.map((row) => {
            const draftSellerId = draftAssignments[row.id] ?? row.assignedSellerUserId ?? "";
            const ownerLabel = row.assignedSellerName || row.assignedTo || "Sin asignar";
            const isBusy = assigningId === row.id;
            const urgent = showSlaSignals && isUrgentLead(row);
            const cold = showSlaSignals && !urgent && isColdLead(row);
            const unassigned = !row.assignedSellerUserId;
            const inboxHref = row.id ? `/app/inbox/${row.id}` : null;
            const lastActivityLabel = formatDateTime(row.lastMessageAt);

            return (
              <div
                key={row.id}
                role={inboxHref ? "button" : undefined}
                tabIndex={inboxHref ? 0 : undefined}
                onClick={(event) => {
                  if (!inboxHref) return;
                  const target = event.target as HTMLElement | null;
                  if (target?.closest("button, a, select, option, input, label")) return;
                  router.push(inboxHref);
                }}
                onKeyDown={(event) => {
                  if (!inboxHref) return;
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  router.push(inboxHref);
                }}
                className={`grid ${compact ? "gap-3 p-3.5" : "gap-4 p-4"} rounded-[22px] border transition-all lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] ${rowTone({
                  unassigned,
                  cold,
                  urgent
                })} ${
                  inboxHref ? "cursor-pointer hover:border-brand/35 hover:bg-brand/8 focus:outline-none focus:ring-2 focus:ring-brand/30" : ""
                }`}
              >
                <div className={compact ? "space-y-2" : "space-y-3"}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold md:text-base">{row.contact?.name || "Sin nombre"}</p>
                    <Badge className={leadTone(row.leadStatus)}>{leadLabel(row.leadStatus)}</Badge>
                    {unassigned ? <Badge className="border-[#c27a2c]/35 bg-[#c27a2c]/14 text-[#ffd7aa]">Sin asignar</Badge> : null}
                    {urgent ? <Badge className={slaTone("urgent")}>Urgente</Badge> : null}
                    {cold ? <Badge className={slaTone("cold")}>Frio</Badge> : null}
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted">
                    <span>{row.contact?.phone || row.contact?.email || "Sin contacto"}</span>
                    <span>Ultima actividad: {lastActivityLabel}</span>
                    {showOwner ? <span>{unassigned ? "Responsable pendiente" : `Responsable: ${ownerLabel}`}</span> : null}
                    {showFollowUp ? <span>Seguimiento: {formatDateTime(row.nextActionAt)}</span> : null}
                  </div>

                  <p className={`line-clamp-2 text-sm text-muted ${compact ? "leading-5" : "leading-6"}`}>{row.lastMessagePreview || "Sin mensajes recientes"}</p>

                  <div className="flex flex-wrap gap-2 text-xs text-muted">
                    {showFollowUp && row.nextActionNote ? <span>Nota: {row.nextActionNote}</span> : null}
                    {inboxHref ? <span className="text-brandBright">Click para abrir hilo</span> : null}
                  </div>
                </div>

                <div className={`rounded-[18px] border border-[color:var(--border)] bg-bg/45 ${compact ? "p-2.5" : "p-3"}`}>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild type="button" variant="secondary" size="sm">
                      <Link href={`/app/inbox/${row.id}`}>Abrir</Link>
                    </Button>
                    {showFollowUp ? (
                      <Button asChild type="button" variant="secondary" size="sm">
                        <Link href={`/app/inbox/${row.id}`}>Reprogramar</Link>
                      </Button>
                    ) : null}
                  </div>

                  <div className={`${compact ? "mt-2.5" : "mt-3"} grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]`}>
                    <select
                      className={`w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text ${compact ? "h-9" : "h-10"}`}
                      value={draftSellerId}
                      onChange={(event) =>
                        setDraftAssignments((current) => ({
                          ...current,
                          [row.id]: event.target.value
                        }))
                      }
                      disabled={readOnly || isBusy || sellers.length === 0}
                    >
                      <option value="">{sellers.length ? "Selecciona un vendedor" : "Sin vendedores"}</option>
                      {sellers.map((seller) => (
                        <option key={seller.id} value={seller.id}>
                          {seller.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      disabled={readOnly || isBusy || !draftSellerId}
                      onClick={() => onAssign(row.id, draftSellerId)}
                    >
                      {isBusy ? "Guardando..." : row.assignedSellerUserId ? "Reasignar" : "Asignar"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
