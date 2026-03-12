import { NextResponse } from "next/server";
import { requireAppApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(_req: Request) {
  const guard = await requireAppApi({ permission: "manage_workspace" });
  if (guard.error) return guard.error;
  const hasDebugKey = Boolean(String(process.env.API_DEBUG_KEY || "").trim());
  const backendBaseUrl = String(process.env.BACKEND_BASE_URL || "").trim();

  if (backendBaseUrl && !hasDebugKey) {
    return noStore(
      NextResponse.json(
        {
          error: "missing_server_debug_key"
        },
        { status: 401 }
      )
    );
  }

  return noStore(
    NextResponse.json({
      success: true,
      mode: backendBaseUrl ? "backend" : "local",
      hasServerDebugKey: hasDebugKey
    })
  );
}
