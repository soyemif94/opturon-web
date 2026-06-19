import { compareSync } from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import {
  getPartnerAuthUserByEmail,
  getPortalAdminActor,
  getPortalAuthUserByEmail,
  isPersistentPortalIdentityEnabled,
  isPortalInternalAuthConfigured,
  loginPartnerUser,
  loginPortalUser
} from "@/lib/api";
import { isStaffGlobalRole, normalizeGlobalRole, resolveAccountScopeForIdentity, type AuthGlobalRole } from "@/lib/auth-identity";
import { normalizeTenantRole } from "@/lib/app-permissions";
import { getLocalBootstrapAuthUserByEmail } from "@/lib/auth-store";
import type { TenantRole } from "@/lib/saas/types";

function isProduction() {
  return String(process.env.NODE_ENV || "").toLowerCase() === "production";
}

function canUseLocalBootstrapAuth(globalRole: AuthGlobalRole) {
  return !isPersistentPortalIdentityEnabled() || isStaffGlobalRole(globalRole);
}

async function resolvePortalActorIdForAdminIdentity(input: {
  accountScope?: string;
  tenantId?: string;
  email?: string;
}) {
  if (String(input.accountScope || "").trim().toLowerCase() !== "opturon_admin") return undefined;
  if (!isPortalInternalAuthConfigured() && !isProduction()) return undefined;
  const tenantId = String(input.tenantId || "").trim();
  if (!tenantId) return undefined;

  const response = await getPortalAdminActor(tenantId, input.email ? String(input.email).trim().toLowerCase() : undefined);
  return response.data?.id ? String(response.data.id) : undefined;
}

export const authOptions: NextAuthOptions = {
  debug: String(process.env.NEXTAUTH_DEBUG || "").toLowerCase() === "true",
  logger: {
    error(code, ...message) {
      console.error("NEXTAUTH_LOG_ERROR", code, ...message);
    },
    warn(code, ...message) {
      console.warn("NEXTAUTH_LOG_WARN", code, ...message);
    },
    debug(code, ...message) {
      console.log("NEXTAUTH_LOG_DEBUG", code, ...message);
    }
  },
  session: {
    strategy: "jwt"
  },
  useSecureCookies: isProduction(),
  pages: {
    signIn: "/login"
  },
  cookies: {
    sessionToken: {
      name: isProduction() ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction()
      }
    }
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const email = String(credentials?.email || "").trim().toLowerCase();
          const password = String(credentials?.password || "");
          if (!email || !password) return null;

          if (isPersistentPortalIdentityEnabled()) {
            try {
              const response = await loginPortalUser(email, password);
              const backendUser = response.data;
              const globalRole = normalizeGlobalRole(backendUser.globalRole);
              const tenantId = String(backendUser.tenantId || "").trim();
              const tenantRole = normalizeTenantRole(backendUser.tenantRole);
              if (!isStaffGlobalRole(globalRole) && (!tenantId || !tenantRole)) {
                console.error("AUTH_BACKEND_LOGIN_MISSING_TENANT_CONTEXT", {
                  email,
                  globalRole,
                  tenantId: backendUser.tenantId || null,
                  tenantRole: backendUser.tenantRole || null
                });
                return null;
              }
              return {
                id: backendUser.id,
                email: backendUser.email,
                name: backendUser.name,
                role: globalRole,
                globalRole,
                tenantId: tenantId || undefined,
                tenantRole,
                accountScope: resolveAccountScopeForIdentity({
                  accountScope: backendUser.accountScope,
                  authSource: "backend",
                  globalRole,
                  tenantId: tenantId || undefined,
                  tenantRole
                }),
                portalActorId: undefined,
                authSource: "backend"
              };
            } catch (error) {
              const status = error && typeof error === "object" && "status" in error ? Number((error as any).status) : 0;
              if (status !== 401) {
                console.error("AUTH_BACKEND_LOGIN_ERROR", { email, status, message: String(error) });
              }
            }

            try {
              const response = await loginPartnerUser(email, password);
              const backendUser = response.data;
              const globalRole = normalizeGlobalRole(backendUser.globalRole);
              return {
                id: backendUser.id,
                email: backendUser.email,
                name: backendUser.name,
                role: globalRole,
                globalRole,
                partnerId: backendUser.partnerId,
                accountScope: resolveAccountScopeForIdentity({
                  accountScope: backendUser.accountScope,
                  authSource: "backend",
                  globalRole,
                  partnerId: backendUser.partnerId
                }),
                portalActorId: undefined,
                authSource: "backend"
              };
            } catch (error) {
              const status = error && typeof error === "object" && "status" in error ? Number((error as any).status) : 0;
              if (status !== 401) {
                console.error("AUTH_BACKEND_PARTNER_LOGIN_ERROR", { email, status, message: String(error) });
              }
            }
          }

          const user = await getLocalBootstrapAuthUserByEmail(email);
          if (!user) {
            console.warn("AUTH_NO_USER", { email });
            return null;
          }

          let ok = false;
          try {
            ok = compareSync(password, user.passwordHash);
          } catch (e) {
            console.error("BCRYPT_COMPARE_ERROR", {
              msg: String(e),
              hashPrefix: String(user.passwordHash || "").slice(0, 4),
              hashLen: String(user.passwordHash || "").length,
              hasEnvEmail: !!process.env.AUTH_ADMIN_EMAIL,
              hasEnvHash: !!process.env.AUTH_ADMIN_PASSWORD_HASH
            });
            return null;
          }

          if (!ok) {
            console.warn("AUTH_BAD_PASSWORD", { email });
            return null;
          }

          const globalRole = normalizeGlobalRole(user.globalRole);
          const allowLocalPortalFallback = canUseLocalBootstrapAuth(globalRole);
          if (!allowLocalPortalFallback) {
            console.warn("AUTH_LOCAL_CLIENT_FALLBACK_BLOCKED", { email });
            return null;
          }
          const resolvedAccountScope = resolveAccountScopeForIdentity({
            accountScope: user.accountScope,
            authSource: "local",
            globalRole,
            tenantId: user.tenantId,
            tenantRole: user.tenantRole
          });
          const portalActorId = await resolvePortalActorIdForAdminIdentity({
            accountScope: resolvedAccountScope,
            tenantId: user.tenantId,
            email
          });
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: globalRole,
            globalRole,
            tenantId: user.tenantId,
            tenantRole: user.tenantRole,
            accountScope: resolvedAccountScope,
            portalActorId,
            authSource: "local"
          };
        } catch (error) {
          console.error("AUTH_AUTHORIZE_FATAL", {
            msg: String(error),
            stack: error instanceof Error ? error.stack : undefined,
            hasEnvEmail: !!process.env.AUTH_ADMIN_EMAIL,
            hasEnvHash: !!process.env.AUTH_ADMIN_PASSWORD_HASH
          });
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      try {
        if (user) {
          token.userId = user.id;
          token.email = user.email;
          token.globalRole = normalizeGlobalRole((user as any).globalRole || (user as any).role);
          token.role = token.globalRole;
          token.tenantId = (user as any).tenantId;
          token.tenantRole = (user as any).tenantRole;
          token.partnerId = (user as any).partnerId;
          token.accountScope = resolveAccountScopeForIdentity({
            accountScope: (user as any).accountScope,
            authSource: (user as any).authSource || token.authSource || "local",
            globalRole: (user as any).globalRole || (user as any).role,
            partnerId: (user as any).partnerId,
            tenantId: (user as any).tenantId,
            tenantRole: (user as any).tenantRole
          });
          token.portalActorId = (user as any).portalActorId ? String((user as any).portalActorId) : undefined;
          token.authSource = (user as any).authSource || token.authSource || "local";
        }

        if (token.email) {
          const tokenGlobalRole = normalizeGlobalRole(String(token.globalRole || token.role || "client"));
          const shouldHydratePersistentPortalIdentity =
            isPersistentPortalIdentityEnabled() && !isStaffGlobalRole(tokenGlobalRole);

          if (shouldHydratePersistentPortalIdentity) {
            const tokenTenantId = String(token.tenantId || "").trim();
            if (!tokenTenantId) {
              if (tokenGlobalRole === "partner") {
                try {
                  const response = await getPartnerAuthUserByEmail(String(token.email));
                  const hydratedPartner = response.data;
                  if (hydratedPartner) {
                    token.userId = hydratedPartner.id;
                    token.globalRole = "partner";
                    token.role = "partner";
                    token.partnerId = hydratedPartner.partnerId;
                    token.tenantId = undefined;
                    token.tenantRole = undefined;
                    token.accountScope = resolveAccountScopeForIdentity({
                      accountScope: hydratedPartner.accountScope,
                      authSource: "backend",
                      globalRole: "partner",
                      partnerId: hydratedPartner.partnerId
                    });
                    token.portalActorId = undefined;
                    token.authSource = "backend";
                    return token;
                  }
                } catch (error) {
                  console.error("JWT_BACKEND_PARTNER_HYDRATE_ERROR", { msg: String(error) });
                }
              }
              token.userId = undefined;
              token.tenantId = undefined;
              token.tenantRole = undefined;
              token.partnerId = undefined;
              token.accountScope = undefined;
              token.globalRole = "client";
              token.role = "client";
              token.authSource = "backend";
              return token;
            }
            try {
              const response = await getPortalAuthUserByEmail(String(token.email), tokenTenantId);
              const hydratedUser = response.data;
              if (hydratedUser) {
                token.userId = hydratedUser.id;
                token.globalRole = normalizeGlobalRole(String(hydratedUser.globalRole || token.globalRole || token.role || "client"));
                token.role = token.globalRole;
                token.tenantId = hydratedUser.tenantId;
                token.tenantRole = normalizeTenantRole(hydratedUser.tenantRole);
                token.partnerId = undefined;
                token.accountScope = resolveAccountScopeForIdentity({
                  accountScope: hydratedUser.accountScope,
                  authSource: "backend",
                  globalRole: hydratedUser.globalRole || token.globalRole || token.role || "client",
                  tenantId: hydratedUser.tenantId,
                  tenantRole: hydratedUser.tenantRole
                });
                token.portalActorId = undefined;
                token.authSource = "backend";
              } else {
                token.userId = undefined;
                token.tenantId = undefined;
                token.tenantRole = undefined;
                token.partnerId = undefined;
                token.accountScope = undefined;
                token.portalActorId = undefined;
                token.globalRole = "client";
                token.role = "client";
              }
            } catch (error) {
              console.error("JWT_BACKEND_HYDRATE_ERROR", { msg: String(error) });
            }
          } else if (!isPersistentPortalIdentityEnabled() && (!token.tenantId || !token.tenantRole)) {
            const hydratedUser = await getLocalBootstrapAuthUserByEmail(String(token.email));
            if (hydratedUser) {
              token.userId = hydratedUser.id;
              token.globalRole = normalizeGlobalRole(String(hydratedUser.globalRole || token.globalRole || token.role || "client"));
              token.role = token.globalRole;
              token.tenantId = hydratedUser.tenantId;
              token.tenantRole = normalizeTenantRole(hydratedUser.tenantRole);
              token.partnerId = undefined;
              token.accountScope = resolveAccountScopeForIdentity({
                accountScope: hydratedUser.accountScope,
                authSource: "local",
                globalRole: hydratedUser.globalRole || token.globalRole || token.role || "client",
                tenantId: hydratedUser.tenantId,
                tenantRole: hydratedUser.tenantRole
              });
              token.portalActorId = await resolvePortalActorIdForAdminIdentity({
                accountScope: token.accountScope,
                tenantId: hydratedUser.tenantId,
                email: String(token.email || "")
              });
              token.authSource = token.authSource || "local";
            }
          } else if (isPersistentPortalIdentityEnabled() && isStaffGlobalRole(tokenGlobalRole) && token.email && (!token.accountScope || !token.portalActorId)) {
            const hydratedUser = await getLocalBootstrapAuthUserByEmail(String(token.email));
            if (hydratedUser) {
              token.userId = hydratedUser.id;
              token.globalRole = normalizeGlobalRole(String(hydratedUser.globalRole || token.globalRole || token.role || "client"));
              token.role = token.globalRole;
              token.tenantId = hydratedUser.tenantId;
              token.tenantRole = normalizeTenantRole(hydratedUser.tenantRole);
              token.partnerId = undefined;
              token.accountScope = resolveAccountScopeForIdentity({
                accountScope: hydratedUser.accountScope,
                authSource: "local",
                globalRole: hydratedUser.globalRole || token.globalRole || token.role || "client",
                tenantId: hydratedUser.tenantId,
                tenantRole: hydratedUser.tenantRole
              });
              token.portalActorId = await resolvePortalActorIdForAdminIdentity({
                accountScope: token.accountScope,
                tenantId: hydratedUser.tenantId,
                email: String(token.email || "")
              });
              token.authSource = token.authSource || "local";
            }
          }
        }

      } catch (error) {
        console.error("JWT_CALLBACK_ERROR", { msg: String(error) });
      }

      return token;
    },
    async session({ session, token }) {
      try {
        if ((token.email || session.user?.email) && !isPersistentPortalIdentityEnabled() && (!token.tenantId || !token.tenantRole)) {
          const hydratedUser = await getLocalBootstrapAuthUserByEmail(String(token.email || session.user?.email || ""));
          if (hydratedUser) {
            token.userId = hydratedUser.id;
            token.globalRole = normalizeGlobalRole(String(hydratedUser.globalRole || token.globalRole || token.role || "client"));
            token.role = token.globalRole;
            token.tenantId = hydratedUser.tenantId;
            token.tenantRole = normalizeTenantRole(hydratedUser.tenantRole);
            token.partnerId = undefined;
            token.accountScope = resolveAccountScopeForIdentity({
              accountScope: hydratedUser.accountScope,
              authSource: "local",
              globalRole: hydratedUser.globalRole || token.globalRole || token.role || "client",
              tenantId: hydratedUser.tenantId,
              tenantRole: hydratedUser.tenantRole
            });
            token.portalActorId = await resolvePortalActorIdForAdminIdentity({
              accountScope: token.accountScope,
              tenantId: hydratedUser.tenantId,
              email: String(token.email || session.user?.email || "")
            });
          }
        }

        if (session.user) {
          session.user.id = String(token.userId || "");
          session.user.globalRole = normalizeGlobalRole(String(token.globalRole || "client"));
          session.user.role = session.user.globalRole;
          session.user.tenantId = token.tenantId ? String(token.tenantId) : undefined;
          session.user.tenantRole = token.tenantRole as any;
          session.user.partnerId = token.partnerId ? String(token.partnerId) : undefined;
          session.user.accountScope = token.accountScope ? String(token.accountScope) : undefined;
          session.user.portalActorId = token.portalActorId ? String(token.portalActorId) : undefined;
        }
      } catch (error) {
        console.error("SESSION_CALLBACK_ERROR", { msg: String(error) });
      }
      return session;
    }
  }
};
