import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(_req: Request) {
  return noStore(
    NextResponse.json({
      ok: true,
      sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      ts: new Date().toISOString()
    })
  );
}
