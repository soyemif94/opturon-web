import { compareSync } from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

function isProduction() {
  return String(process.env.NODE_ENV || "").toLowerCase() === "production";
}

function validatePassword(inputPassword: string, rawPassword?: string, hash?: string) {
  if (hash) {
    return compareSync(inputPassword, hash);
  }
  if (rawPassword) {
    return inputPassword === rawPassword;
  }
  return false;
}

export const authOptions: NextAuthOptions = {
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
        const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
        const adminPassword = String(process.env.ADMIN_PASSWORD || "");
        const adminPasswordHash = String(process.env.ADMIN_PASSWORD_HASH || "");
        const prod = isProduction();

        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");

        if (!adminEmail || !email || !password) {
          return null;
        }

        if (email !== adminEmail) {
          return null;
        }

        if (prod && !adminPasswordHash) {
          console.error("[AUTH] Missing ADMIN_PASSWORD_HASH in production");
          return null;
        }

        const passwordOk = validatePassword(password, prod ? undefined : adminPassword, adminPasswordHash || undefined);
        if (!passwordOk) {
          return null;
        }

        return {
          id: "admin",
          email: adminEmail,
          name: "Opturon Admin"
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = String(token.role || "admin");
      }
      return session;
    }
  }
};
