import { getPortfolio } from "@/lib/metrics";
import { getActiveProject } from "@/lib/active-project";
import { requireUser } from "@/lib/session";
import { listMeetings } from "@/lib/meetings";
import { PageHeader } from "@/components/PageHeader";
import { NoProjectAccess } from "@/components/EmptyProjectState";
import { SprintsExplorer, SprintMeetingRef } from "@/components/SprintsExplorer";

export const dynamic = "force-dynamic";

export default async function SprintsPage() {
  const user = await requireUser();
  const isManager = user.role === "ADMIN" || user.role === "MANAGER";
  const project = await getActiveProject(user);
  if (!project) return <NoProjectAccess />;

  const [portfolio, meetings] = await Promise.all([
    getPortfolio(project),
    listMeetings(project.id, { includeDrafts: isManager }),
  ]);

  const meetingsBySprint: Record<number, SprintMeetingRef[]> = {};
  for (const m of meetings) {
    if (m.sprintNumber === null) continue;
    const list = meetingsBySprint[m.sprintNumber] ?? [];
    list.push({ id: m.id, title: m.title, meetingDateIso: m.meetingDate.toISOString() });
    meetingsBySprint[m.sprintNumber] = list;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sprints"
        subtitle="Detalhamento de pontos planejados vs. concluídos e itens fora do prazo, sprint a sprint."
      />
      <SprintsExplorer sprints={portfolio.sprints} items={portfolio.items} meetingsBySprint={meetingsBySprint} />
    </div>
  );
}
