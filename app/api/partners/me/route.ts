import { NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, getPartnerMe } from "@/lib/api";
import { requirePartnerApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  const guard = await requirePartnerApi();
  if (guard.error) return guard.error;

  try {
    const result = await getPartnerMe(String(guard.ctx.session?.user?.partnerId || ""));
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "partner_me_failed",
          detail: error instanceof Error ? error.message : "No se pudo cargar el partner actual."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
