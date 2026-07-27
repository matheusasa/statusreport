import Link from "next/link";
import { getPortfolio } from "@/lib/metrics";
import { getProjectInfo } from "@/lib/project-info";
import { getActiveProject } from "@/lib/active-project";
import { requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { ProjectDatesCard } from "@/components/ProjectDatesCard";
import { DashboardExplorer } from "@/components/DashboardExplorer";
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
  const { totals, sprints, lastSyncedAt } = portfolio;

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

      <DashboardExplorer items={portfolio.items} sprints={sprints} />
    </div>
  );
}
