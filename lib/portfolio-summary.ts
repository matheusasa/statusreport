import { Portfolio, WorkItem } from "./types";

/**
 * Pure, client-safe aggregation helpers used both by lib/metrics.ts
 * (server-side, full portfolio build) and by the client-side filter bars
 * (components/DashboardExplorer.tsx, components/SprintsExplorer.tsx) to
 * recompute KPIs/workload/sprint stats for an arbitrary filtered subset of
 * items without re-hitting the server.
 *
 * This file must stay free of any Node-only or server-only imports (no
 * lib/parquet.ts, no lib/prisma.ts) — it's imported directly by "use client"
 * components, and pulling in `fs`/Prisma here breaks the browser bundle
 * (see the "Module not found: Can't resolve 'fs'" build error this file
 * fixes). lib/metrics.ts re-exports these for convenience on the server.
 */

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Recomputes the KPI totals block for an arbitrary subset of items (already
 * carrying their scheduleFlag/stateGroup from lib/metrics.ts#buildPortfolio). */
export function summarizeTotals(items: WorkItem[]): Portfolio["totals"] {
  const totalPoints = items.reduce((sum, i) => sum + (i.points ?? 0), 0);
  const donePoints = items.filter((i) => i.stateGroup === "done").reduce((sum, i) => sum + (i.points ?? 0), 0);
  const doneItemsCount = items.filter((i) => i.stateGroup === "done").length;
  const activeItemsCount = items.filter((i) => i.stateGroup === "active").length;
  const backlogItemsCount = items.filter((i) => i.stateGroup === "backlog").length;

  return {
    totalItems: items.length,
    doneItems: doneItemsCount,
    activeItems: activeItemsCount,
    backlogItems: backlogItemsCount,
    totalPoints: round1(totalPoints),
    donePoints: round1(donePoints),
    pendingPoints: round1(totalPoints - donePoints),
    lateItems: items.filter((i) => i.scheduleFlag === "late").length,
    aheadItems: items.filter((i) => i.scheduleFlag === "ahead").length,
    onTrackItems: items.filter((i) => i.scheduleFlag === "on-track").length,
    pctDoneByPoints: totalPoints ? round1((donePoints / totalPoints) * 100) : 0,
    pctDoneByItems: items.length ? round1((doneItemsCount / items.length) * 100) : 0,
  };
}

/** Recomputes workload-by-assignee for an arbitrary subset of items. */
export function summarizeAssignees(items: WorkItem[]): Portfolio["assignees"] {
  const assigneeMap = new Map<string, { total: number; done: number; active: number; late: number; points: number }>();
  for (const item of items) {
    const name = item.assignee ?? "Não atribuído";
    const entry = assigneeMap.get(name) ?? { total: 0, done: 0, active: 0, late: 0, points: 0 };
    entry.total += 1;
    if (item.stateGroup === "done") entry.done += 1;
    if (item.stateGroup === "active") entry.active += 1;
    if (item.scheduleFlag === "late") entry.late += 1;
    if (item.stateGroup !== "done") entry.points += item.points ?? 0;
    assigneeMap.set(name, entry);
  }
  return Array.from(assigneeMap.entries())
    .map(([name, v]) => ({ name, ...v, points: round1(v.points) }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Recomputes a single sprint's item-count/point stats (everything except
 * phase/isCurrent/dates, which are properties of the sprint itself and don't
 * change when the item set is filtered) for an arbitrary subset of items
 * already known to belong to that sprint.
 */
export function summarizeSprintItems(sprintItems: WorkItem[]) {
  const doneItems = sprintItems.filter((i) => i.stateGroup === "done").length;
  const activeItems = sprintItems.filter((i) => i.stateGroup === "active").length;
  const backlogItems = sprintItems.filter((i) => i.stateGroup === "backlog").length;
  const totalPoints = sprintItems.reduce((sum, i) => sum + (i.points ?? 0), 0);
  const donePoints = sprintItems.filter((i) => i.stateGroup === "done").reduce((sum, i) => sum + (i.points ?? 0), 0);
  return {
    totalItems: sprintItems.length,
    doneItems,
    activeItems,
    backlogItems,
    totalPoints: round1(totalPoints),
    donePoints: round1(donePoints),
    pendingPoints: round1(totalPoints - donePoints),
    pctDoneByPoints: totalPoints ? round1((donePoints / totalPoints) * 100) : 0,
    pctDoneByItems: sprintItems.length ? round1((doneItems / sprintItems.length) * 100) : 0,
    lateItems: sprintItems.filter((i) => i.scheduleFlag === "late").length,
    aheadItems: sprintItems.filter((i) => i.scheduleFlag === "ahead").length,
  };
}
