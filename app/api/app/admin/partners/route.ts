import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus } from "@/lib/api";
import { proxyAdminPartnersRequest } from "@/lib/partners-admin-proxy";
import { requireOpturonAdminApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function toProxyErrorResponse(error: unknown) {
  const status = getBackendErrorStatus(error);
  if (status === undefined && error instanceof Error && error.message === "unsupported_admin_partners_route") {
    return noStore(NextResponse.json({ error: "Not Found" }, { status: 404 }));
  }

  return noStore(
    NextResponse.json(
      getBackendErrorBody(error) || {
        error: "admin_partners_proxy_failed",
        detail: error instanceof Error ? error.message : "No se pudo completar la operacion de partners admin."
      },
      { status: status || 502 }
    )
  );
}

async function handleRequest(request: NextRequest) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return noStore(guard.error);

  try {
    const result = await proxyAdminPartnersRequest(guard.ctx, request);
    return noStore(NextResponse.json(result));
  } catch (error) {
    return toProxyErrorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
