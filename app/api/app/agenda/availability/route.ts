import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalAgendaAvailability,
  isBackendConfigured
} from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";
import { getAgendaAvailability } from "@/lib/saas/store";

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
  const date = String(url.searchParams.get("date") || "").trim();
  const from = String(url.searchParams.get("from") || "").trim();
  const to = String(url.searchParams.get("to") || "").trim();

  if (!isBackendConfigured()) {
    const days = date ? [getAgendaAvailability(auth.ctx.tenantId, date)] : [];
    return noStore(NextResponse.json({ data: { days, from: from || null, to: to || null } }, { status: 200 }));
  }

  try {
    const result = await getPortalAgendaAvailability(auth.ctx.tenantId, { date, from, to });
    return noStore(NextResponse.json(result, { status: 200 }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "agenda_availability_failed",
          detail: error instanceof Error ? error.message : "unknown_error"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
