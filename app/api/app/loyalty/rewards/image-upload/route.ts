import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, isBackendConfigured, uploadPortalLoyaltyRewardImage } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "loyalty_backend_unavailable" }, { status: 503 }));
}

export async function POST(request: NextRequest) {
  const tenantContext = await resolveAppTenant({ requireWrite: true, permission: "edit_workspace" });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const incoming = await request.formData();
    const file = incoming.get("file");
    if (!(file instanceof File)) {
      return noStore(NextResponse.json({ error: "missing_loyalty_reward_image_file" }, { status: 400 }));
    }

    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadPortalLoyaltyRewardImage(tenantContext.tenantId, formData);
    return noStore(NextResponse.json({ ok: true, image: result.data.image }, { status: 201 }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : {
              error: error instanceof Error ? error.message : "backend_upload_failed"
            },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
