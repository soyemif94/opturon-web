import { NextRequest, NextResponse } from "next/server";
import { postAdminClientInvitationAction, getBackendErrorBody, getBackendErrorStatus } from "@/lib/admin-client-policy";
import { buildPortalInvitationAcceptLink, sendPortalUserInvitationEmail } from "@/lib/portal-user-invitations";
import { requireOpturonAdminApi, resolveOpturonAdminActorId } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string; action: string }> }) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;
  const actorUserId = resolveOpturonAdminActorId(guard.ctx);
  if (!actorUserId) return noStore(NextResponse.json({ error: "opturon_admin_actor_unavailable" }, { status: 403 }));
  const { tenantId, action: rawAction } = await params;
  if (!(["resend", "copy", "cancel"] as const).includes(rawAction as "resend" | "copy" | "cancel")) {
    return noStore(NextResponse.json({ error: "invalid_invitation_action" }, { status: 400 }));
  }
  const action = rawAction as "resend" | "copy" | "cancel";
  const payload = await request.json().catch(() => ({}));
  try {
    const result = await postAdminClientInvitationAction(tenantId, action, payload, { actorUserId });
    if (action === "cancel") return noStore(NextResponse.json(result.data));
    const invitation = result.data.invitation;
    if (!invitation?.token || !invitation.expiresAt) throw new Error("portal_invitation_missing");
    const acceptLink = buildPortalInvitationAcceptLink(invitation.token);
    if (action === "resend") {
      await sendPortalUserInvitationEmail({
        email: String(invitation.email || ""),
        invitedName: String(invitation.name || ""),
        tenantName: invitation.tenantName,
        role: String(invitation.role || "owner"),
        acceptLink,
        expiresAt: invitation.expiresAt
      });
    }
    return noStore(NextResponse.json({ ok: true, tenantId, invitation: {
      expiresAt: invitation.expiresAt,
      sentAt: invitation.sentAt || null,
      acceptLink: action === "copy" ? acceptLink : undefined
    } }));
  } catch (error) {
    return noStore(NextResponse.json(getBackendErrorBody(error) || {
      error: error instanceof Error ? error.message : "client_invitation_action_failed"
    }, { status: getBackendErrorStatus(error) || 502 }));
  }
}
