import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkItemDetail } from "@/lib/metrics";
import { getActiveProject } from "@/lib/active-project";
import { requireUser } from "@/lib/session";
import { listMeetingsForWorkItem, MeetingListItem } from "@/lib/meetings";
import { formatDate, formatDateTime, priorityLabel } from "@/lib/format";
import { StatusPill, SchedulePill } from "@/components/StatusPill";
import { ProgressBar } from "@/components/ProgressBar";
import { InfoRow } from "@/components/InfoRow";
import { RichText } from "@/components/RichText";
import { NoProjectAccess } from "@/components/EmptyProjectState";

export const dynamic = "force-dynamic";

export default async function WorkItemDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const user = await requireUser();
  const isManager = user.role === "ADMIN" || user.role === "MANAGER";
  const project = await getActiveProject(user);
  if (!project) return <NoProjectAccess />;

  const detail = await getWorkItemDetail(project, id);
  if (!detail) notFound();

  const { item, parent, children, sprint } = detail;
  const meetings = await listMeetingsForWorkItem(project.id, item.id, { includeDrafts: isManager });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-body-md text-on-surface-variant">
        <Link href="/work-items" className="hover:text-primary hover:underline">
          Demandas
        </Link>
        <span className="text-outline">/</span>
        <span className="font-mono text-on-surface">#{item.id}</span>
      </div>

      {/* Header */}
      <div className="card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-outline-variant bg-surface-container-highest px-2.5 py-1 font-mono text-label-mono uppercase tracking-wider text-on-surface-variant">
                {item.type}
              </span>
              <StatusPill state={item.state} />
              <SchedulePill flag={item.scheduleFlag} />
            </div>
            <h1 className="text-display-lg text-on-surface">{item.title}</h1>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Criado {item.createdBy ? `por ${item.createdBy} ` : ""}em {formatDate(item.createdDate)} · Atualizado em{" "}
              {formatDateTime(item.changedDate)}
            </p>
          </div>
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex shrink-0 items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-body-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              Abrir no Azure DevOps
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main column */}
        <div className="col-span-12 space-y-6 lg:col-span-8">
          <div className="card p-6 shadow-card">
            <h3 className="mb-3 text-headline-md text-on-surface">Descrição</h3>
            {item.description ? (
              <RichText html={item.description} />
            ) : (
              <p className="text-body-md text-on-surface-variant">Sem descrição cadastrada.</p>
            )}
          </div>

          {item.acceptanceCriteria ? (
            <div className="card p-6 shadow-card">
              <h3 className="mb-3 text-headline-md text-on-surface">Critérios de Aceite</h3>
              <RichText html={item.acceptanceCriteria} />
            </div>
          ) : null}

          {item.qaValidation ? (
            <div className="card p-6 shadow-card">
              <h3 className="mb-3 text-headline-md text-on-surface">Validação de QA</h3>
              <RichText html={item.qaValidation} />
            </div>
          ) : null}

          {item.poApproval ? (
            <div className="card p-6 shadow-card">
              <h3 className="mb-3 text-headline-md text-on-surface">Aprovação do PO</h3>
              <RichText html={item.poApproval} />
            </div>
          ) : null}

          {item.history ? (
            <div className="card p-6 shadow-card">
              <h3 className="mb-3 text-headline-md text-on-surface">Histórico</h3>
              <RichText html={item.history} />
            </div>
          ) : null}

          {(parent || children.length > 0) && (
            <div className="card p-6 shadow-card">
              <h3 className="mb-3 text-headline-md text-on-surface">Hierarquia</h3>
              {parent ? (
                <div className="mb-4">
                  <p className="mb-1 font-mono text-label-mono uppercase tracking-wider text-outline">Item pai</p>
                  <Link
                    href={`/work-items/${parent.id}`}
                    className="flex items-center justify-between rounded-lg border border-outline-variant p-3 transition-colors hover:bg-surface-container-high"
                  >
                    <span className="text-body-md text-on-surface">
                      <span className="mr-2 font-mono text-outline">#{parent.id}</span>
                      {parent.title}
                    </span>
                    <StatusPill state={parent.state} />
                  </Link>
                </div>
              ) : null}
              {children.length > 0 ? (
                <div>
                  <p className="mb-1 font-mono text-label-mono uppercase tracking-wider text-outline">
                    Itens filhos ({children.length})
                  </p>
                  <div className="space-y-2">
                    {children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/work-items/${child.id}`}
                        className="flex items-center justify-between rounded-lg border border-outline-variant p-3 transition-colors hover:bg-surface-container-high"
                      >
                        <span className="text-body-md text-on-surface">
                          <span className="mr-2 font-mono text-outline">#{child.id}</span>
                          {child.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <SchedulePill flag={child.scheduleFlag} />
                          <StatusPill state={child.state} />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) }
        </div>

        {/* Sidebar */}
        <div className="col-span-12 space-y-6 lg:col-span-4">
          <div className="card p-5 shadow-card">
            <h3 className="mb-1 text-headline-md text-on-surface">Estado Atual</h3>
            <div className="divide-y divide-outline-variant">
              <InfoRow label="Status" value={<StatusPill state={item.state} />} />
              <InfoRow label="Prazo" value={<SchedulePill flag={item.scheduleFlag} />} />
              <InfoRow label="Sprint" value={item.sprintNumber !== null ? <Link href="/sprints" className="text-primary hover:underline">{item.sprintLabel}</Link> : "Backlog"} />
              <InfoRow label="Prioridade" value={priorityLabel(item.priority)} />
              <InfoRow label="Story Points" value={item.points ?? "—"} />
              <InfoRow label="Horas Previstas" value={item.hoursPlanned ?? "—"} />
              <InfoRow label="Tamanho" value={item.size ?? "—"} />
              {item.risk ? <InfoRow label="Risco" value={item.risk} /> : null}
              {item.valueArea ? <InfoRow label="Área de Valor" value={item.valueArea} /> : null}
            </div>
          </div>

          {sprint ? (
            <div className="card p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-headline-md text-on-surface">{sprint.label}</h3>
                {sprint.isCurrent ? (
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                    atual
                  </span>
                ) : null}
              </div>
              <ProgressBar pct={sprint.pctDoneByPoints} />
              <p className="mt-2 font-mono text-label-mono text-outline">
                {sprint.donePoints}/{sprint.totalPoints} pts · {sprint.pctDoneByPoints}%
              </p>
            </div>
          ) : null}

          <div className="card p-5 shadow-card">
            <h3 className="mb-1 text-headline-md text-on-surface">Pessoas</h3>
            <div className="divide-y divide-outline-variant">
              <InfoRow label="Responsável" value={item.assignee ?? "Não atribuído"} />
              <InfoRow label="Criado por" value={item.createdBy} />
              <InfoRow label="Alterado por" value={item.changedBy} />
              {item.resolvedBy ? <InfoRow label="Resolvido por" value={item.resolvedBy} /> : null}
              {item.closedBy ? <InfoRow label="Fechado por" value={item.closedBy} /> : null}
            </div>
          </div>

          <div className="card p-5 shadow-card">
            <h3 className="mb-1 text-headline-md text-on-surface">Datas</h3>
            <div className="divide-y divide-outline-variant">
              <InfoRow label="Criado em" value={formatDate(item.createdDate)} />
              <InfoRow label="Alterado em" value={formatDate(item.changedDate)} />
              <InfoRow label="Mudança de status" value={formatDate(item.stateChangedDate)} />
              {item.resolvedDate ? <InfoRow label="Resolvido em" value={formatDate(item.resolvedDate)} /> : null}
              {item.closedDate ? <InfoRow label="Fechado em" value={formatDate(item.closedDate)} /> : null}
            </div>
          </div>

          <div className="card p-5 shadow-card">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-headline-md text-on-surface">Reuniões</h3>
              <Link
                href={`/agenda/new`}
                className="text-body-md font-semibold text-primary hover:underline"
              >
                + Nova
              </Link>
            </div>
            {meetings.length > 0 ? (
              <div className="mt-2 space-y-2">
                {meetings.map((m: MeetingListItem) => (
                  <Link
                    key={m.id}
                    href={`/agenda/${m.id}`}
                    className="block rounded-lg border border-outline-variant p-2.5 transition-colors hover:bg-surface-container-high"
                  >
                    <p className="text-body-md text-on-surface">{m.title}</p>
                    <p className="font-mono text-label-mono text-outline">{formatDate(m.meetingDate.toISOString())}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-body-md text-on-surface-variant">Nenhuma reunião vinculada a esta demanda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
