import { NextRequest, NextResponse } from "next/server";
import {
  createPortalAgendaReservation,
  getBackendErrorBody,
  getBackendErrorStatus,
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
        startTime?: string;
        endTime?: string;
        title?: string;
        description?: string | null;
        contactId?: string | null;
        status?: "pending" | "done" | "cancelled";
      }
    | null;

  try {
    const result = await createPortalAgendaReservation(auth.ctx.tenantId, {
      date: String(body?.date || ""),
      startTime: String(body?.startTime || ""),
      endTime: String(body?.endTime || ""),
      title: String(body?.title || ""),
      description: typeof body?.description === "string" ? body.description : null,
      contactId: typeof body?.contactId === "string" ? body.contactId : null,
      status: body?.status || "pending"
    });
    return noStore(NextResponse.json(result, { status: 201 }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "agenda_reservation_failed",
          detail: error instanceof Error ? error.message : "unknown_error"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
