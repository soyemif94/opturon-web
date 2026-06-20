import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { acceptPartnerInvitation, getBackendErrorBody, getBackendErrorStatus, validatePartnerInvitation } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const acceptSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8)
});

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const token = String(new URL(request.url).searchParams.get("token") || "");

  try {
    const response = await validatePartnerInvitation(token);
    return noStore(
      NextResponse.json({
        ok: true,
        valid: true,
        invitation: response.data
      })
    );
  } catch (error) {
    const status = getBackendErrorStatus(error) || 500;
    const invalid = status === 400 || (error instanceof Error && error.message === "invalid_or_expired_invitation");
    return noStore(
      NextResponse.json(
        {
          ok: false,
          valid: false,
          error: invalid ? "invalid_or_expired_invitation" : getBackendErrorBody(error) || "partner_invitation_lookup_failed"
        },
        { status: invalid ? 400 : status }
      )
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = acceptSchema.safeParse(await request.json());
    if (!parsed.success) {
      return noStore(NextResponse.json({ error: "invalid_request" }, { status: 400 }));
    }

    const response = await acceptPartnerInvitation(parsed.data.token, parsed.data.password);
    return noStore(NextResponse.json({ ok: true, data: response.data }));
  } catch (error) {
    const status = getBackendErrorStatus(error) || 500;
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: error instanceof Error ? error.message : "partner_invitation_accept_failed"
        },
        { status }
      )
    );
  }
}
