import Link from "next/link";
import { notFound } from "next/navigation";
import { getMeeting } from "@/lib/meetings";
import { getPortfolio } from "@/lib/metrics";
import { getActiveProject } from "@/lib/active-project";
import { listProjectMembers } from "@/lib/projects";
import { requireManager } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { MeetingForm } from "@/components/MeetingForm";
import { updateMeetingAction } from "../../actions";

export const dynamic = "force-dynamic";

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function EditMeetingPage({ params }: { params: { id: string } }) {
  const user = await requireManager();
  const project = await getActiveProject(user);
  if (!project) throw new Error("Nenhum projeto ativo.");
  const [meeting, portfolio, projectMembers] = await Promise.all([
    getMeeting(params.id),
    getPortfolio(project),
    listProjectMembers(project.id),
  ]);
  if (!meeting) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-body-md text-on-surface-variant">
        <Link href="/agenda" className="hover:text-primary hover:underline">
          Agenda
        </Link>
        <span className="text-outline">/</span>
        <Link href={`/agenda/${meeting.id}`} className="hover:text-primary hover:underline">
          {meeting.title}
        </Link>
        <span className="text-outline">/</span>
        <span className="text-on-surface">Editar</span>
      </div>

      <PageHeader title="Editar Reunião" subtitle="Atualize a pauta, registre a ata ou ajuste os detalhes." />

      <MeetingForm
        action={updateMeetingAction.bind(null, meeting.id)}
        sprints={portfolio.sprints}
        projectMembers={projectMembers}
        submitLabel="Salvar Alterações"
        initial={{
          title: meeting.title,
          meetingDate: toDateInputValue(meeting.meetingDate),
          startTime: meeting.startTime ?? "",
          endTime: meeting.endTime ?? "",
          location: meeting.location ?? "",
          participants: meeting.participants,
          agenda: meeting.agenda ?? "",
          minutes: meeting.minutes ?? "",
          sprintNumber: meeting.sprintNumber !== null ? String(meeting.sprintNumber) : "",
          workItemId: meeting.workItemId !== null ? String(meeting.workItemId) : "",
        }}
        allowAttachments={false}
      />
    </div>
  );
}
