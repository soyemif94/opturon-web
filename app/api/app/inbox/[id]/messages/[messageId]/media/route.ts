import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await params;
  const url = new URL(request.url);

  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;

  if (tenantContext.readOnly || !isBackendConfigured()) {
    return NextResponse.json(
      {
        error: "portal_inbox_media_unavailable"
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    return NextResponse.json(
      {
        error: "portal_inbox_backend_unavailable"
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  const response = await fetch(
    `${apiBase}/portal/tenants/${tenantContext.tenantId}/conversations/${id}/messages/${messageId}/media`,
    {
      method: "GET",
      cache: "no-store"
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "portal_inbox_media_fetch_failed"
      },
      {
        status: response.status || 502,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  const body = await response.arrayBuffer();
  const headers = new Headers();
  headers.set("Cache-Control", "private, max-age=60");
  headers.set("Content-Type", response.headers.get("content-type") || "application/octet-stream");

  const contentDisposition = response.headers.get("content-disposition");
  if (contentDisposition) {
    headers.set("Content-Disposition", contentDisposition);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  return new NextResponse(body, {
    status: 200,
    headers
  });
}
