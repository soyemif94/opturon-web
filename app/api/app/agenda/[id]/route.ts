import { NextRequest, NextResponse } from "next/server";
import {
  deletePortalAgendaItem,
  getBackendErrorBody,
  getBackendErrorStatus,
  isBackendConfigured,
  patchPortalAgendaItem
} from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";

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

  if (!isBackendConfigured()) return backendUnavailable();

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | Partial<{
        date: string;
        startTime: string | null;
        endTime: string | null;
        contactId: string | null;
        type: "note" | "follow_up" | "task" | "appointment" | "blocked" | "availability";
        title: string;
        description: string | null;
        status: "pending" | "done" | "cancelled";
      }>
    | null;

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

  if (!isBackendConfigured()) return backendUnavailable();

  const { id } = await params;

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
