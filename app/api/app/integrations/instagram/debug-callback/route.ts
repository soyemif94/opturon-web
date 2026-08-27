import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Temporary, read-only OAuth code capture endpoint for provider diagnostics.
 * The authorization code is intentionally never rendered, logged, persisted,
 * forwarded, or exchanged here; the operator can copy it from the browser URL.
 */
export async function GET(request: NextRequest) {
  const codeCaptured = Boolean(request.nextUrl.searchParams.get("code"));
  return new NextResponse(
    `INSTAGRAM_OAUTH_CODE_CAPTURED=${codeCaptured ? "true" : "false"}\n`,
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": "text/plain; charset=utf-8"
      }
    }
  );
}
