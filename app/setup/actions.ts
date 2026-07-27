"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * One-time bootstrap: only works while the `user` table is empty. After the
 * first admin exists, this always redirects to /login — every other
 * account must be created by an admin via /admin/users (invite-only).
 */
export async function createFirstAdminAction(formData: FormData) {
  const count = await prisma.user.count();
  if (count > 0) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 8) {
    throw new Error("Preencha nome, email e uma senha com pelo menos 8 caracteres.");
  }

  // See app/admin/users/actions.ts for why this cast is needed — Better
  // Auth's admin plugin narrows `role` to "admin" | "user" by default.
  await auth.api.createUser({
    body: { name, email, password, role: "ADMIN" as "admin" },
  });

  redirect("/login");
}
