import type { DefaultSession } from "next-auth";
import type { GlobalRole, TenantRole } from "@/lib/saas/types";

type AuthGlobalRole = GlobalRole | "partner";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      globalRole: AuthGlobalRole;
      role?: AuthGlobalRole;
      tenantId?: string;
      tenantRole?: TenantRole;
      partnerId?: string;
      accountScope?: string;
      portalActorId?: string;
      authSource?: string;
    };
  }

  interface User {
    id: string;
    globalRole: AuthGlobalRole;
    role?: AuthGlobalRole;
    tenantId?: string;
    tenantRole?: TenantRole;
    partnerId?: string;
    accountScope?: string;
    portalActorId?: string;
    authSource?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    globalRole?: AuthGlobalRole;
    role?: AuthGlobalRole;
    tenantId?: string;
    tenantRole?: TenantRole;
    partnerId?: string;
    accountScope?: string;
    portalActorId?: string;
    authSource?: string;
  }
}

export {};
