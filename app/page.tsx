import Link from "next/link";
import { getPortfolio } from "@/lib/metrics";
import { getProjectInfo } from "@/lib/project-info";
import { getActiveProject } from "@/lib/active-project";
import { requireUser } from "@/lib/session";
import { formatDateTime, initials } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusPill, SchedulePill } from "@/components/StatusPill";
import { ProjectDatesCard } from "@/components/ProjectDatesCard";
import { NoProjectAccess } from "@/components/EmptyProjectState";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const isManager = user.role === "ADMIN" || user.role === "MANAGER";
  const project = await getActiveProject(user);

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader title="Visão Geral do Projeto" subtitle="Nenhum projeto disponível." />
        <NoProjectAccess />
      </div>
    );
  }

  const [portfolio, projectInfo] = await Promise.all([getPortfolio(project), getProjectInfo(project.id)]);
  const { totals, sprints, currentSprintNumber, assignees, lastSyncedAt } = portfolio;

  const currentSprint = sprints.find((s) => s.isCurrent);
  const lateItems = portfolio.items
    .filter((i) => i.scheduleFlag === "late")
    .sort((a, b) => (a.sprintNumber ?? 0) - (b.sprintNumber ?? 0))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral do Projeto"
        subtitle={`${project.name} · Dados sincronizados do Azure DevOps · Atualizado em ${formatDateTime(
          lastSyncedAt
        )}`}
        right={
          <Link
            href="/work-items"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">list_alt</span>
            Ver todas as demandas
          </Link>
        }
      />

      <ProjectDatesCard
        startDate={projectInfo.startDate}
        endDate={projectInfo.endDate}
        notes={projectInfo.notes}
        pctDoneByPoints={totals.pctDoneByPoints}
        canEdit={isManager}
      />

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
              A sprint atual é a sprint mais recente com itens ativamente em andamento (ou, na ausência destes, a
              primeira sprint ainda não concluída). Um item é <span className="text-error">atrasado</span> quando
              está em uma sprint anterior à atual e ainda não foi fechado. É{" "}
              <span className="text-success">adiantado</span> quando foi concluído em uma sprint futura à atual.
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
            {sprints.map((s) => (
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
            {portfolio.backlog.length > 0 ? (
              <div className="flex items-center gap-4 px-6 py-3.5 bg-surface-container-low/50">
                <div className="w-20 shrink-0">
                  <p className="text-body-md font-semibold text-on-surface-variant">Backlog</p>
                </div>
                <div className="flex-1 text-body-md text-on-surface-variant">
                  {portfolio.backlog.length} itens ainda não planejados em sprint
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
            {assignees.map((a) => (
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
          </div>
        </div>
      </div>
    </div>
  );
}
