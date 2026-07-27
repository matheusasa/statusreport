import { prisma } from "./prisma";
import { fetchProjectWorkItems } from "./azure-devops";
import type { ProjectRecord } from "./projects";

/**
 * Pulls every work item for `project` from the Azure DevOps REST API and
 * replaces the project's rows in the WorkItem table with the fresh data
 * (delete + bulk insert, wrapped in a transaction so the dashboard never
 * sees a half-synced state). Updates Project.lastSyncedAt on success.
 */
export async function syncProjectFromAzureDevOps(project: ProjectRecord): Promise<{ count: number }> {
  if (project.source !== "AZURE_DEVOPS" || !project.azureDevOpsProjectName) {
    throw new Error("Este projeto não está configurado para sincronização via Azure DevOps.");
  }

  const items = await fetchProjectWorkItems(project.azureDevOpsProjectName);

  await prisma.$transaction([
    prisma.workItem.deleteMany({ where: { projectId: project.id } }),
    prisma.workItem.createMany({
      data: items.map((item) => ({ ...item, projectId: project.id })),
    }),
    prisma.project.update({ where: { id: project.id }, data: { lastSyncedAt: new Date() } }),
  ]);

  return { count: items.length };
}
