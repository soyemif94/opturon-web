import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, getPartnerMeCommissions } from "@/lib/api";
import { requirePartnerApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const guard = await requirePartnerApi();
  if (guard.error) return guard.error;

  try {
    const result = await getPartnerMeCommissions(String(guard.ctx.session?.user?.partnerId || ""), {
      status: request.nextUrl.searchParams.get("status"),
      type: request.nextUrl.searchParams.get("type"),
      from: request.nextUrl.searchParams.get("from"),
      to: request.nextUrl.searchParams.get("to"),
      page: request.nextUrl.searchParams.get("page")
    });
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "partner_commissions_failed",
          detail: error instanceof Error ? error.message : "No se pudo cargar el ledger de comisiones."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
