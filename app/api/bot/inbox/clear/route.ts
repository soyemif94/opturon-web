import { NextResponse } from "next/server";
import { clearDebugInbox } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST() {
  try {
    const result = await clearDebugInbox();
    return noStore(NextResponse.json({ success: true, result }));
  } catch (error) {
    return noStore(NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed" }, { status: 500 }));
  }
}
