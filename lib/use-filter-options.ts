"use client";

import { useCallback, useMemo, useState } from "react";
import { WorkItem } from "@/lib/types";

/** sprintLabel produced by lib/metrics.ts for items with no sprint. */
export const BACKLOG_LABEL = "Backlog";

/** Sentinel option used when a work item has no assignee, so "Responsável"
 * behaves like every other multi-select (unassigned items are a checkable
 * bucket instead of silently disappearing when the filter is narrowed). */
export const UNASSIGNED = "— Sem responsável —";

export function assigneeKey(item: WorkItem) {
  return item.assignee ?? UNASSIGNED;
}

/** Distinct filter-bar options derived from a portfolio's items. Sprints sort
 * naturally ("Sprint 01"…) with Backlog pushed to the end; unassigned items get
 * their own bucket so the Responsável multi-select can include/exclude them. */
export function useUniqueOptions(items: WorkItem[]) {
  return useMemo(() => {
    const sprints = Array.from(new Set(items.map((i) => i.sprintLabel))).sort((a, b) => {
      if (a === BACKLOG_LABEL) return 1;
      if (b === BACKLOG_LABEL) return -1;
      return a.localeCompare(b);
    });
    const states = Array.from(new Set(items.map((i) => i.state))).sort();
    const types = Array.from(new Set(items.map((i) => i.type))).sort();
    const assignees = Array.from(new Set(items.map((i) => i.assignee).filter((a): a is string => !!a))).sort();
    if (items.some((i) => !i.assignee)) assignees.push(UNASSIGNED);
    return { sprints, states, types, assignees };
  }, [items]);
}

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((v) => b.includes(v));
}

export interface MultiFilter {
  /** Values currently checked — what MultiSelectFilter renders. */
  selected: string[];
  setSelected: (next: string[]) => void;
  /** True when the value passes the filter. Use this in item predicates. */
  accepts: (value: string) => boolean;
  isDefault: boolean;
  reset: () => void;
}

/**
 * Multi-select filter state. Stored as the *excluded* set rather than the
 * selected one so that "everything is checked" survives the option list
 * growing — when a resync introduces a new assignee or state it shows up
 * already checked instead of being silently filtered out.
 *
 * `defaultExcluded` is the baseline (e.g. Sprint passes [BACKLOG_LABEL] so the
 * page opens with every sprint checked except Backlog).
 */
export function useMultiFilter(options: string[], defaultExcluded: string[] = []): MultiFilter {
  const [excluded, setExcluded] = useState<string[]>(defaultExcluded);

  const selected = useMemo(() => options.filter((o) => !excluded.includes(o)), [options, excluded]);

  const setSelected = useCallback(
    (next: string[]) => setExcluded(options.filter((o) => !next.includes(o))),
    [options]
  );

  const accepts = useCallback((value: string) => !excluded.includes(value), [excluded]);

  return {
    selected,
    setSelected,
    accepts,
    isDefault: sameSet(excluded, defaultExcluded),
    reset: () => setExcluded(defaultExcluded),
  };
}
