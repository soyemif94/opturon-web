import { NextRequest, NextResponse } from "next/server";
import {
  createPortalAgendaItem,
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalAgendaItems,
  isBackendConfigured
} from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";
import { createAgendaItem, listAgendaItems, touchTenantActivity } from "@/lib/saas/store";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(
    NextResponse.json({ error: "agenda_backend_unavailable", detail: "La agenda requiere backend persistente." }, { status: 503 })
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireAppApi();
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return noStore(NextResponse.json({ error: "missing_tenant_context" }, { status: 400 }));
  }

  const url = new URL(request.url);
  const from = String(url.searchParams.get("from") || "").trim();
  const to = String(url.searchParams.get("to") || "").trim();

  if (!isBackendConfigured()) {
    const items = listAgendaItems(auth.ctx.tenantId, { from, to }).map((item) => ({
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
    }));

    return noStore(NextResponse.json({ data: { items } }, { status: 200 }));
  }

  try {
    const result = await getPortalAgendaItems(auth.ctx.tenantId, { from, to });
    return noStore(NextResponse.json(result, { status: 200 }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "agenda_list_failed",
          detail: error instanceof Error ? error.message : "unknown_error"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAppApi({ permission: "edit_workspace" });
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return noStore(NextResponse.json({ error: "missing_tenant_context" }, { status: 400 }));
  }

  const body = (await request.json().catch(() => null)) as
    | {
        date?: string;
        startTime?: string | null;
        endTime?: string | null;
        contactId?: string | null;
        conversationId?: string | null;
        assignedUserId?: string | null;
        assignedUserName?: string | null;
        type?: "note" | "follow_up" | "task" | "appointment" | "blocked" | "availability";
        title?: string;
        description?: string | null;
        status?: "pending" | "confirmed" | "done" | "reschedule" | "cancelled";
        commercialActionType?: "visit" | "demo" | null;
        commercialOutcome?: "interested" | "not_interested" | "proposal_requested" | "follow_up_later" | "future_demo" | "won" | null;
        origin?: string | null;
        location?: string | null;
        resultNote?: string | null;
        nextStepNote?: string | null;
        nextActionAt?: string | null;
        contactNameSnapshot?: string | null;
        phoneSnapshot?: string | null;
      }
    | null;

  if (!isBackendConfigured()) {
    const item = createAgendaItem(auth.ctx.tenantId, {
      date: String(body?.date || ""),
      startTime: body?.startTime || null,
      endTime: body?.endTime || null,
      contactId: typeof body?.contactId === "string" ? body.contactId : null,
      conversationId: typeof body?.conversationId === "string" ? body.conversationId : null,
      assignedUserId: typeof body?.assignedUserId === "string" ? body.assignedUserId : null,
      assignedUserName: typeof body?.assignedUserName === "string" ? body.assignedUserName : null,
      type: (body?.type || "note") as "note" | "follow_up" | "task" | "appointment" | "blocked" | "availability",
      title: String(body?.title || ""),
      description: typeof body?.description === "string" ? body.description : null,
      status: body?.status || "pending",
      commercialActionType: body?.commercialActionType || null,
      commercialOutcome: body?.commercialOutcome || null,
      origin: typeof body?.origin === "string" ? body.origin : null,
      location: typeof body?.location === "string" ? body.location : null,
      resultNote: typeof body?.resultNote === "string" ? body.resultNote : null,
      nextStepNote: typeof body?.nextStepNote === "string" ? body.nextStepNote : null,
      nextActionAt: typeof body?.nextActionAt === "string" ? body.nextActionAt : null,
      contactNameSnapshot: typeof body?.contactNameSnapshot === "string" ? body.contactNameSnapshot : null,
      phoneSnapshot: typeof body?.phoneSnapshot === "string" ? body.phoneSnapshot : null
    });
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
      }, { status: 201 })
    );
  }

  try {
    const result = await createPortalAgendaItem(auth.ctx.tenantId, {
      date: String(body?.date || ""),
      startTime: body?.startTime || null,
      endTime: body?.endTime || null,
      contactId: typeof body?.contactId === "string" ? body.contactId : null,
      type: (body?.type || "note") as "note" | "follow_up" | "task" | "appointment" | "blocked" | "availability",
      title: String(body?.title || ""),
      description: typeof body?.description === "string" ? body.description : null,
      status: body?.status || "pending"
    });
    return noStore(NextResponse.json(result, { status: 201 }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "agenda_create_failed",
          detail: error instanceof Error ? error.message : "unknown_error"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
