import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "catalog_backend_unavailable" }, { status: 503 }));
}

export async function POST(request: NextRequest) {
  const tenantContext = await resolveAppTenant({ permission: "manage_catalog", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  const portalKey = String(process.env.PORTAL_INTERNAL_KEY || "").trim();
  if (!portalKey) {
    return noStore(NextResponse.json({ error: "catalog_upload_unavailable" }, { status: 503 }));
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return noStore(NextResponse.json({ error: "missing_product_image_file" }, { status: 400 }));
    }

    const backendFormData = new FormData();
    backendFormData.set("file", file, file.name || "product-image");

    const response = await fetch(`${getApiBaseUrl()}/portal/tenants/${tenantContext.tenantId}/products/image-upload`, {
      method: "POST",
      headers: {
        "x-portal-key": portalKey
      },
      body: backendFormData,
      cache: "no-store"
    });

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      return noStore(
        NextResponse.json(
          json && typeof json === "object"
            ? json
            : { error: "backend_upload_failed" },
          { status: response.status || 502 }
        )
      );
    }

    return noStore(NextResponse.json({ ok: true, image: json?.data?.image || null }, { status: 201 }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        {
          error: error instanceof Error ? error.message : "backend_upload_failed"
        },
        { status: 502 }
      )
    );
  }
}
