import { NextRequest, NextResponse } from "next/server";
import {
  createPortalAgendaItem,
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalAgendaItems,
  isBackendConfigured
} from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";

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

  if (!isBackendConfigured()) return backendUnavailable();

  const url = new URL(request.url);
  const from = String(url.searchParams.get("from") || "").trim();
  const to = String(url.searchParams.get("to") || "").trim();

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

  if (!isBackendConfigured()) return backendUnavailable();

  const body = (await request.json().catch(() => null)) as
    | {
        date?: string;
        startTime?: string | null;
        endTime?: string | null;
        contactId?: string | null;
        type?: "note" | "follow_up" | "task" | "appointment" | "blocked" | "availability";
        title?: string;
        description?: string | null;
        status?: "pending" | "done" | "cancelled";
      }
    | null;

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
