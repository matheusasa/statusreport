import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { defaultAc, adminAc, userAc } from "better-auth/plugins/admin/access";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";
import { sendPasswordResetEmail } from "./email";

/**
 * Better Auth's admin plugin gates ban/impersonate/set-role/etc. through its
 * own access-control roles map (`hasPermission` in
 * better-auth/dist/plugins/admin/has-permission.mjs), which is *separate*
 * from the `adminRoles` option below — `adminRoles` only decides who counts
 * as an "admin target" (e.g. for impersonation escalation checks), not who's
 * allowed to call these endpoints. Without a custom `roles` map, it falls
 * back to defaultRoles = { admin: adminAc, user: userAc } (lowercase keys).
 * Our Prisma `UserRole` enum is uppercase (ADMIN/MANAGER/CLIENT), so
 * `acRoles["ADMIN"]` was always undefined and every ban/setRole/impersonate
 * call was silently denied — even for real admins. Mapping our actual role
 * strings to the plugin's built-in role objects fixes that. This only
 * affects Better Auth's own permission layer for this app's local user
 * table; it doesn't reach outside ProjectStatusReport.
 */
const managerAc = defaultAc.newRole({ user: [], session: [] });

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
      roles: {
        ADMIN: adminAc,
        MANAGER: managerAc,
        CLIENT: userAc,
      },
    }),
    // Must be the last plugin: lets server actions calling auth.api.* set
    // cookies directly via next/headers instead of returning them manually.
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
