"use server";

import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/session";

const ROLES = ["ADMIN", "MANAGER", "CLIENT"] as const;
type Role = (typeof ROLES)[number];

function parseRole(value: FormDataEntryValue | null): Role {
  return ROLES.includes(value as Role) ? (value as Role) : "CLIENT";
}

export async function inviteUserAction(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = parseRole(formData.get("role"));
  const projectIds = formData.getAll("projectIds").map(String);

  if (!name || !email) {
    throw new Error("Nome e email são obrigatórios.");
  }

  // Never told to the user — createUser requires a password, but the real
  // one is set by the recipient via the "set your password" email below.
  const tempPassword = `${randomUUID()}${randomUUID()}`;

  // Better Auth's admin plugin types `role` as "admin" | "user" unless a
  // full access-control `roles` config is supplied. The database column
  // (and the plugin's own runtime validation) is a plain string, so this
  // app's three roles (ADMIN/MANAGER/CLIENT — see lib/session.ts) are safe
  // to pass through; the cast only works around the narrower TS type.
  const created = await auth.api.createUser({
    body: { name, email, password: tempPassword, role: role as "admin" },
  });

  if (role !== "ADMIN" && projectIds.length > 0) {
    await prisma.clientProjectAccess.createMany({
      data: projectIds.map((projectId) => ({ userId: created.user.id, projectId })),
      skipDuplicates: true,
    });
  }

  await auth.api.requestPasswordReset({
    body: { email, redirectTo: "/reset-password" },
  });

  revalidatePath("/admin/users");
}

export async function resendSetPasswordAction(email: string) {
  await requireAdmin();
  await auth.api.requestPasswordReset({
    body: { email, redirectTo: "/reset-password" },
  });
}

export async function updateRoleAction(userId: string, formData: FormData) {
  await requireAdmin();
  const role = parseRole(formData.get("role"));

  await auth.api.setRole({
    body: { userId, role: role as "admin" },
    headers: headers(),
  });

  revalidatePath("/admin/users");
}

export async function toggleBanAction(userId: string, currentlyBanned: boolean) {
  await requireAdmin();

  if (currentlyBanned) {
    await auth.api.unbanUser({ body: { userId }, headers: headers() });
  } else {
    await auth.api.banUser({
      body: { userId, banReason: "Bloqueado por um administrador." },
      headers: headers(),
    });
  }

  revalidatePath("/admin/users");
}

export async function updateProjectAccessAction(userId: string, formData: FormData) {
  await requireAdmin();
  const projectIds = formData.getAll("projectIds").map(String);

  await prisma.$transaction([
    prisma.clientProjectAccess.deleteMany({ where: { userId } }),
    prisma.clientProjectAccess.createMany({
      data: projectIds.map((projectId) => ({ userId, projectId })),
      skipDuplicates: true,
    }),
  ]);

  revalidatePath("/admin/users");
}
