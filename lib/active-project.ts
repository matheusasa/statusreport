import { cookies } from "next/headers";
import { listAccessibleProjects, ProjectRecord } from "./projects";

/** Cookie that remembers which project the user last selected. */
export const ACTIVE_PROJECT_COOKIE = "activeProjectId";

/**
 * Resolves the "active" project for the current request, scoped to what
 * `user` is allowed to see (lib/projects.ts#listAccessibleProjects). Reads
 * the `activeProjectId` cookie but only honors it if it points at a project
 * the user actually has access to — otherwise falls back to their first
 * accessible project. Returns null if the user has no accessible projects
 * at all (e.g. a client not yet linked to any project).
 */
export async function getActiveProject(user: { id: string; role: string }): Promise<ProjectRecord | null> {
  const projects = await listAccessibleProjects(user);
  if (projects.length === 0) return null;

  const activeId = cookies().get(ACTIVE_PROJECT_COOKIE)?.value;
  const found = activeId ? projects.find((p: ProjectRecord) => p.id === activeId) : undefined;
  return found ?? projects[0];
}
