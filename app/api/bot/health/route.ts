import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function safeFetchJson(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const text = await response.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text || null;
    }
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, status: 0, body: error instanceof Error ? error.message : "fetch_failed" };
  }
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const [appHealth, appBuild] = await Promise.all([
    safeFetchJson(`${origin}/api/app/health`),
    safeFetchJson(`${origin}/api/__build`)
  ]);

  if (!appHealth.ok || !appBuild.ok) {
    return noStore(
      NextResponse.json({
        ok: false,
        error: "internal_app_route_unavailable",
        details: {
          health: { status: appHealth.status, body: appHealth.body },
          build: { status: appBuild.status, body: appBuild.body }
        }
      })
    );
  }

  return noStore(
    NextResponse.json({
      ok: true,
      health: appHealth.body,
      build: appBuild.body
    })
  );
}
