import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { hasAppPermission, isStaffRole, type AppPermission } from "@/lib/app-permissions";
import { authOptions } from "@/lib/auth";
import { readSaasData } from "@/lib/saas/store";
import type { GlobalRole } from "@/lib/saas/types";

const STAFF_ROLES = new Set<GlobalRole>(["superadmin", "ops_admin", "sales_rep", "support_agent"]);

function resolveDemoTenantId(requestedTenantId?: string) {
  if (requestedTenantId) return requestedTenantId;
  return readSaasData().tenants[0]?.id;
}

export async function getSessionContext() {
  const session = await getServerSession(authOptions);
  return {
    session,
    userId: session?.user?.id,
    globalRole: session?.user?.globalRole,
    tenantId: session?.user?.tenantId,
    tenantRole: session?.user?.tenantRole
  };
}

export async function requireOpsPage() {
  const ctx = await getSessionContext();
  if (!ctx.session) redirect("/login?callbackUrl=/ops");
  if (!ctx.globalRole || !STAFF_ROLES.has(ctx.globalRole)) redirect("/app");
  return ctx;
}

export async function requireAppPage(options?: { permission?: AppPermission }) {
  const ctx = await getSessionContext();
  if (!ctx.session) redirect("/login?callbackUrl=/app");
  const permission = options?.permission || "view_workspace";
  if (!hasAppPermission(ctx, permission)) {
    if (!hasAppPermission(ctx, "view_workspace")) redirect("/login?callbackUrl=/app");
    redirect("/app");
  }
  return ctx;
}

export async function requireOpsApi() {
  const ctx = await getSessionContext();
  if (!ctx.session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!ctx.globalRole || !STAFF_ROLES.has(ctx.globalRole)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ctx };
}

export async function requireAppApi(options?: { permission?: AppPermission }) {
  const ctx = await getSessionContext();
  if (!ctx.session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!ctx.tenantId && !isStaffRole(ctx.globalRole)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const permission = options?.permission || "view_workspace";
  if (!hasAppPermission(ctx, permission)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ctx };
}

export async function resolveAppTenant(options?: {
  requestedTenantId?: string;
  demo?: boolean;
  requireWrite?: boolean;
  permission?: AppPermission;
}) {
  const ctx = await getSessionContext();
  if (!ctx.session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const isStaff = Boolean(ctx.globalRole && STAFF_ROLES.has(ctx.globalRole));
  const requested = options?.requestedTenantId;
  const isDemo = Boolean(options?.demo);
  const requiredPermission = options?.permission || (options?.requireWrite ? "edit_workspace" : "view_workspace");
  const canWrite = hasAppPermission(ctx, "edit_workspace");

  if (ctx.tenantId) {
    if (!hasAppPermission(ctx, requiredPermission)) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { ctx, tenantId: ctx.tenantId, readOnly: !canWrite };
  }

  if (isStaff && requested && isDemo) {
    if (options?.requireWrite) {
      return { error: NextResponse.json({ error: "Demo mode is read-only" }, { status: 403 }) };
    }
    return { ctx, tenantId: requested, readOnly: true };
  }

  if (isStaff && !options?.requireWrite) {
    const demoTenantId = resolveDemoTenantId(requested);
    if (demoTenantId) {
      return { ctx, tenantId: demoTenantId, readOnly: true };
    }
  }

  return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}
