import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

/**
 * Better Auth's admin plugin only narrows its TS types to "admin" | "user"
 * unless you configure a full access-control `roles` map — since this app
 * does its own authorization (see requireManager/requireAdmin below) rather
 * than Better Auth's permission system, we keep the plugin config simple and
 * instead normalize the session user into our own three-role shape here.
 * The database column is a plain string (Prisma `UserRole` enum), so this is
 * just a TypeScript-level normalization, not a runtime constraint.
 */
export type Role = "ADMIN" | "MANAGER" | "CLIENT";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

function toAppUser(user: { id: string; name: string; email: string; role?: string | null }): AppUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: (user.role as Role | undefined) ?? "CLIENT",
  };
}

/**
 * Real session check (unlike the cookie-presence check in middleware.ts) —
 * hits the database to confirm the session is still valid and returns the
 * full user record (including the admin plugin's `role`/`banned` fields).
 */
export async function getSession() {
  return auth.api.getSession({ headers: headers() });
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await getSession();
  return session?.user ? toAppUser(session.user) : null;
}

/** Redirects to /login if there's no valid session. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Admin or Manager only — throws (caught by Next's error boundary) otherwise. */
export async function requireManager(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    throw new Error("Você não tem permissão para realizar esta ação.");
  }
  return user;
}

/** Admin only. */
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("Apenas administradores podem realizar esta ação.");
  }
  return user;
}
