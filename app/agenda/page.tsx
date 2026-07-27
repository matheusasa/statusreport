import Link from "next/link";
import { listMeetings, MeetingListItem } from "@/lib/meetings";
import { getPortfolio } from "@/lib/metrics";
import { getActiveProject } from "@/lib/active-project";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { MeetingStatusPill } from "@/components/MeetingStatusPill";
import { NoProjectAccess } from "@/components/EmptyProjectState";

export const dynamic = "force-dynamic";

function MeetingCard({
  meeting,
  sprintLabel,
  workItemTitle,
}: {
  meeting: MeetingListItem;
  sprintLabel: string | null;
  workItemTitle: string | null;
}) {
  return (
    <Link
      href={`/agenda/${meeting.id}`}
      className="card block p-5 shadow-card transition-colors hover:bg-surface-container-high"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-label-mono uppercase tracking-wider text-outline">
            {formatDate(meeting.meetingDate.toISOString())}
            {meeting.startTime ? ` · ${meeting.startTime}${meeting.endTime ? `–${meeting.endTime}` : ""}` : ""}
          </p>
          <h3 className="mt-1 truncate text-body-lg font-semibold text-on-surface">{meeting.title}</h3>
          {meeting.location ? <p className="mt-1 text-body-md text-on-surface-variant">{meeting.location}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <MeetingStatusPill status={meeting.status} />
          {sprintLabel ? (
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
              {sprintLabel}
            </span>
          ) : null}
          {workItemTitle ? (
            <span
              className="max-w-[180px] truncate rounded-full border border-outline-variant bg-surface-container-highest px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant"
              title={workItemTitle}
            >
              #{meeting.workItemId}
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-body-md text-on-surface-variant">
        {meeting.participants.length > 0 ? (
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">group</span>
            {meeting.participants.length}
          </span>
        ) : null}
        {meeting.attachments.length > 0 ? (
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">attach_file</span>
            {meeting.attachments.length}
          </span>
        ) : null}
        {meeting.minutes ? (
          <span className="flex items-center gap-1 text-success">
            <span className="material-symbols-outlined text-[16px]">description</span>
            Ata registrada
          </span>
        ) : null}
      </div>
    </Link>
  );
}

const TABS: { value: "PUBLISHED" | "ARCHIVED" | "DRAFT"; label: string }[] = [
  { value: "PUBLISHED", label: "Publicadas" },
  { value: "ARCHIVED", label: "Arquivadas" },
  { value: "DRAFT", label: "Rascunhos" },
];

export default async function AgendaPage({ searchParams }: { searchParams: { status?: string } }) {
  const user = await requireUser();
  const project = await getActiveProject(user);

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader title="Agenda" subtitle="Reuniões do projeto, pautas, atas e documentos anexados." />
        <NoProjectAccess />
      </div>
    );
  }

  const isManager = user.role === "ADMIN" || user.role === "MANAGER";
  const [allMeetings, portfolio] = await Promise.all([
    listMeetings(project.id, { includeDrafts: isManager }),
    getPortfolio(project),
  ]);

  const sprintLabelByNumber = new Map(portfolio.sprints.map((s) => [s.sprintNumber, s.label]));
  const itemTitleById = new Map(portfolio.items.map((i) => [i.id, i.title]));

  const activeTab = TABS.some((t) => t.value === searchParams.status) ? searchParams.status! : "PUBLISHED";
  const meetings = allMeetings.filter((m: MeetingListItem) => m.status === activeTab);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = meetings
    .filter((m: MeetingListItem) => m.meetingDate >= now)
    .sort((a: MeetingListItem, b: MeetingListItem) => a.meetingDate.getTime() - b.meetingDate.getTime());
  const past = meetings.filter((m: MeetingListItem) => m.meetingDate < now);

  const visibleTabs = isManager ? TABS : TABS.filter((t) => t.value !== "DRAFT");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        subtitle="Reuniões do projeto, pautas, atas e documentos anexados."
        right={
          isManager ? (
            <Link
              href="/agenda/new"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Nova Reunião
            </Link>
          ) : undefined
        }
      />

      <div className="flex gap-2 border-b border-outline-variant">
        {visibleTabs.map((tab) => {
          const count = allMeetings.filter((m: MeetingListItem) => m.status === tab.value).length;
          const active = tab.value === activeTab;
          return (
            <Link
              key={tab.value}
              href={`/agenda?status=${tab.value}`}
              className={`border-b-2 px-3 py-2 text-body-md transition-colors ${
                active
                  ? "border-primary font-semibold text-on-surface"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab.label} <span className="text-on-surface-variant">({count})</span>
            </Link>
          );
        })}
      </div>

      {allMeetings.length === 0 ? (
        <div className="card p-10 text-center shadow-card">
          <p className="text-body-md text-on-surface-variant">Nenhuma reunião registrada ainda.</p>
          {isManager ? (
            <Link href="/agenda/new" className="mt-3 inline-block text-body-md font-semibold text-primary hover:underline">
              Registrar a primeira reunião
            </Link>
          ) : null}
        </div>
      ) : meetings.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">Nenhuma reunião nesta categoria.</p>
      ) : (
        <>
          <div>
            <h3 className="mb-3 text-headline-md text-on-surface">
              Próximas <span className="text-on-surface-variant">({upcoming.length})</span>
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">Nenhuma reunião futura agendada.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((m: MeetingListItem) => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    sprintLabel={m.sprintNumber !== null ? sprintLabelByNumber.get(m.sprintNumber) ?? `Sprint ${m.sprintNumber}` : null}
                    workItemTitle={m.workItemId !== null ? itemTitleById.get(m.workItemId) ?? null : null}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-headline-md text-on-surface">
              Anteriores <span className="text-on-surface-variant">({past.length})</span>
            </h3>
            {past.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">Nenhuma reunião anterior registrada.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {past.map((m: MeetingListItem) => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    sprintLabel={m.sprintNumber !== null ? sprintLabelByNumber.get(m.sprintNumber) ?? `Sprint ${m.sprintNumber}` : null}
                    workItemTitle={m.workItemId !== null ? itemTitleById.get(m.workItemId) ?? null : null}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
