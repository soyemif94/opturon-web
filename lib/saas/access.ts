import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { hasAppPermission, isStaffRole, type AppPermission } from "@/lib/app-permissions";
import { authOptions } from "@/lib/auth";
import { readSaasData } from "@/lib/saas/store";
import type { GlobalRole } from "@/lib/saas/types";

const STAFF_ROLES = new Set(["superadmin", "ops_admin", "sales_rep", "support_agent"]);
const OPTURON_ADMIN_ROLES = new Set(["superadmin", "ops_admin"]);
const PARTNER_ROLE = "partner";

function resolveDemoTenantId(requestedTenantId?: string) {
  if (requestedTenantId) return requestedTenantId;
  return readSaasData().tenants[0]?.id;
}

export async function getSessionContext() {
  const session = await getServerSession(authOptions);
  // /app must trust the already-resolved session identity only.
  // Client portal users should reach this point from the persistent backend auth flow.
  return {
    session,
    userId: session?.user?.id,
    globalRole: session?.user?.globalRole,
    tenantId: session?.user?.tenantId,
    tenantRole: session?.user?.tenantRole,
    accountScope: session?.user?.accountScope
  };
}

function normalizeScope(value?: string) {
  return String(value || "").trim().toLowerCase();
}

export function hasOpturonAdminApiAccess(ctx: {
  session?: { user?: { id?: string; accountScope?: string } } | null;
  userId?: string;
  globalRole?: string;
  accountScope?: string;
}) {
  if (!ctx.session) return false;
  if (!ctx.userId || !String(ctx.userId).trim()) return false;
  if (!ctx.globalRole || !OPTURON_ADMIN_ROLES.has(String(ctx.globalRole))) return false;
  return normalizeScope(ctx.accountScope || ctx.session?.user?.accountScope) === "opturon_admin";
}

export function resolveOpturonAdminActorId(ctx: {
  session?: { user?: { id?: string } } | null;
  userId?: string;
  globalRole?: string;
  accountScope?: string;
}) {
  if (!hasOpturonAdminApiAccess(ctx)) return null;
  return String(ctx.session?.user?.id || ctx.userId || "").trim() || null;
}

export async function requireOpsPage() {
  const ctx = await getSessionContext();
  if (!ctx.session) redirect("/login?callbackUrl=/ops");
  if (!ctx.globalRole || !STAFF_ROLES.has(ctx.globalRole)) redirect("/app");
  return ctx;
}

export async function requireOpturonAdminPage(callbackUrl = "/app/client-management") {
  const ctx = await getSessionContext();
  if (!ctx.session) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (!hasOpturonAdminApiAccess(ctx)) redirect("/app");
  return ctx;
}

export async function requireAppPage(options?: { permission?: AppPermission }) {
  const ctx = await getSessionContext();
  if (!ctx.session) redirect("/login?callbackUrl=/app");
  if (ctx.globalRole === PARTNER_ROLE) redirect("/partners");
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

export async function requireOpturonAdminApi() {
  const ctx = await getSessionContext();
  if (!ctx.session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!hasOpturonAdminApiAccess(ctx)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ctx };
}

export async function requireAppApi(options?: { permission?: AppPermission }) {
  const ctx = await getSessionContext();
  if (!ctx.session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (ctx.globalRole === PARTNER_ROLE) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (!ctx.tenantId && !isStaffRole(ctx.globalRole)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const permission = options?.permission || "view_workspace";
  if (!hasAppPermission(ctx, permission)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ctx };
}

export async function requirePartnerPage() {
  const ctx = await getSessionContext();
  if (!ctx.session) redirect("/login?callbackUrl=/partners");
  if (ctx.globalRole !== PARTNER_ROLE || !ctx.session.user?.partnerId) redirect("/app");
  return ctx;
}

export async function requirePartnerApi() {
  const ctx = await getSessionContext();
  if (!ctx.session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (ctx.globalRole !== PARTNER_ROLE || !ctx.session.user?.partnerId) {
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
