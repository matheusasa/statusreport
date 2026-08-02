"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { WorkItem } from "@/lib/types";
import { StatusPill, SchedulePill } from "./StatusPill";
import { MultiSelectFilter } from "./SelectFilter";
import { formatDate } from "@/lib/format";
import { useUniqueOptions, useMultiFilter, assigneeKey, BACKLOG_LABEL } from "@/lib/use-filter-options";

const SCHEDULE_LABEL: Record<string, string> = {
  late: "Atrasado",
  ahead: "Adiantado",
  "on-track": "No prazo",
};

/** The Prazo filter checkboxes are labelled, so we filter on labels and map
 * item.scheduleFlag through SCHEDULE_LABEL to compare. */
const SCHEDULE_OPTIONS = Object.values(SCHEDULE_LABEL);

export function WorkItemsExplorer({ items }: { items: WorkItem[] }) {
  const searchParams = useSearchParams();
  const { sprints, states, types, assignees } = useUniqueOptions(items);

  // ?schedule=late (deep link from the dashboard) opens with only that value
  // checked; otherwise every filter opens fully checked, except Sprint which
  // opens with everything but Backlog.
  const scheduleFromUrl = searchParams.get("schedule");
  const scheduleDefaultExcluded =
    scheduleFromUrl && SCHEDULE_LABEL[scheduleFromUrl]
      ? SCHEDULE_OPTIONS.filter((l) => l !== SCHEDULE_LABEL[scheduleFromUrl])
      : [];

  const [search, setSearch] = useState("");
  const sprintFilter = useMultiFilter(sprints, [BACKLOG_LABEL]);
  const stateFilter = useMultiFilter(states);
  const typeFilter = useMultiFilter(types);
  const assigneeFilter = useMultiFilter(assignees);
  const scheduleFilter = useMultiFilter(SCHEDULE_OPTIONS, scheduleDefaultExcluded);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (search && !`${item.id} ${item.title}`.toLowerCase().includes(search.toLowerCase())) return false;
      return (
        sprintFilter.accepts(item.sprintLabel) &&
        stateFilter.accepts(item.state) &&
        typeFilter.accepts(item.type) &&
        assigneeFilter.accepts(assigneeKey(item)) &&
        scheduleFilter.accepts(SCHEDULE_LABEL[item.scheduleFlag])
      );
    });
  }, [
    items,
    search,
    sprintFilter.accepts,
    stateFilter.accepts,
    typeFilter.accepts,
    assigneeFilter.accepts,
    scheduleFilter.accepts,
  ]);

  const isDefault =
    !search &&
    sprintFilter.isDefault &&
    stateFilter.isDefault &&
    typeFilter.isDefault &&
    assigneeFilter.isDefault &&
    scheduleFilter.isDefault;

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-4 p-4 shadow-card">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1">
          <label className="font-mono text-label-mono uppercase tracking-wider text-outline">Buscar</label>
          <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2">
            <span className="material-symbols-outlined text-[18px] text-outline">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID ou título..."
              className="w-full bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none"
            />
          </div>
        </div>
        <MultiSelectFilter
          label="Sprint"
          selected={sprintFilter.selected}
          onChange={sprintFilter.setSelected}
          options={sprints}
        />
        <MultiSelectFilter
          label="Status"
          selected={stateFilter.selected}
          onChange={stateFilter.setSelected}
          options={states}
        />
        <MultiSelectFilter label="Tipo" selected={typeFilter.selected} onChange={typeFilter.setSelected} options={types} />
        <MultiSelectFilter
          label="Responsável"
          selected={assigneeFilter.selected}
          onChange={assigneeFilter.setSelected}
          options={assignees}
        />
        <MultiSelectFilter
          label="Prazo"
          selected={scheduleFilter.selected}
          onChange={scheduleFilter.setSelected}
          options={SCHEDULE_OPTIONS}
        />
        {!isDefault && (
          <button
            onClick={() => {
              setSearch("");
              sprintFilter.reset();
              stateFilter.reset();
              typeFilter.reset();
              assigneeFilter.reset();
              scheduleFilter.reset();
            }}
            className="rounded-lg border border-outline-variant px-3 py-2 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="card overflow-hidden shadow-card">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-6 py-3">
          <p className="text-body-md text-on-surface-variant">
            Mostrando {filtered.length} de {items.length} itens
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container">
                <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">ID</th>
                <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Título</th>
                <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Tipo</th>
                <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Sprint</th>
                <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Responsável</th>
                <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Pts</th>
                <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Status</th>
                <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Prazo</th>
                <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-surface-container-high">
                  <td className="px-6 py-3 font-mono text-body-md text-outline">
                    <Link href={`/work-items/${item.id}`} className="hover:text-primary hover:underline">
                      #{item.id}
                    </Link>
                  </td>
                  <td className="max-w-sm truncate px-6 py-3 text-body-md text-on-surface">
                    <Link href={`/work-items/${item.id}`} className="hover:text-primary hover:underline">
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-body-md text-on-surface-variant">{item.type}</td>
                  <td className="px-6 py-3 text-body-md text-on-surface-variant">{item.sprintLabel}</td>
                  <td className="px-6 py-3 text-body-md text-on-surface-variant">{item.assignee ?? "—"}</td>
                  <td className="px-6 py-3 text-body-md text-on-surface-variant">{item.points ?? "—"}</td>
                  <td className="px-6 py-3">
                    <StatusPill state={item.state} />
                  </td>
                  <td className="px-6 py-3">
                    <SchedulePill flag={item.scheduleFlag} />
                  </td>
                  <td className="px-6 py-3 text-body-md text-on-surface-variant">{formatDate(item.changedDate)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-body-md text-on-surface-variant">
                    Nenhum item encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
