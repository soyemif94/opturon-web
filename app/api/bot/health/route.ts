import { NextResponse } from "next/server";
import { getBuild, getDebugInboxHealth, getHealth } from "@/lib/api";

export async function GET() {
  try {
    const [health, build, inbox] = await Promise.all([getHealth(), getBuild(), getDebugInboxHealth()]);
    return NextResponse.json({ success: true, health, build, inbox });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
