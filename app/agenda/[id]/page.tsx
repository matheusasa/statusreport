import Link from "next/link";
import { notFound } from "next/navigation";
import { getMeeting, MeetingAttachmentItem } from "@/lib/meetings";
import { getPortfolio } from "@/lib/metrics";
import { getProject, listAccessibleProjects } from "@/lib/projects";
import { requireUser } from "@/lib/session";
import { getS3SignedUrl } from "@/lib/s3";
import { formatDate, formatFileSize } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill, SchedulePill } from "@/components/StatusPill";
import { MeetingStatusPill } from "@/components/MeetingStatusPill";
import { ProgressBar } from "@/components/ProgressBar";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import {
  addAttachmentAction,
  archiveMeetingAction,
  deleteAttachmentAction,
  deleteMeetingAction,
  publishMeetingAction,
  unarchiveMeetingAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const isManager = user.role === "ADMIN" || user.role === "MANAGER";

  const meeting = await getMeeting(params.id);
  if (!meeting) notFound();

  // Authorization: only admins see every project automatically. Managers
  // and clients alike must be explicitly linked to the project (see
  // lib/projects.ts#listAccessibleProjects) — and non-managers never see
  // drafts (those are manager/admin-only).
  if (!isAdmin) {
    const accessible = await listAccessibleProjects(user);
    const hasAccess = accessible.some((p) => p.id === meeting.projectId);
    if (!hasAccess || (!isManager && meeting.status === "DRAFT")) notFound();
  }

  const project = await getProject(meeting.projectId);
  const portfolio = project ? await getPortfolio(project) : null;

  const sprint =
    portfolio && meeting.sprintNumber !== null
      ? portfolio.sprints.find((s) => s.sprintNumber === meeting.sprintNumber) ?? null
      : null;
  const workItem =
    portfolio && meeting.workItemId !== null ? portfolio.items.find((i) => i.id === meeting.workItemId) ?? null : null;

  // filePath stores the S3 object key (not a public URL) — resolve a
  // short-lived signed URL for each attachment right before rendering.
  const attachments = await Promise.all(
    meeting.attachments.map(async (att: MeetingAttachmentItem) => ({ ...att, url: await getS3SignedUrl(att.filePath) }))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-body-md text-on-surface-variant">
        <Link href="/agenda" className="hover:text-primary hover:underline">
          Agenda
        </Link>
        <span className="text-outline">/</span>
        <span className="text-on-surface">{meeting.title}</span>
      </div>

      <PageHeader
        title={meeting.title}
        subtitle={`${formatDate(meeting.meetingDate.toISOString())}${
          meeting.startTime ? ` · ${meeting.startTime}${meeting.endTime ? `–${meeting.endTime}` : ""}` : ""
        }${meeting.location ? ` · ${meeting.location}` : ""}`}
        right={
          isManager ? (
            <>
              <MeetingStatusPill status={meeting.status} />
              {meeting.status === "DRAFT" ? (
                <form action={publishMeetingAction.bind(null, meeting.id)}>
                  <ConfirmSubmitButton
                    confirmMessage="Publicar esta reunião? Clientes vinculados ao projeto passam a vê-la e recebem um email de notificação."
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90"
                  >
                    <span className="material-symbols-outlined text-[18px]">publish</span>
                    Publicar
                  </ConfirmSubmitButton>
                </form>
              ) : meeting.status === "PUBLISHED" ? (
                <form action={archiveMeetingAction.bind(null, meeting.id)}>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-body-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined text-[18px]">archive</span>
                    Arquivar
                  </button>
                </form>
              ) : (
                <form action={unarchiveMeetingAction.bind(null, meeting.id)}>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-body-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined text-[18px]">unarchive</span>
                    Reativar
                  </button>
                </form>
              )}
              <Link
                href={`/agenda/${meeting.id}/edit`}
                className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-body-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Editar
              </Link>
              <form action={deleteMeetingAction.bind(null, meeting.id)}>
                <ConfirmSubmitButton
                  confirmMessage="Excluir esta reunião e todos os seus anexos? Essa ação não pode ser desfeita."
                  className="flex items-center gap-2 rounded-lg border border-error/40 px-4 py-2 text-body-md font-semibold text-error transition-colors hover:bg-error-container"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Excluir
                </ConfirmSubmitButton>
              </form>
            </>
          ) : (
            <MeetingStatusPill status={meeting.status} />
          )
        }
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 lg:col-span-8">
          <div className="card p-6 shadow-card">
            <h3 className="mb-3 text-headline-md text-on-surface">Pauta</h3>
            {meeting.agenda ? (
              <p className="whitespace-pre-wrap text-body-md text-on-surface-variant">{meeting.agenda}</p>
            ) : (
              <p className="text-body-md text-on-surface-variant">Nenhuma pauta registrada.</p>
            )}
          </div>

          <div className="card p-6 shadow-card">
            <h3 className="mb-3 text-headline-md text-on-surface">Ata</h3>
            {meeting.minutes ? (
              <p className="whitespace-pre-wrap text-body-md text-on-surface-variant">{meeting.minutes}</p>
            ) : (
              <p className="text-body-md text-on-surface-variant">
                Ata ainda não registrada.
                {isManager ? (
                  <>
                    {" "}
                    <Link href={`/agenda/${meeting.id}/edit`} className="text-primary hover:underline">
                      Adicionar agora
                    </Link>
                  </>
                ) : null}
              </p>
            )}
          </div>

          <div className="card p-6 shadow-card">
            <h3 className="mb-3 text-headline-md text-on-surface">Anexos ({attachments.length})</h3>
            {attachments.length > 0 ? (
              <div className="mb-4 space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant p-3"
                  >
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 items-center gap-2 text-body-md text-on-surface hover:text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined shrink-0 text-[18px] text-outline">description</span>
                      <span className="truncate">{att.fileName}</span>
                      <span className="shrink-0 font-mono text-label-mono text-outline">{formatFileSize(att.fileSize)}</span>
                    </a>
                    {isManager ? (
                      <form action={deleteAttachmentAction.bind(null, meeting.id, att.id, att.filePath)}>
                        <ConfirmSubmitButton
                          confirmMessage={`Remover o anexo "${att.fileName}"?`}
                          className="shrink-0 text-outline transition-colors hover:text-error"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </ConfirmSubmitButton>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-4 text-body-md text-on-surface-variant">Nenhum anexo ainda.</p>
            )}
            {isManager ? (
              <form action={addAttachmentAction.bind(null, meeting.id)} className="flex items-center gap-3">
                <input
                  type="file"
                  name="attachments"
                  multiple
                  className="block flex-1 text-body-md text-on-surface-variant file:mr-4 file:rounded-lg file:border-0 file:bg-surface-container-highest file:px-3 file:py-1.5 file:text-body-md file:text-on-surface hover:file:bg-surface-container-high"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg border border-outline-variant px-3 py-1.5 text-body-md text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  Adicionar
                </button>
              </form>
            ) : null}
          </div>
        </div>

        <div className="col-span-12 space-y-6 lg:col-span-4">
          <div className="card p-5 shadow-card">
            <h3 className="mb-1 text-headline-md text-on-surface">Participantes</h3>
            {meeting.participants.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {meeting.participants.map((p: string) => (
                  <li key={p} className="text-body-md text-on-surface-variant">
                    {p}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-body-md text-on-surface-variant">Nenhum participante registrado.</p>
            )}
          </div>

          {sprint ? (
            <div className="card p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <Link href="/sprints" className="text-headline-md text-on-surface hover:text-primary hover:underline">
                  {sprint.label}
                </Link>
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

          {workItem ? (
            <div className="card p-5 shadow-card">
              <h3 className="mb-2 text-headline-md text-on-surface">Demanda relacionada</h3>
              <Link
                href={`/work-items/${workItem.id}`}
                className="block rounded-lg border border-outline-variant p-3 transition-colors hover:bg-surface-container-high"
              >
                <p className="mb-2 text-body-md text-on-surface">
                  <span className="mr-2 font-mono text-outline">#{workItem.id}</span>
                  {workItem.title}
                </p>
                <div className="flex items-center gap-2">
                  <StatusPill state={workItem.state} />
                  <SchedulePill flag={workItem.scheduleFlag} />
                </div>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
