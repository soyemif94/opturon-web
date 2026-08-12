import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus } from "@/lib/api";
import { proxyOperationalAlertsRequest } from "@/lib/operational-alerts-proxy";
import { requireAppModuleApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function errorResponse(error: unknown) {
  const status = getBackendErrorStatus(error) || 502;
  return noStore(
    NextResponse.json(
      getBackendErrorBody(error) || { error: status === 502 ? "operational_alerts_proxy_failed" : "operational_alerts_request_failed" },
      { status }
    )
  );
}

async function handle(request: NextRequest, segments: string[]) {
  const auth = await requireAppModuleApi("settings", { permission: "manage_workspace" });
  if (auth.error) return noStore(auth.error);

  try {
    const result = await proxyOperationalAlertsRequest(auth.ctx, request, segments);
    return noStore(NextResponse.json(result));
  } catch (error) {
    return errorResponse(error);
  }
}

type RouteContext = { params: Promise<{ segments: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return handle(request, (await context.params).segments || []);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handle(request, (await context.params).segments || []);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handle(request, (await context.params).segments || []);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handle(request, (await context.params).segments || []);
}
