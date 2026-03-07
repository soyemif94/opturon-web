import { compareSync } from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { getAuthUserByEmail } from "@/lib/auth-store";
import type { GlobalRole } from "@/lib/saas/types";

function isProduction() {
  return String(process.env.NODE_ENV || "").toLowerCase() === "production";
}

function normalizeGlobalRole(role?: string): GlobalRole {
  const allowed: GlobalRole[] = ["superadmin", "ops_admin", "sales_rep", "support_agent", "client"];
  if (role && allowed.includes(role as GlobalRole)) return role as GlobalRole;
  return "client";
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

          const user = await getAuthUserByEmail(email);
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
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: globalRole,
            globalRole,
            tenantId: user.tenantId,
            tenantRole: user.tenantRole
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
          token.globalRole = normalizeGlobalRole((user as any).globalRole || (user as any).role);
          token.role = token.globalRole;
          token.tenantId = (user as any).tenantId;
          token.tenantRole = (user as any).tenantRole;
        }

      } catch (error) {
        console.error("JWT_CALLBACK_ERROR", { msg: String(error) });
      }

      return token;
    },
    async session({ session, token }) {
      try {
        if (session.user) {
          session.user.id = String(token.userId || "");
          session.user.globalRole = normalizeGlobalRole(String(token.globalRole || "client"));
          session.user.role = session.user.globalRole;
          session.user.tenantId = token.tenantId ? String(token.tenantId) : undefined;
          session.user.tenantRole = token.tenantRole as any;
        }
      } catch (error) {
        console.error("SESSION_CALLBACK_ERROR", { msg: String(error) });
      }
      return session;
    }
  }
};
