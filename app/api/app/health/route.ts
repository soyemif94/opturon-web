import { NextResponse } from "next/server";
import { getBuild, getHealth } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(_req: Request) {
  try {
    const [health, build] = await Promise.all([getHealth(), getBuild()]);
    return noStore(NextResponse.json({ success: true, health, build }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed"
        },
        { status: 500 }
      )
    );
  }
}
