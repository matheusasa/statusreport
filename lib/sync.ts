import { prisma } from "./prisma";
import { fetchProjectWorkItems, fetchProjectIterations } from "./azure-devops";
import type { ProjectRecord } from "./projects";

/**
 * Pulls every work item for `project` from the Azure DevOps REST API and
 * replaces the project's rows in the WorkItem table with the fresh data
 * (delete + bulk insert, wrapped in a transaction so the dashboard never
 * sees a half-synced state). Also pulls each "Sprint N" iteration's
 * start/finish dates and upserts them into SprintPeriod, so the dashboard can
 * tell whether a sprint is done/current by calendar date instead of only by
 * work item state (see lib/metrics.ts). Updates Project.lastSyncedAt on
 * success.
 */
export async function syncProjectFromAzureDevOps(project: ProjectRecord): Promise<{ count: number }> {
  if (project.source !== "AZURE_DEVOPS" || !project.azureDevOpsProjectName) {
    throw new Error("Este projeto não está configurado para sincronização via Azure DevOps.");
  }

  const items = await fetchProjectWorkItems(project.azureDevOpsProjectName);

  // Iteration dates are best-effort: if Project Settings > Iterations isn't
  // configured (or the call fails for any reason), the sync should still
  // succeed and the dashboard just falls back to the item-state heuristic.
  let periods: Awaited<ReturnType<typeof fetchProjectIterations>> = [];
  try {
    periods = await fetchProjectIterations(project.azureDevOpsProjectName);
  } catch (err) {
    console.error("Failed to fetch sprint iteration dates from Azure DevOps:", err);
  }

  await prisma.$transaction([
    prisma.workItem.deleteMany({ where: { projectId: project.id } }),
    prisma.workItem.createMany({
      data: items.map((item) => ({ ...item, projectId: project.id })),
    }),
    prisma.project.update({ where: { id: project.id }, data: { lastSyncedAt: new Date() } }),
    ...periods.map((p) =>
      prisma.sprintPeriod.upsert({
        where: { projectId_sprintNumber: { projectId: project.id, sprintNumber: p.sprintNumber } },
        create: { projectId: project.id, sprintNumber: p.sprintNumber, startDate: p.startDate, endDate: p.endDate },
        update: { startDate: p.startDate, endDate: p.endDate },
      })
    ),
  ]);

  return { count: items.length };
}
