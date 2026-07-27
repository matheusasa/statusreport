import { prisma } from "./prisma";

export interface ProjectDates {
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

/**
 * Project-level metadata that doesn't come from Azure DevOps (start/end
 * dates, notes) — one row per Project. Returns sensible defaults if the row
 * doesn't exist yet, or if the database isn't reachable, so pages can
 * render without crashing.
 */
export async function getProjectInfo(projectId: string): Promise<ProjectDates> {
  try {
    const info = await prisma.projectInfo.findUnique({ where: { projectId } });
    if (!info) {
      return { startDate: null, endDate: null, notes: null };
    }
    return {
      startDate: info.startDate ? info.startDate.toISOString() : null,
      endDate: info.endDate ? info.endDate.toISOString() : null,
      notes: info.notes,
    };
  } catch (err) {
    console.error("Failed to load ProjectInfo:", err);
    return { startDate: null, endDate: null, notes: null };
  }
}

export async function upsertProjectInfo(
  projectId: string,
  data: { startDate: string | null; endDate: string | null; notes: string | null }
) {
  return prisma.projectInfo.upsert({
    where: { projectId },
    create: {
      projectId,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      notes: data.notes,
    },
    update: {
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      notes: data.notes,
    },
  });
}
