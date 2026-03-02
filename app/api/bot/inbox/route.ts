import { NextResponse } from "next/server";
import { getBuild, getDebugInbox, getDebugInboxHealth, getHealth } from "@/lib/api";

export async function GET() {
  try {
    const [health, build, inboxHealth, inbox] = await Promise.all([
      getHealth(),
      getBuild(),
      getDebugInboxHealth(),
      getDebugInbox(50)
    ]);

    return NextResponse.json({
      success: true,
      health,
      build,
      inboxHealth,
      items: inbox.items || []
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to load inbox",
      health: null,
      build: null,
      inboxHealth: null,
      items: []
    }, { status: 200 });
  }
}
