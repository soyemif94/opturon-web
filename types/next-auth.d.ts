import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { GlobalRole, TenantRole } from "@/lib/saas/types";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      globalRole: GlobalRole;
      role?: GlobalRole;
      tenantId?: string;
      tenantRole?: TenantRole;
    };
  }

  interface User {
    id: string;
    globalRole: GlobalRole;
    role?: GlobalRole;
    tenantId?: string;
    tenantRole?: TenantRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    globalRole?: GlobalRole;
    role?: GlobalRole;
    tenantId?: string;
    tenantRole?: TenantRole;
  }
}

export {};

