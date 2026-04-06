"use client";

import Link from "next/link";
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
  onAssign: (conversationId: string, sellerUserId: string) => void;
}) {
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
    <Card className="border-white/6 bg-card/90">
      <CardHeader>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 px-4 py-5 text-sm text-muted">
            {emptyMessage}
          </div>
        ) : (
          rows.map((row) => {
            const draftSellerId = draftAssignments[row.id] ?? row.assignedSellerUserId ?? "";
            const ownerLabel = row.assignedSellerName || row.assignedTo || "Sin asignar";
            const isBusy = assigningId === row.id;

            return (
              <div
                key={row.id}
                className="grid gap-4 rounded-[22px] border border-[color:var(--border)] bg-surface/55 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{row.contact?.name || "Sin nombre"}</p>
                    <Badge className={leadTone(row.leadStatus)}>{leadLabel(row.leadStatus)}</Badge>
                  </div>
                  <p className="text-xs text-muted">{row.contact?.phone || row.contact?.email || "Sin contacto"}</p>
                  <p className="line-clamp-2 text-sm text-muted">{row.lastMessagePreview || "Sin mensajes recientes"}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-muted">
                    {showOwner ? <span>Owner: {ownerLabel}</span> : null}
                    {showFollowUp ? <span>Seguimiento: {formatDateTime(row.nextActionAt)}</span> : null}
                    {showFollowUp && row.nextActionNote ? <span>Nota: {row.nextActionNote}</span> : null}
                  </div>
                </div>

                <div className="space-y-3">
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
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <select
                      className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
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
