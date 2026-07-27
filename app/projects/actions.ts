"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createProject, deleteProject, getProject, grantProjectAccess, listAccessibleProjects } from "@/lib/projects";
import { syncProjectFromAzureDevOps } from "@/lib/sync";
import { deleteFromS3 } from "@/lib/s3";
import { prisma } from "@/lib/prisma";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/active-project";
import { requireAdmin, requireManager, requireUser } from "@/lib/session";

export async function createProjectAction(formData: FormData) {
  const user = await requireManager();

  const name = String(formData.get("name") ?? "").trim();
  const azureDevOpsProjectName = String(formData.get("azureDevOpsProjectName") ?? "").trim();

  if (!name || !azureDevOpsProjectName) {
    throw new Error("Nome do projeto e nome no Azure DevOps são obrigatórios.");
  }

  const project = await createProject({ name, azureDevOpsProjectName });

  // Managers only see projects they're explicitly linked to, same as
  // clients — so a manager who creates a project needs to be granted access
  // to it, or it would immediately vanish from their own project list.
  if (user.role !== "ADMIN") {
    await grantProjectAccess(user.id, project.id);
  }

  // Switch to the newly created project right away so the manager lands on
  // its (still empty) dashboard and can hit "Sincronizar".
  cookies().set(ACTIVE_PROJECT_COOKIE, project.id, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  revalidatePath("/projects");
  redirect("/projects");
}

export async function syncProjectAction(projectId: string) {
  await requireManager();

  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Projeto não encontrado.");
  }

  await syncProjectFromAzureDevOps(project);

  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath("/sprints");
  revalidatePath("/work-items");
}

/**
 * Permanently deletes a project — admin-only, since it wipes out every
 * meeting/attachment/date recorded for it (cascade delete in the DB), not
 * just the synced work items. S3 objects aren't touched by the DB cascade,
 * so we clean those up here before removing the row.
 */
export async function deleteProjectAction(projectId: string) {
  await requireAdmin();

  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Projeto não encontrado.");
  }

  const meetings = await prisma.meeting.findMany({
    where: { projectId },
    include: { attachments: true },
  });
  for (const meeting of meetings) {
    for (const att of meeting.attachments) {
      try {
        await deleteFromS3(att.filePath);
      } catch (err) {
        console.error("Failed to remove attachment from S3:", err);
      }
    }
  }

  await deleteProject(projectId);

  // If this was the active project, clear the cookie so the app falls back
  // to picking the first remaining accessible project instead of pointing
  // at an id that no longer exists.
  const activeId = cookies().get(ACTIVE_PROJECT_COOKIE)?.value;
  if (activeId === projectId) {
    cookies().delete(ACTIVE_PROJECT_COOKIE);
  }

  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath("/sprints");
  revalidatePath("/work-items");
  revalidatePath("/agenda");
}

export async function setActiveProjectAction(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;

  // Only allow switching to a project this user can actually see — the
  // dropdown itself only lists accessible projects, but a client could
  // still forge the request, so re-validate server-side.
  const accessible = await listAccessibleProjects(user);
  if (!accessible.some((p: { id: string }) => p.id === projectId)) return;

  cookies().set(ACTIVE_PROJECT_COOKIE, projectId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/");
  redirect("/");
}
