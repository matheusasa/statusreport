"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { WorkItem } from "@/lib/types";
import { StatusPill, SchedulePill } from "./StatusPill";
import { formatDate } from "@/lib/format";

const SCHEDULE_LABEL: Record<string, string> = {
  late: "Atrasado",
  ahead: "Adiantado",
  "on-track": "No prazo",
};

function useUniqueOptions(items: WorkItem[]) {
  return useMemo(() => {
    const sprints = Array.from(new Set(items.map((i) => i.sprintLabel))).sort();
    const states = Array.from(new Set(items.map((i) => i.state))).sort();
    const types = Array.from(new Set(items.map((i) => i.type))).sort();
    const assignees = Array.from(new Set(items.map((i) => i.assignee).filter((a): a is string => !!a))).sort();
    return { sprints, states, types, assignees };
  }, [items]);
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-mono text-label-mono uppercase tracking-wider text-outline">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
      >
        <option value="">Todos</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export function WorkItemsExplorer({ items }: { items: WorkItem[] }) {
  const searchParams = useSearchParams();
  const { sprints, states, types, assignees } = useUniqueOptions(items);

  const [search, setSearch] = useState("");
  const [sprintFilter, setSprintFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState(searchParams.get("schedule") ?? "");

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (search && !`${item.id} ${item.title}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (sprintFilter && item.sprintLabel !== sprintFilter) return false;
      if (stateFilter && item.state !== stateFilter) return false;
      if (typeFilter && item.type !== typeFilter) return false;
      if (assigneeFilter && item.assignee !== assigneeFilter) return false;
      if (scheduleFilter && item.scheduleFlag !== scheduleFilter) return false;
      return true;
    });
  }, [items, search, sprintFilter, stateFilter, typeFilter, assigneeFilter, scheduleFilter]);

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
        <SelectFilter label="Sprint" value={sprintFilter} onChange={setSprintFilter} options={sprints} />
        <SelectFilter label="Status" value={stateFilter} onChange={setStateFilter} options={states} />
        <SelectFilter label="Tipo" value={typeFilter} onChange={setTypeFilter} options={types} />
        <SelectFilter label="Responsável" value={assigneeFilter} onChange={setAssigneeFilter} options={assignees} />
        <div className="flex flex-col gap-1">
          <label className="font-mono text-label-mono uppercase tracking-wider text-outline">Prazo</label>
          <select
            value={scheduleFilter}
            onChange={(e) => setScheduleFilter(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">Todos</option>
            {Object.entries(SCHEDULE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {(search || sprintFilter || stateFilter || typeFilter || assigneeFilter || scheduleFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setSprintFilter("");
              setStateFilter("");
              setTypeFilter("");
              setAssigneeFilter("");
              setScheduleFilter("");
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
