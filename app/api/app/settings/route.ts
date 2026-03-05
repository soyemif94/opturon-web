import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(_req: Request) {
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
