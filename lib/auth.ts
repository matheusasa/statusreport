import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";
import { sendPasswordResetEmail } from "./email";

/**
 * Email/password auth only, no public sign-up: accounts are created by an
 * admin (see app/admin/users/actions.ts#inviteUserAction), which immediately
 * triggers the same "set your password" email as a normal password reset.
 *
 * Roles (admin plugin's `role` field) mirror the Prisma `UserRole` enum:
 * ADMIN | MANAGER | CLIENT. Only ADMIN counts as an "admin" for the plugin's
 * own permission checks (ban/impersonate/create-user/set-role/...).
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    // No public sign-up: accounts only come from an admin invite
    // (app/admin/users/actions.ts) or the one-time /setup bootstrap, both of
    // which call auth.api.createUser directly rather than this endpoint.
    disableSignUp: true,
    autoSignIn: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, user.name, url);
    },
  },
  plugins: [
    admin({
      defaultRole: "CLIENT",
      adminRoles: ["ADMIN"],
    }),
    // Must be the last plugin: lets server actions calling auth.api.* set
    // cookies directly via next/headers instead of returning them manually.
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
