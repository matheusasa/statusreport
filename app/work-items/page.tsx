import { Suspense } from "react";
import { getPortfolio } from "@/lib/metrics";
import { getActiveProject } from "@/lib/active-project";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { WorkItemsExplorer } from "@/components/WorkItemsExplorer";
import { NoProjectAccess } from "@/components/EmptyProjectState";

export const dynamic = "force-dynamic";

export default async function WorkItemsPage() {
  const user = await requireUser();
  const project = await getActiveProject(user);
  if (!project) return <NoProjectAccess />;

  const portfolio = await getPortfolio(project);

  return (
    <div className="space-y-6">
      <PageHeader title="Demandas" subtitle="Todas as demandas sincronizadas do Azure DevOps, com filtros por sprint, status e responsável." />
      <Suspense fallback={<div className="text-body-md text-on-surface-variant">Carregando...</div>}>
        <WorkItemsExplorer items={portfolio.items} />
      </Suspense>
    </div>
  );
}
