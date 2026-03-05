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
  const [inboxRes, healthRes, buildRes] = await Promise.all([
    safeFetchJson(`${origin}/api/app/inbox`),
    safeFetchJson(`${origin}/api/app/health`),
    safeFetchJson(`${origin}/api/__build`)
  ]);

  const items = Array.isArray(inboxRes.body?.conversations)
    ? inboxRes.body.conversations.map((item: any) => ({
        ts: item.lastMessageAt || null,
        type: item.status || null,
        from: item.contact?.phone || item.contact?.name || null,
        messageId: item.id || null,
        text: item.contact?.name || null
      }))
    : [];

  if (!inboxRes.ok || !healthRes.ok || !buildRes.ok) {
    return noStore(
      NextResponse.json({
        success: false,
        error: "internal_app_route_unavailable",
        health: healthRes.ok ? healthRes.body : null,
        build: buildRes.ok ? buildRes.body : null,
        inboxHealth: null,
        items: [],
        details: {
          inbox: { status: inboxRes.status, body: inboxRes.body },
          health: { status: healthRes.status, body: healthRes.body },
          build: { status: buildRes.status, body: buildRes.body }
        }
      })
    );
  }

  return noStore(
    NextResponse.json({
      success: true,
      health: healthRes.body,
      build: buildRes.body,
      inboxHealth: {
        ok: true,
        size: items.length,
        max: items.length
      },
      items
    })
  );
}
