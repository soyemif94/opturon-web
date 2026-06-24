import { NextRequest, NextResponse } from "next/server";
import {
  callClientRequestBackend,
  getClientRequestBackendErrorBody,
  getClientRequestBackendErrorStatus
} from "@/lib/partner-client-requests-api";
import { requirePartnerApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function errorResponse(error: unknown) {
  return noStore(
    NextResponse.json(
      getClientRequestBackendErrorBody(error) || {
        error: "partner_client_requests_proxy_failed",
        detail: error instanceof Error ? error.message : "No se pudo completar la operacion."
      },
      { status: getClientRequestBackendErrorStatus(error) || 502 }
    )
  );
}

export async function GET(request: NextRequest) {
  const guard = await requirePartnerApi();
  if (guard.error) return noStore(guard.error);
  const partnerId = String(guard.ctx.session?.user?.partnerId || "");
  try {
    const suffix = request.nextUrl.searchParams.toString();
    const result = await callClientRequestBackend(
      `/api/partners/me/client-requests${suffix ? `?${suffix}` : ""}`,
      { method: "GET" },
      { partnerId }
    );
    return noStore(NextResponse.json(result));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requirePartnerApi();
  if (guard.error) return noStore(guard.error);
  const partnerId = String(guard.ctx.session?.user?.partnerId || "");
  try {
    const result = await callClientRequestBackend(
      "/api/partners/me/client-requests",
      { method: "POST", body: await request.formData() },
      { partnerId }
    );
    return noStore(NextResponse.json(result));
  } catch (error) {
    return errorResponse(error);
  }
}
