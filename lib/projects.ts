import { prisma } from "./prisma";

/** Stable id for the original project, whose data still comes from /data/*.parquet. */
export const LEGACY_PROJECT_ID = "legacy-altana";

function legacyProjectFallback() {
  return {
    id: LEGACY_PROJECT_ID,
    name: "Altana - Datalake",
    source: "PARQUET" as const,
    azureDevOpsProjectName: null as string | null,
    lastSyncedAt: null as Date | null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

async function ensureLegacyProject() {
  try {
    return await prisma.project.upsert({
      where: { id: LEGACY_PROJECT_ID },
      create: { id: LEGACY_PROJECT_ID, name: "Altana - Datalake", source: "PARQUET" },
      update: {},
    });
  } catch (err) {
    // Database not reachable/migrated yet — degrade gracefully so pages can
    // still render using the parquet-backed legacy project.
    console.error("Failed to ensure legacy project:", err);
    return legacyProjectFallback();
  }
}

/**
 * Lists every project the app knows about. Always includes at least the
 * legacy parquet-backed project — it's created on first access if the
 * `projects` table is empty (e.g. right after `prisma migrate`).
 */
export async function listProjects() {
  try {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: "asc" } });
    if (projects.length === 0) {
      return [await ensureLegacyProject()];
    }
    return projects;
  } catch (err) {
    console.error("Failed to list projects:", err);
    return [legacyProjectFallback()];
  }
}

export type ProjectRecord = Awaited<ReturnType<typeof listProjects>>[number];

export async function getProject(id: string): Promise<ProjectRecord | null> {
  const projects = await listProjects();
  return projects.find((p: ProjectRecord) => p.id === id) ?? null;
}

export async function createProject(input: { name: string; azureDevOpsProjectName: string }) {
  return prisma.project.create({
    data: {
      name: input.name,
      source: "AZURE_DEVOPS",
      azureDevOpsProjectName: input.azureDevOpsProjectName,
    },
  });
}

/**
 * Permanently removes a project. Cascade delete (see prisma/schema.prisma)
 * takes care of its WorkItem/Meeting/ProjectInfo/ClientProjectAccess rows,
 * but NOT the S3 objects behind meeting attachments — callers must clean
 * those up first (see app/projects/actions.ts#deleteProjectAction). If this
 * was the legacy PARQUET project and no other project remains, it will be
 * silently recreated the next time listProjects() runs (see
 * ensureLegacyProject above) — the .parquet files in /data are never
 * touched by this function.
 */
export async function deleteProject(id: string): Promise<void> {
  await prisma.project.delete({ where: { id } });
}

/**
 * Projects visible to `user`: only admins see every project automatically.
 * Managers and clients alike only see projects an admin (or the manager
 * themselves, at creation time) explicitly linked them to via
 * ClientProjectAccess. This is the ONLY entry point pages should use to
 * decide what a given user may look at — lib/active-project.ts re-validates
 * against this list on every request, so even a tampered cookie can't leak
 * another project's data.
 */
export async function listAccessibleProjects(user: { id: string; role: string }): Promise<ProjectRecord[]> {
  if (user.role === "ADMIN") {
    return listProjects();
  }
  try {
    const access = await prisma.clientProjectAccess.findMany({
      where: { userId: user.id },
      include: { project: true },
    });
    return access.map((a: { project: ProjectRecord }) => a.project);
  } catch (err) {
    console.error("Failed to list accessible projects for user:", err);
    return [];
  }
}

/** Grants `user` access to `projectId`, if they don't already have it. */
export async function grantProjectAccess(userId: string, projectId: string): Promise<void> {
  await prisma.clientProjectAccess.upsert({
    where: { userId_projectId: { userId, projectId } },
    create: { userId, projectId },
    update: {},
  });
}

export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Everyone who could plausibly attend a meeting for `projectId`: every Admin
 * (they always have access) plus any Manager/Client explicitly linked to
 * this project. Powers the participant picker in components/MeetingForm.tsx.
 */
export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  try {
    const [admins, linked]: [ProjectMember[], ProjectMember[]] = await Promise.all([
      prisma.user.findMany({
        where: { role: "ADMIN", banned: { not: true } },
        select: { id: true, name: true, email: true, role: true },
      }),
      prisma.user.findMany({
        where: { banned: { not: true }, projectAccess: { some: { projectId } } },
        select: { id: true, name: true, email: true, role: true },
      }),
    ]);
    const byId = new Map<string, ProjectMember>();
    for (const u of [...admins, ...linked]) byId.set(u.id, u);
    return Array.from(byId.values()).sort((a: ProjectMember, b: ProjectMember) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("Failed to list project members:", err);
    return [];
  }
}
