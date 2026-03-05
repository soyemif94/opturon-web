import { NextResponse } from "next/server";
import { getDebugInbox } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(_req: Request) {
  try {
    const inbox = await getDebugInbox(200);
    const items = Array.isArray(inbox.items) ? inbox.items : [];

    const bySender = new Map<string, number>();
    for (const item of items) {
      const sender = item.from || "unknown";
      bySender.set(sender, (bySender.get(sender) || 0) + 1);
    }

    const topSenders = Array.from(bySender.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sender, count]) => ({ sender, count }));

    return noStore(
      NextResponse.json({
        success: true,
        total: items.length,
        topSenders
      })
    );
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
