import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { acceptPortalInvitation, getPortalInvitation, isBackendConfigured } from "@/lib/api";
import {
  acceptLocalPortalInvitation,
  getLocalPortalInvitationSummary
} from "@/lib/portal-user-invitations";

const acceptSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8)
});

export async function GET(request: NextRequest) {
  const token = String(new URL(request.url).searchParams.get("token") || "");

  try {
    if (isBackendConfigured()) {
      const response = await getPortalInvitation(token);
      return NextResponse.json({
        ok: true,
        valid: true,
        invitation: response.data
      });
    }

    const invitation = getLocalPortalInvitationSummary(token);
    return NextResponse.json({
      ok: true,
      valid: Boolean(invitation),
      invitation: invitation || null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "portal_invitation_lookup_failed";
    const invalid = message === "invalid_or_expired_invitation" || message.includes("API request failed (400)");
    return NextResponse.json(
      {
        ok: false,
        valid: false,
        error: invalid ? "invalid_or_expired_invitation" : message
      },
      { status: invalid ? 400 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = acceptSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    if (isBackendConfigured()) {
      const response = await acceptPortalInvitation(parsed.data.token, parsed.data.password);
      return NextResponse.json({ ok: true, data: response.data });
    }

    const result = acceptLocalPortalInvitation(parsed.data.token, parsed.data.password);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "portal_invitation_accept_failed";
    const status =
      message === "invalid_or_expired_invitation" || message === "invalid_invitation_acceptance"
        ? 400
        : message === "invited_user_not_found"
          ? 404
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
