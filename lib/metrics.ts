import { loadWorkItemRows, RawRow } from "./parquet";
import { prisma } from "./prisma";
import type { ProjectRecord } from "./projects";
import { Portfolio, SprintSummary, StateGroup, WorkItem } from "./types";
import { summarizeTotals, summarizeAssignees, summarizeSprintItems } from "./portfolio-summary";

// Re-exported so existing server-side callers of lib/metrics.ts don't need to
// change their import path. Client components must import these directly
// from lib/portfolio-summary.ts instead (see that file's doc-comment for why:
// this module pulls in lib/parquet.ts, which uses Node's `fs` and breaks the
// browser bundle if a "use client" file imports anything from here).
export { summarizeTotals, summarizeAssignees, summarizeSprintItems };

const DONE_STATES = new Set(["Closed", "Resolved"]);
const ACTIVE_STATES = new Set(["In Progress", "Active", "Tests Done", "Pending Publish"]);
// Anything else (New, Refined, Technical Refinement, A Refinar, ...) is treated as "backlog" (not started).

function stateGroupOf(state: string | null): StateGroup {
  if (!state) return "backlog";
  if (DONE_STATES.has(state)) return "done";
  if (ACTIVE_STATES.has(state)) return "active";
  return "backlog";
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isNaN(n) ? null : n;
}

function toStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function parseSprintNumber(iterationPath: string | null): number | null {
  if (!iterationPath) return null;
  const match = iterationPath.match(/Sprint\s*0*(\d+)/i);
  return match ? Number(match[1]) : null;
}

// --- Loader 1: legacy project, reads straight from /data/*.parquet ---

function mapParquetRow(row: RawRow): WorkItem {
  const state = toStr(row.system_state);
  const sprintPath = toStr(row.system_iterationpath);
  const sprintNumber = parseSprintNumber(sprintPath);

  return {
    id: Number(row.work_item_id ?? row.system_id),
    type: toStr(row.system_workitemtype) ?? "Unknown",
    title: toStr(row.system_title) ?? "(sem título)",
    state: state ?? "New",
    stateGroup: stateGroupOf(state),
    priority: toNumber(row.microsoft_vsts_common_priority),
    sprintPath,
    sprintNumber,
    sprintLabel: sprintNumber !== null ? `Sprint ${String(sprintNumber).padStart(2, "0")}` : "Backlog",
    assignee: toStr(row.system_assignedto),
    points: toNumber(row.microsoft_vsts_scheduling_storypoints),
    hoursPlanned: toNumber(row.custom_horasprevistas),
    size: toStr(row.custom_tamanho),
    parentId: toNumber(row.system_parent),
    createdDate: toIso(row.system_createddate),
    changedDate: toIso(row.system_changeddate),
    stateChangedDate: toIso(row.microsoft_vsts_common_statechangedate),
    resolvedDate: toIso(row.microsoft_vsts_common_resolveddate),
    closedDate: toIso(row.microsoft_vsts_common_closeddate),
    url: toStr(row.url),
    scheduleFlag: "on-track",
    description: toStr(row.system_description),
    acceptanceCriteria: toStr(row.microsoft_vsts_common_acceptancecriteria),
    qaValidation: toStr(row.custom_qavalidationandevidence),
    poApproval: toStr(row.custom_poapproval),
    history: toStr(row.system_history),
    risk: toStr(row.microsoft_vsts_common_risk),
    valueArea: toStr(row.microsoft_vsts_common_valuearea),
    reason: toStr(row.system_reason),
    createdBy: toStr(row.system_createdby),
    changedBy: toStr(row.system_changedby),
    closedBy: toStr(row.microsoft_vsts_common_closedby),
    resolvedBy: toStr(row.microsoft_vsts_common_resolvedby),
    commentCount: toNumber(row.system_commentcount),
  };
}

async function loadItemsFromParquet(): Promise<{ items: WorkItem[]; sourceFiles: string[]; lastSyncedAt: string | null }> {
  const { rows, sourceFiles } = await loadWorkItemRows();
  const items = rows.map(mapParquetRow).sort((a, b) => a.id - b.id);
  const lastSyncedAt = items.reduce<string | null>((max, i) => {
    if (!i.changedDate) return max;
    if (!max || i.changedDate > max) return i.changedDate;
    return max;
  }, null);
  return { items, sourceFiles, lastSyncedAt };
}

// --- Loader 2: projects synced from the Azure DevOps API, read from Postgres ---

type DbWorkItemRow = Awaited<ReturnType<typeof prisma.workItem.findMany>>[number];

function mapDbRow(row: DbWorkItemRow): WorkItem {
  const state: string = row.state;
  const sprintPath: string | null = row.sprintPath;
  const sprintNumber = parseSprintNumber(sprintPath);

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    state,
    stateGroup: stateGroupOf(state),
    priority: row.priority,
    sprintPath,
    sprintNumber,
    sprintLabel: sprintNumber !== null ? `Sprint ${String(sprintNumber).padStart(2, "0")}` : "Backlog",
    assignee: row.assignee,
    points: row.points,
    hoursPlanned: row.hoursPlanned,
    size: row.size,
    parentId: row.parentId,
    createdDate: row.createdDate ? new Date(row.createdDate).toISOString() : null,
    changedDate: row.changedDate ? new Date(row.changedDate).toISOString() : null,
    stateChangedDate: row.stateChangedDate ? new Date(row.stateChangedDate).toISOString() : null,
    resolvedDate: row.resolvedDate ? new Date(row.resolvedDate).toISOString() : null,
    closedDate: row.closedDate ? new Date(row.closedDate).toISOString() : null,
    url: row.url,
    scheduleFlag: "on-track",
    description: row.description,
    acceptanceCriteria: row.acceptanceCriteria,
    qaValidation: row.qaValidation,
    poApproval: row.poApproval,
    history: row.history,
    risk: row.risk,
    valueArea: row.valueArea,
    reason: row.reason,
    createdBy: row.createdBy,
    changedBy: row.changedBy,
    closedBy: row.closedBy,
    resolvedBy: row.resolvedBy,
    commentCount: row.commentCount,
  };
}

async function loadItemsFromDb(
  project: ProjectRecord
): Promise<{ items: WorkItem[]; sourceFiles: string[]; lastSyncedAt: string | null }> {
  const rows = await prisma.workItem.findMany({ where: { projectId: project.id } });
  const items = rows.map(mapDbRow).sort((a: WorkItem, b: WorkItem) => a.id - b.id);
  const lastSyncedAt = project.lastSyncedAt ? new Date(project.lastSyncedAt).toISOString() : null;
  return { items, sourceFiles: [], lastSyncedAt };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Sprint calendar dates, synced from Azure DevOps iterations (see
 * lib/azure-devops.ts#fetchProjectIterations and lib/sync.ts). Keyed by
 * sprintNumber; missing entries mean "no dates synced for this sprint". */
export type SprintPeriodMap = Map<number, { startDate: Date | null; endDate: Date | null }>;

/**
 * Pure aggregation step, independent of where the items came from: computes
 * sprint summaries, the "current sprint", per-item schedule flags, totals
 * and workload by assignee.
 *
 * When `periods` has start/end dates for a sprint, that sprint's phase
 * ("concluida"/"andamento"/"planejada") and whether it's the current sprint
 * are decided by calendar date (today vs. start/end) rather than by the
 * state of its work items — this is what the user actually experiences
 * ("a sprint acabou" independent of whether every item was formally closed).
 * Sprints without synced dates (or legacy PARQUET projects, which never have
 * any) fall back to the original item-state heuristic.
 */
function buildPortfolio(
  items: WorkItem[],
  sourceFiles: string[],
  lastSyncedAt: string | null,
  periods: SprintPeriodMap = new Map()
): Portfolio {
  const now = new Date();

  // --- Sprint aggregation (first pass, without schedule flags) ---
  const sprintNumbers = Array.from(
    new Set(items.map((i) => i.sprintNumber).filter((n): n is number => n !== null))
  ).sort((a, b) => a - b);

  const sprintsRaw = sprintNumbers.map((num) => {
    const sprintItems = items.filter((i) => i.sprintNumber === num);
    const doneItems = sprintItems.filter((i) => i.stateGroup === "done").length;
    const activeItems = sprintItems.filter((i) => i.stateGroup === "active").length;
    const backlogItems = sprintItems.filter((i) => i.stateGroup === "backlog").length;
    const totalPoints = sprintItems.reduce((sum, i) => sum + (i.points ?? 0), 0);
    const donePoints = sprintItems
      .filter((i) => i.stateGroup === "done")
      .reduce((sum, i) => sum + (i.points ?? 0), 0);
    const pctDoneByItems = sprintItems.length ? round1((doneItems / sprintItems.length) * 100) : 0;

    const period = periods.get(num);
    const hasFullPeriod = !!(period?.startDate && period?.endDate);

    let phase: SprintSummary["phase"];
    if (hasFullPeriod) {
      const start = period!.startDate as Date;
      const end = period!.endDate as Date;
      if (now > end) phase = "concluida";
      else if (now < start) phase = "planejada";
      else phase = "andamento";
    } else {
      phase = "planejada";
      if (sprintItems.length > 0 && doneItems === sprintItems.length) phase = "concluida";
      else if (doneItems > 0 || activeItems > 0) phase = "andamento";
    }

    return {
      sprintNumber: num,
      totalItems: sprintItems.length,
      doneItems,
      activeItems,
      backlogItems,
      totalPoints,
      donePoints,
      pctDoneByItems,
      phase,
      startDate: period?.startDate ?? null,
      endDate: period?.endDate ?? null,
      hasFullPeriod,
    };
  });

  // The "current" sprint: prefer the sprint whose synced start/end dates
  // actually contain today. Only fall back to the item-state heuristic when
  // no sprint has usable date data (or none of the dated sprints contain
  // today, e.g. a gap between sprints) — see doc-comment above.
  const datedSprints = sprintsRaw.filter((s) => s.hasFullPeriod);
  const currentByDate = datedSprints.find(
    (s) => now >= (s.startDate as Date) && now <= (s.endDate as Date)
  );

  let currentSprintNumber: number | null;
  if (currentByDate) {
    currentSprintNumber = currentByDate.sprintNumber;
  } else if (datedSprints.length > 0) {
    // No sprint's range contains today (e.g. between sprints). Prefer the
    // nearest upcoming one; otherwise the most recently concluded one.
    const upcoming = datedSprints.find((s) => (s.startDate as Date) > now);
    const pastOnes = datedSprints.filter((s) => (s.endDate as Date) < now);
    currentSprintNumber = upcoming
      ? upcoming.sprintNumber
      : pastOnes.length
      ? pastOnes[pastOnes.length - 1].sprintNumber
      : null;
  } else {
    // No date data at all — original heuristic: the highest-numbered sprint
    // with at least one item actively being worked on (more reliable than
    // "first incomplete sprint ascending", since stale/abandoned items left
    // behind in old sprints would otherwise make a dead sprint look current).
    const sprintsWithActiveWork = sprintsRaw.filter((s) => s.activeItems > 0);
    const firstIncomplete = sprintsRaw.find((s) => s.phase !== "concluida");
    currentSprintNumber = sprintsWithActiveWork.length
      ? sprintsWithActiveWork[sprintsWithActiveWork.length - 1].sprintNumber
      : firstIncomplete
      ? firstIncomplete.sprintNumber
      : sprintsRaw.length
      ? sprintsRaw[sprintsRaw.length - 1].sprintNumber
      : null;
  }

  // --- Second pass: compute schedule flags now that we know the current sprint ---
  for (const item of items) {
    if (item.sprintNumber === null || currentSprintNumber === null) {
      item.scheduleFlag = "on-track";
    } else if (item.sprintNumber < currentSprintNumber && item.stateGroup !== "done") {
      item.scheduleFlag = "late";
    } else if (item.stateGroup === "done" && item.sprintNumber > currentSprintNumber) {
      item.scheduleFlag = "ahead";
    } else {
      item.scheduleFlag = "on-track";
    }
  }

  const sprints: SprintSummary[] = sprintsRaw.map((s) => {
    const sprintItems = items.filter((i) => i.sprintNumber === s.sprintNumber);
    return {
      sprintNumber: s.sprintNumber,
      label: `Sprint ${String(s.sprintNumber).padStart(2, "0")}`,
      totalItems: s.totalItems,
      doneItems: s.doneItems,
      activeItems: s.activeItems,
      backlogItems: s.backlogItems,
      totalPoints: s.totalPoints,
      donePoints: s.donePoints,
      pendingPoints: round1(s.totalPoints - s.donePoints),
      pctDoneByPoints: s.totalPoints ? round1((s.donePoints / s.totalPoints) * 100) : 0,
      pctDoneByItems: s.pctDoneByItems,
      lateItems: sprintItems.filter((i) => i.scheduleFlag === "late").length,
      aheadItems: sprintItems.filter((i) => i.scheduleFlag === "ahead").length,
      phase: s.phase,
      isCurrent: s.sprintNumber === currentSprintNumber,
      startDate: s.startDate ? s.startDate.toISOString() : null,
      endDate: s.endDate ? s.endDate.toISOString() : null,
      datesFromSchedule: s.hasFullPeriod,
    };
  });

  const backlog = items.filter((i) => i.sprintNumber === null);

  return {
    items,
    sprints,
    currentSprintNumber,
    backlog,
    totals: summarizeTotals(items),
    assignees: summarizeAssignees(items),
    lastSyncedAt,
    sourceFiles,
  };
}

// summarizeTotals/summarizeAssignees/summarizeSprintItems now live in
// lib/portfolio-summary.ts (imported and re-exported above) so that client
// components can use them without pulling in this file's Node-only
// dependencies (lib/parquet.ts's `fs` import, Prisma).

/**
 * Loads the synced Sprint N start/finish dates for `project` (empty for
 * PARQUET/legacy projects, which have no SprintPeriod rows). Degrades to an
 * empty map if the table isn't reachable yet, so pages keep working off the
 * item-state heuristic instead of crashing.
 */
async function loadSprintPeriods(project: ProjectRecord): Promise<SprintPeriodMap> {
  if (project.source !== "AZURE_DEVOPS") return new Map();
  try {
    const rows = await prisma.sprintPeriod.findMany({ where: { projectId: project.id } });
    const map: SprintPeriodMap = new Map();
    for (const row of rows) {
      map.set(row.sprintNumber, { startDate: row.startDate, endDate: row.endDate });
    }
    return map;
  } catch (err) {
    console.error("Failed to load SprintPeriod rows:", err);
    return new Map();
  }
}

/**
 * Loads and aggregates the full portfolio for `project`. Projects with
 * source=PARQUET read straight from /data/*.parquet (the original,
 * file-based flow); projects with source=AZURE_DEVOPS read the rows last
 * written to Postgres by the "Sincronizar" action (lib/sync.ts), plus each
 * sprint's synced start/finish dates (used for calendar-accurate
 * concluded/current status — see buildPortfolio above).
 */
export async function getPortfolio(project: ProjectRecord): Promise<Portfolio> {
  const [{ items, sourceFiles, lastSyncedAt }, periods] = await Promise.all([
    project.source === "AZURE_DEVOPS" ? loadItemsFromDb(project) : loadItemsFromParquet(),
    loadSprintPeriods(project),
  ]);
  return buildPortfolio(items, sourceFiles, lastSyncedAt, periods);
}

export interface WorkItemDetail {
  item: WorkItem;
  parent: WorkItem | null;
  children: WorkItem[];
  sprint: SprintSummary | null;
}

/**
 * Loads a single work item by id, along with its parent and children
 * (resolved via system_parent) and the summary of the sprint it belongs to.
 * Returns null when the id doesn't exist in the project's current dataset.
 */
export async function getWorkItemDetail(project: ProjectRecord, id: number): Promise<WorkItemDetail | null> {
  const portfolio = await getPortfolio(project);
  const item = portfolio.items.find((i) => i.id === id);
  if (!item) return null;

  const parent = item.parentId ? portfolio.items.find((i) => i.id === item.parentId) ?? null : null;
  const children = portfolio.items.filter((i) => i.parentId === item.id).sort((a, b) => a.id - b.id);
  const sprint = item.sprintNumber !== null ? portfolio.sprints.find((s) => s.sprintNumber === item.sprintNumber) ?? null : null;

  return { item, parent, children, sprint };
}
