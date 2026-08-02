"use client";

import { useMemo } from "react";
import Link from "next/link";
import { WorkItem, SprintSummary } from "@/lib/types";
import { summarizeSprintItems } from "@/lib/portfolio-summary";
import { formatDate } from "@/lib/format";
import { ProgressBar } from "./ProgressBar";
import { StatusPill, SchedulePill } from "./StatusPill";
import { MultiSelectFilter } from "./SelectFilter";
import { useUniqueOptions, useMultiFilter, assigneeKey } from "@/lib/use-filter-options";

const PHASE_LABEL: Record<string, string> = {
  concluida: "Concluída",
  andamento: "Em andamento",
  planejada: "Planejada",
};

const PHASE_STYLE: Record<string, string> = {
  concluida: "bg-success-container text-success border-success/30",
  andamento: "bg-primary/10 text-primary border-primary/40",
  planejada: "bg-surface-container-highest text-on-surface-variant border-outline-variant",
};

export interface SprintMeetingRef {
  id: string;
  title: string;
  meetingDateIso: string;
}

export function SprintsExplorer({
  sprints,
  items,
  meetingsBySprint,
}: {
  sprints: SprintSummary[];
  items: WorkItem[];
  meetingsBySprint: Record<number, SprintMeetingRef[]>;
}) {
  const { types, assignees, states } = useUniqueOptions(items);

  // Every filter opens fully checked (no narrowing). There's no Sprint filter
  // here — the page is already grouped by sprint.
  const typeFilter = useMultiFilter(types);
  const assigneeFilter = useMultiFilter(assignees);
  const stateFilter = useMultiFilter(states);

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        typeFilter.accepts(item.type) &&
        assigneeFilter.accepts(assigneeKey(item)) &&
        stateFilter.accepts(item.state)
    );
  }, [items, typeFilter.accepts, assigneeFilter.accepts, stateFilter.accepts]);

  const isDefault = typeFilter.isDefault && assigneeFilter.isDefault && stateFilter.isDefault;

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-end gap-4 p-4 shadow-card">
        <MultiSelectFilter
          label="Tipo (Projeto/Epic/Feature...)"
          selected={typeFilter.selected}
          onChange={typeFilter.setSelected}
          options={types}
        />
        <MultiSelectFilter
          label="Responsável"
          selected={assigneeFilter.selected}
          onChange={assigneeFilter.setSelected}
          options={assignees}
        />
        <MultiSelectFilter
          label="Status"
          selected={stateFilter.selected}
          onChange={stateFilter.setSelected}
          options={states}
        />
        {!isDefault ? (
          <button
            onClick={() => {
              typeFilter.reset();
              assigneeFilter.reset();
              stateFilter.reset();
            }}
            className="rounded-lg border border-outline-variant px-3 py-2 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>

      <div className="space-y-5">
        {sprints.map((sprint) => {
          const items = filteredItems.filter((i) => i.sprintNumber === sprint.sprintNumber).sort((a, b) => a.id - b.id);
          const stats = summarizeSprintItems(items);
          const sprintMeetings = meetingsBySprint[sprint.sprintNumber] ?? [];

          return (
            <div key={sprint.sprintNumber} className="card overflow-hidden shadow-card">
              <div className="flex flex-col gap-4 border-b border-outline-variant bg-surface-container-low px-6 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-headline-md text-on-surface">{sprint.label}</h3>
                  <span
                    className={`rounded-full border px-2.5 py-1 font-mono text-label-mono uppercase tracking-wider ${PHASE_STYLE[sprint.phase]}`}
                  >
                    {PHASE_LABEL[sprint.phase]}
                  </span>
                  {sprint.isCurrent ? (
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-label-mono uppercase tracking-wider text-primary">
                      Sprint atual
                    </span>
                  ) : null}
                  {sprint.datesFromSchedule ? (
                    <span className="font-mono text-label-mono uppercase tracking-wider text-outline">
                      {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-6">
                  {stats.lateItems > 0 && (
                    <span className="text-body-md text-error">{stats.lateItems} atrasado{stats.lateItems > 1 ? "s" : ""}</span>
                  )}
                  {stats.aheadItems > 0 && (
                    <span className="text-body-md text-success">{stats.aheadItems} adiantado{stats.aheadItems > 1 ? "s" : ""}</span>
                  )}
                  <span className="text-body-md text-on-surface-variant">
                    {stats.donePoints}/{stats.totalPoints} pts · {stats.doneItems}/{stats.totalItems} itens
                  </span>
                </div>
              </div>

              <div className="px-6 py-4">
                <ProgressBar
                  pct={stats.pctDoneByPoints}
                  height="h-2"
                  colorClass={sprint.phase === "concluida" ? "bg-success" : sprint.phase === "andamento" ? "bg-primary" : "bg-outline"}
                />
                <div className="mt-1 flex justify-between font-mono text-label-mono text-outline">
                  <span>{stats.pctDoneByPoints}% concluído (pontos)</span>
                  <span>{stats.pendingPoints} pts pendentes</span>
                </div>
              </div>

              {sprintMeetings.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant px-6 py-3">
                  <span className="font-mono text-label-mono uppercase tracking-wider text-outline">Reuniões:</span>
                  {sprintMeetings.map((m) => (
                    <Link
                      key={m.id}
                      href={`/agenda/${m.id}`}
                      className="rounded-full border border-outline-variant px-2.5 py-1 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                    >
                      {m.title} · {formatDate(m.meetingDateIso)}
                    </Link>
                  ))}
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container">
                      <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">ID</th>
                      <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Título</th>
                      <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Tipo</th>
                      <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Responsável</th>
                      <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Pts</th>
                      <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Status</th>
                      <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Prazo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {items.map((item) => (
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
                        <td className="px-6 py-3 text-body-md text-on-surface-variant">{item.assignee ?? "—"}</td>
                        <td className="px-6 py-3 text-body-md text-on-surface-variant">{item.points ?? "—"}</td>
                        <td className="px-6 py-3">
                          <StatusPill state={item.state} />
                        </td>
                        <td className="px-6 py-3">
                          <SchedulePill flag={item.scheduleFlag} />
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-body-md text-on-surface-variant">
                          Nenhum item encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
