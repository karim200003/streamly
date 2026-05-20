import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginLimiter, getClientIp } from "@/lib/rate-limit";

const googleEnabled = !!(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [
    ...(googleEnabled ? [Google] : []),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds, request) {
        const ip = getClientIp(request as unknown as Request);
        const rl = await loginLimiter.limit(ip);
        if (!rl.success) return null;

        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password) return null;
        if (user.banned) return null;
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;
        // NOTE: auto-promotion to ADMIN intentionally does NOT happen on
        // the Credentials path. Anyone can `POST /api/register` with any
        // email (no verification today), so promoting on credentials
        // login would let an attacker pre-register an admin's email and
        // gain ADMIN on first login. Promotion only fires on OAuth in
        // the jwt callback below.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Block banned users (covers OAuth path, where authorize() doesn't fire)
      if (!user?.email) return true;
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
      });
      if (dbUser?.banned) return false;
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      // First call after sign-in
      if (user) {
        token.id = (user as { id: string }).id;
      }
      // Hydrate role on every issuance from DB so promotions/demotions
      // and bans take effect on the next request without re-login.
      if (token.id && (trigger === "signIn" || trigger === "update" || !token.role)) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, banned: true, email: true, emailVerified: true },
        });
        if (fresh) {
          if (fresh.banned) return null; // forces sign-out
          token.role = fresh.role;
          // Auto-promote ONLY on OAuth sign-in to a verified email. This
          // blocks the credentials-pre-registration takeover: an attacker
          // who registers an admin's email via /api/register has
          // emailVerified=null and account.type !== "oauth", so they
          // never get promoted. The legitimate admin signing in via
          // Google (which sets emailVerified) is promoted normally.
          const isOAuthSignIn =
            trigger === "signIn" && account?.type === "oauth";
          if (
            isOAuthSignIn &&
            fresh.emailVerified &&
            isAdminEmail(fresh.email) &&
            fresh.role !== "ADMIN"
          ) {
            await prisma.user.update({
              where: { id: token.id as string },
              data: { role: "ADMIN" },
            });
            token.role = "ADMIN";
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id as string;
        if (token.role) session.user.role = token.role as "USER" | "ADMIN";
      }
      return session;
    },
  },
});
