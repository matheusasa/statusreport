import Link from "next/link";
import { getPortfolio } from "@/lib/metrics";
import { getActiveProject } from "@/lib/active-project";
import { requireUser } from "@/lib/session";
import { listMeetings, MeetingListItem } from "@/lib/meetings";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusPill, SchedulePill } from "@/components/StatusPill";
import { NoProjectAccess } from "@/components/EmptyProjectState";

export const dynamic = "force-dynamic";

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

export default async function SprintsPage() {
  const user = await requireUser();
  const isManager = user.role === "ADMIN" || user.role === "MANAGER";
  const project = await getActiveProject(user);
  if (!project) return <NoProjectAccess />;

  const [portfolio, meetings] = await Promise.all([
    getPortfolio(project),
    listMeetings(project.id, { includeDrafts: isManager }),
  ]);
  const meetingsBySprintNumber = new Map<number, typeof meetings>();
  for (const m of meetings) {
    if (m.sprintNumber === null) continue;
    const list = meetingsBySprintNumber.get(m.sprintNumber) ?? [];
    list.push(m);
    meetingsBySprintNumber.set(m.sprintNumber, list);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sprints"
        subtitle="Detalhamento de pontos planejados vs. concluídos e itens fora do prazo, sprint a sprint."
      />

      <div className="space-y-5">
        {portfolio.sprints.map((sprint) => {
          const items = portfolio.items
            .filter((i) => i.sprintNumber === sprint.sprintNumber)
            .sort((a, b) => a.id - b.id);
          const sprintMeetings = meetingsBySprintNumber.get(sprint.sprintNumber) ?? [];

          return (
            <div key={sprint.sprintNumber} className="card overflow-hidden shadow-card">
              <div className="flex flex-col gap-4 border-b border-outline-variant bg-surface-container-low px-6 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
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
                </div>
                <div className="flex items-center gap-6">
                  {sprint.lateItems > 0 && (
                    <span className="text-body-md text-error">{sprint.lateItems} atrasado{sprint.lateItems > 1 ? "s" : ""}</span>
                  )}
                  {sprint.aheadItems > 0 && (
                    <span className="text-body-md text-success">{sprint.aheadItems} adiantado{sprint.aheadItems > 1 ? "s" : ""}</span>
                  )}
                  <span className="text-body-md text-on-surface-variant">
                    {sprint.donePoints}/{sprint.totalPoints} pts · {sprint.doneItems}/{sprint.totalItems} itens
                  </span>
                </div>
              </div>

              <div className="px-6 py-4">
                <ProgressBar
                  pct={sprint.pctDoneByPoints}
                  height="h-2"
                  colorClass={sprint.phase === "concluida" ? "bg-success" : sprint.phase === "andamento" ? "bg-primary" : "bg-outline"}
                />
                <div className="mt-1 flex justify-between font-mono text-label-mono text-outline">
                  <span>{sprint.pctDoneByPoints}% concluído (pontos)</span>
                  <span>{sprint.pendingPoints} pts pendentes</span>
                </div>
              </div>

              {sprintMeetings.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant px-6 py-3">
                  <span className="font-mono text-label-mono uppercase tracking-wider text-outline">Reuniões:</span>
                  {sprintMeetings.map((m: MeetingListItem) => (
                    <Link
                      key={m.id}
                      href={`/agenda/${m.id}`}
                      className="rounded-full border border-outline-variant px-2.5 py-1 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                    >
                      {m.title} · {formatDate(m.meetingDate.toISOString())}
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
