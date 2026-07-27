"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { WorkItem, SprintSummary } from "@/lib/types";
import { summarizeTotals, summarizeAssignees, summarizeSprintItems } from "@/lib/portfolio-summary";
import { KpiCard } from "./KpiCard";
import { ProgressBar } from "./ProgressBar";
import { StatusPill } from "./StatusPill";
import { SelectFilter, ToggleFilter } from "./SelectFilter";
import { ProjectDatesCard } from "./ProjectDatesCard";
import { initials, formatDate } from "@/lib/format";

function useUniqueOptions(items: WorkItem[]) {
  return useMemo(() => {
    const sprints = Array.from(new Set(items.map((i) => i.sprintLabel))).sort();
    const states = Array.from(new Set(items.map((i) => i.state))).sort();
    const types = Array.from(new Set(items.map((i) => i.type))).sort();
    const assignees = Array.from(new Set(items.map((i) => i.assignee).filter((a): a is string => !!a))).sort();
    return { sprints, states, types, assignees };
  }, [items]);
}

/**
 * Client-side filter layer for the Visão Geral (dashboard) page. Takes the
 * full, already-aggregated portfolio item/sprint arrays and recomputes every
 * on-screen number (KPIs, sprint progress, sprint atual, itens atrasados,
 * carga por responsável) from whatever subset of items matches the current
 * filters — without re-hitting the server. scheduleFlag/phase/isCurrent are
 * computed once server-side (lib/metrics.ts) from the whole, unfiltered
 * portfolio and don't change here; only the item counts shown per section do.
 */
export function DashboardExplorer({
  items,
  sprints,
  projectInfo,
  isManager,
}: {
  items: WorkItem[];
  sprints: SprintSummary[];
  projectInfo: { startDate: string | null; endDate: string | null; notes: string | null };
  isManager: boolean;
}) {
  const { sprints: sprintOptions, states, types, assignees: assigneeOptions } = useUniqueOptions(items);

  const [sprintFilter, setSprintFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [hideBacklog, setHideBacklog] = useState(false);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (hideBacklog && item.sprintNumber === null) return false;
      if (sprintFilter && item.sprintLabel !== sprintFilter) return false;
      if (typeFilter && item.type !== typeFilter) return false;
      if (stateFilter && item.state !== stateFilter) return false;
      if (assigneeFilter && item.assignee !== assigneeFilter) return false;
      return true;
    });
  }, [items, sprintFilter, typeFilter, stateFilter, assigneeFilter, hideBacklog]);

  const totals = useMemo(() => summarizeTotals(filtered), [filtered]);
  const assigneeRows = useMemo(() => summarizeAssignees(filtered), [filtered]);

  const sprintRows = useMemo(
    () =>
      sprints.map((s) => {
        const sprintItems = filtered.filter((i) => i.sprintNumber === s.sprintNumber);
        return { ...s, ...summarizeSprintItems(sprintItems) };
      }),
    [sprints, filtered]
  );

  const backlogCount = useMemo(() => filtered.filter((i) => i.sprintNumber === null).length, [filtered]);

  const currentSprint = sprintRows.find((s) => s.isCurrent);

  const lateItems = useMemo(
    () =>
      filtered
        .filter((i) => i.scheduleFlag === "late")
        .sort((a, b) => (a.sprintNumber ?? 0) - (b.sprintNumber ?? 0))
        .slice(0, 8),
    [filtered]
  );

  const hasActiveFilters = sprintFilter || typeFilter || stateFilter || assigneeFilter || hideBacklog;

  return (
    <div className="space-y-6">
      <ProjectDatesCard
        startDate={projectInfo.startDate}
        endDate={projectInfo.endDate}
        notes={projectInfo.notes}
        pctDoneByPoints={totals.pctDoneByPoints}
        canEdit={isManager}
      />

      {/* Filter bar */}
      <div className="card flex flex-wrap items-end gap-4 p-4 shadow-card">
        <SelectFilter label="Sprint" value={sprintFilter} onChange={setSprintFilter} options={sprintOptions} />
        <SelectFilter label="Tipo (Projeto/Epic/Feature...)" value={typeFilter} onChange={setTypeFilter} options={types} />
        <SelectFilter label="Status" value={stateFilter} onChange={setStateFilter} options={states} />
        <SelectFilter label="Responsável" value={assigneeFilter} onChange={setAssigneeFilter} options={assigneeOptions} />
        <ToggleFilter label="Ocultar backlog" checked={hideBacklog} onChange={setHideBacklog} />
        {hasActiveFilters ? (
          <button
            onClick={() => {
              setSprintFilter("");
              setTypeFilter("");
              setStateFilter("");
              setAssigneeFilter("");
              setHideBacklog(false);
            }}
            className="rounded-lg border border-outline-variant px-3 py-2 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            Limpar filtros
          </button>
        ) : null}
        <p className="ml-auto text-body-md text-on-surface-variant">
          {filtered.length} de {items.length} itens
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total de Itens"
          value={totals.totalItems}
          sublabel={`${totals.totalPoints} pts planejados`}
          icon="inventory_2"
        />
        <KpiCard
          label="Concluídos"
          value={totals.doneItems}
          sublabel={`${totals.pctDoneByPoints}% dos pontos`}
          icon="check_circle"
          tone="success"
        />
        <KpiCard label="Em Andamento" value={totals.activeItems} sublabel="Ativos nas sprints" icon="autorenew" tone="primary" />
        <KpiCard
          label="Atrasados"
          value={totals.lateItems}
          sublabel="Em sprints já encerradas"
          icon="report"
          tone="error"
        />
        <KpiCard
          label="Adiantados"
          value={totals.aheadItems}
          sublabel="Concluídos antes do previsto"
          icon="rocket_launch"
          tone="success"
        />
        <KpiCard
          label="Pontos Pendentes"
          value={totals.pendingPoints}
          sublabel={`de ${totals.totalPoints} pts totais`}
          icon="pending_actions"
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sprint atual */}
        <div className="col-span-12 card p-6 shadow-card lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-headline-md text-on-surface">Sprint Atual</h3>
            {currentSprint ? (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-label-mono uppercase tracking-wider text-primary">
                {currentSprint.label}
              </span>
            ) : null}
          </div>

          {currentSprint ? (
            <>
              {currentSprint.datesFromSchedule ? (
                <p className="mb-3 font-mono text-label-mono uppercase tracking-wider text-outline">
                  {formatDate(currentSprint.startDate)} – {formatDate(currentSprint.endDate)}
                </p>
              ) : null}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-headline-lg text-on-surface">{currentSprint.pctDoneByPoints}%</p>
                  <p className="font-mono text-label-mono uppercase tracking-wider text-outline">
                    concluído por pontos
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-body-lg text-on-surface">
                    {currentSprint.donePoints} / {currentSprint.totalPoints} pts
                  </p>
                  <p className="text-body-md text-on-surface-variant">
                    {currentSprint.doneItems} / {currentSprint.totalItems} itens
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <ProgressBar pct={currentSprint.pctDoneByPoints} height="h-2.5" />
              </div>

              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-headline-md text-on-surface">{currentSprint.activeItems}</p>
                  <p className="font-mono text-label-mono uppercase tracking-wider text-outline">Em andamento</p>
                </div>
                <div>
                  <p className="text-headline-md text-error">{currentSprint.lateItems}</p>
                  <p className="font-mono text-label-mono uppercase tracking-wider text-outline">Atrasados</p>
                </div>
                <div>
                  <p className="text-headline-md text-on-surface">{currentSprint.backlogItems}</p>
                  <p className="font-mono text-label-mono uppercase tracking-wider text-outline">Não iniciados</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-body-md text-on-surface-variant">Nenhuma sprint em andamento no momento.</p>
          )}

          <div className="mt-6 rounded-lg border border-outline-variant bg-surface-container-low p-4">
            <p className="flex items-center gap-2 font-mono text-label-mono uppercase tracking-wider text-outline">
              <span className="material-symbols-outlined text-[16px]">info</span>
              Como calculamos atraso/adiantamento
            </p>
            <p className="mt-2 text-body-md text-on-surface-variant">
              {currentSprint?.datesFromSchedule
                ? "A sprint atual é a que contém a data de hoje, com base nas datas de início/fim sincronizadas do Azure DevOps."
                : "A sprint atual é a sprint mais recente com itens ativamente em andamento (ou, na ausência destes, a primeira sprint ainda não concluída) — esse projeto ainda não tem datas de sprint sincronizadas."}{" "}
              Um item é <span className="text-error">atrasado</span> quando está em uma sprint anterior à atual e
              ainda não foi fechado. É <span className="text-success">adiantado</span> quando foi concluído em uma
              sprint futura à atual.
            </p>
          </div>
        </div>

        {/* Sprint progress list */}
        <div className="col-span-12 card overflow-hidden shadow-card lg:col-span-7">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-6 py-4">
            <h3 className="text-headline-md text-on-surface">Progresso por Sprint</h3>
            <Link href="/sprints" className="text-body-md font-semibold text-primary hover:underline">
              Ver detalhes
            </Link>
          </div>
          <div className="divide-y divide-outline-variant">
            {sprintRows.map((s) => (
              <div key={s.sprintNumber} className="flex items-center gap-4 px-6 py-3.5">
                <div className="w-20 shrink-0">
                  <p className="text-body-md font-semibold text-on-surface">{s.label}</p>
                  {s.isCurrent ? (
                    <p className="font-mono text-[10px] uppercase tracking-wider text-primary">atual</p>
                  ) : null}
                </div>
                <div className="flex-1">
                  <ProgressBar
                    pct={s.pctDoneByPoints}
                    colorClass={s.phase === "concluida" ? "bg-success" : s.phase === "andamento" ? "bg-primary" : "bg-outline"}
                  />
                </div>
                <div className="w-16 text-right font-mono text-label-mono text-on-surface-variant">
                  {s.pctDoneByPoints}%
                </div>
                <div className="hidden w-24 text-right text-body-md text-on-surface-variant sm:block">
                  {s.donePoints}/{s.totalPoints} pts
                </div>
                <div className="flex w-20 justify-end gap-1">
                  {s.lateItems > 0 ? (
                    <span className="rounded-full bg-error-container px-2 py-0.5 font-mono text-[10px] text-error">
                      {s.lateItems} atr.
                    </span>
                  ) : null}
                  {s.aheadItems > 0 ? (
                    <span className="rounded-full bg-success-container px-2 py-0.5 font-mono text-[10px] text-success">
                      {s.aheadItems} adi.
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
            {!hideBacklog && backlogCount > 0 ? (
              <div className="flex items-center gap-4 px-6 py-3.5 bg-surface-container-low/50">
                <div className="w-20 shrink-0">
                  <p className="text-body-md font-semibold text-on-surface-variant">Backlog</p>
                </div>
                <div className="flex-1 text-body-md text-on-surface-variant">
                  {backlogCount} itens ainda não planejados em sprint
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Late items table */}
        <div className="col-span-12 card overflow-hidden shadow-card lg:col-span-7">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-6 py-4">
            <h3 className="text-headline-md text-on-surface">
              Itens Atrasados <span className="text-error">({totals.lateItems})</span>
            </h3>
            <Link href="/work-items?schedule=late" className="text-body-md font-semibold text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          {lateItems.length === 0 ? (
            <p className="px-6 py-8 text-center text-body-md text-on-surface-variant">
              Nenhum item atrasado no momento. 🎉
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container">
                    <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">ID</th>
                    <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Título</th>
                    <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Sprint</th>
                    <th className="px-6 py-2.5 font-mono text-label-mono uppercase text-on-surface-variant">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {lateItems.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-surface-container-high">
                      <td className="px-6 py-3 font-mono text-body-md text-outline">
                        <Link href={`/work-items/${item.id}`} className="hover:text-primary hover:underline">
                          #{item.id}
                        </Link>
                      </td>
                      <td className="max-w-xs truncate px-6 py-3 text-body-md text-on-surface">
                        <Link href={`/work-items/${item.id}`} className="hover:text-primary hover:underline">
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-body-md text-on-surface-variant">{item.sprintLabel}</td>
                      <td className="px-6 py-3">
                        <StatusPill state={item.state} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Workload by assignee */}
        <div className="col-span-12 card overflow-hidden shadow-card lg:col-span-5">
          <div className="border-b border-outline-variant bg-surface-container-low px-6 py-4">
            <h3 className="text-headline-md text-on-surface">Carga por Responsável</h3>
          </div>
          <div className="divide-y divide-outline-variant">
            {assigneeRows.map((a) => (
              <div key={a.name} className="flex items-center gap-3 px-6 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-[11px] font-bold text-on-primary-fixed">
                  {initials(a.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-md font-semibold text-on-surface">{a.name}</p>
                  <p className="text-body-md text-on-surface-variant">
                    {a.done}/{a.total} concluídos · {a.points} pts pendentes
                  </p>
                </div>
                {a.late > 0 ? (
                  <span className="rounded-full bg-error-container px-2 py-0.5 font-mono text-[10px] text-error">
                    {a.late} atrasado{a.late > 1 ? "s" : ""}
                  </span>
                ) : null}
              </div>
            ))}
            {assigneeRows.length === 0 ? (
              <p className="px-6 py-8 text-center text-body-md text-on-surface-variant">
                Nenhum item encontrado para os filtros selecionados.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
