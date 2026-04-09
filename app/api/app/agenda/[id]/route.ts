import { NextRequest, NextResponse } from "next/server";
import {
  deletePortalAgendaItem,
  getBackendErrorBody,
  getBackendErrorStatus,
  isBackendConfigured,
  patchPortalAgendaItem
} from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";
import { deleteAgendaItem, touchTenantActivity, updateAgendaItem } from "@/lib/saas/store";

type Params = {
  params: Promise<{ id: string }>;
};

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(
    NextResponse.json({ error: "agenda_backend_unavailable", detail: "La agenda requiere backend persistente." }, { status: 503 })
  );
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAppApi({ permission: "edit_workspace" });
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return noStore(NextResponse.json({ error: "missing_tenant_context" }, { status: 400 }));
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | Partial<{
        date: string;
        startTime: string | null;
        endTime: string | null;
        contactId: string | null;
        conversationId: string | null;
        assignedUserId: string | null;
        assignedUserName: string | null;
        type: "note" | "follow_up" | "task" | "appointment" | "blocked" | "availability";
        title: string;
        description: string | null;
        status: "pending" | "confirmed" | "done" | "reschedule" | "cancelled";
        commercialActionType: "visit" | "demo" | "follow_up" | null;
        commercialOutcome: "interested" | "not_interested" | "proposal_requested" | "follow_up_later" | "future_demo" | "won" | null;
        origin: string | null;
        location: string | null;
        resultNote: string | null;
        nextStepNote: string | null;
        nextActionAt: string | null;
        contactNameSnapshot: string | null;
        phoneSnapshot: string | null;
      }>
    | null;

  if (!isBackendConfigured()) {
    const item = updateAgendaItem(auth.ctx.tenantId, String(id || "").trim(), body || {});
    if (!item) {
      return noStore(NextResponse.json({ error: "agenda_item_not_found" }, { status: 404 }));
    }
    touchTenantActivity(auth.ctx.tenantId);
    return noStore(
      NextResponse.json({
        data: {
          id: item.id,
          clinicId: item.tenantId,
          date: item.date,
          startAt: item.startAt,
          endAt: item.endAt,
          contactId: item.contactId || null,
          conversationId: item.conversationId || null,
          assignedUserId: item.assignedUserId || null,
          assignedUserName: item.assignedUserName || null,
          contact: item.contactId
            ? {
                id: item.contactId,
                name: item.contactNameSnapshot || "Sin nombre",
                phone: item.phoneSnapshot || null
              }
            : null,
          startTime: item.startAt ? item.startAt.slice(11, 16) : null,
          endTime: item.endAt ? item.endAt.slice(11, 16) : null,
          type: item.type,
          title: item.title,
          description: item.description,
          status: item.status,
          commercialActionType: item.commercialActionType || null,
          commercialOutcome: item.commercialOutcome || null,
          origin: item.origin || null,
          location: item.location || null,
          resultNote: item.resultNote || null,
          nextStepNote: item.nextStepNote || null,
          nextActionAt: item.nextActionAt || null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }
      }, { status: 200 })
    );
  }

  try {
    const result = await patchPortalAgendaItem(auth.ctx.tenantId, String(id || "").trim(), body || {});
    return noStore(NextResponse.json(result, { status: 200 }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "agenda_update_failed",
          detail: error instanceof Error ? error.message : "unknown_error"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAppApi({ permission: "edit_workspace" });
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return noStore(NextResponse.json({ error: "missing_tenant_context" }, { status: 400 }));
  }

  const { id } = await params;

  if (!isBackendConfigured()) {
    const deleted = deleteAgendaItem(auth.ctx.tenantId, String(id || "").trim());
    if (!deleted) {
      return noStore(NextResponse.json({ error: "agenda_item_not_found" }, { status: 404 }));
    }
    touchTenantActivity(auth.ctx.tenantId);
    return noStore(NextResponse.json({ ok: true }, { status: 200 }));
  }

  try {
    const result = await deletePortalAgendaItem(auth.ctx.tenantId, String(id || "").trim());
    return noStore(NextResponse.json(result, { status: 200 }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "agenda_delete_failed",
          detail: error instanceof Error ? error.message : "unknown_error"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
