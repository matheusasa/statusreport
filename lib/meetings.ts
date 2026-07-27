import { prisma } from "./prisma";

export interface MeetingFormInput {
  title: string;
  meetingDate: string; // yyyy-mm-dd
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  participants: string[];
  agenda: string | null;
  minutes: string | null;
  sprintNumber: number | null;
  workItemId: number | null;
}

function parseParticipants(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function readMeetingFormData(formData: FormData): MeetingFormInput {
  const sprintRaw = formData.get("sprintNumber");
  const workItemRaw = formData.get("workItemId");

  // "participants" is a set of checkboxes (one per project member, see
  // components/MeetingForm.tsx) carrying the member's name as the value;
  // "participantsOther" is a free-text, comma-separated field for people who
  // aren't linked to the project (e.g. a one-off guest). Both feed the same
  // string[] column, deduplicated.
  const selected = formData.getAll("participants").map(String).filter(Boolean);
  const others = parseParticipants(formData.get("participantsOther") as string | null);
  const participants = Array.from(new Set([...selected, ...others]));

  return {
    title: String(formData.get("title") ?? "").trim(),
    meetingDate: String(formData.get("meetingDate") ?? ""),
    startTime: (formData.get("startTime") as string) || null,
    endTime: (formData.get("endTime") as string) || null,
    location: (formData.get("location") as string) || null,
    participants,
    agenda: (formData.get("agenda") as string) || null,
    minutes: (formData.get("minutes") as string) || null,
    sprintNumber: sprintRaw && sprintRaw !== "" ? Number(sprintRaw) : null,
    workItemId: workItemRaw && workItemRaw !== "" ? Number(workItemRaw) : null,
  };
}

// All reads/writes below are scoped by projectId: sprint numbers and work
// item ids are only unique *within* a project's own timeline, so mixing
// projects together would attach a meeting to the wrong sprint/demand.
//
// `includeDrafts` gates DRAFT meetings out for clients — only admins/
// managers (see lib/session.ts) should ever pass includeDrafts: true.
// Clients still see PUBLISHED *and* ARCHIVED meetings (archiving just tucks
// an old meeting out of the main list — it's a organizational state, not a
// visibility one, unlike DRAFT).
const NON_DRAFT_STATUSES = ["PUBLISHED", "ARCHIVED"] as const;

export async function listMeetings(projectId: string, opts: { includeDrafts: boolean } = { includeDrafts: true }) {
  return prisma.meeting.findMany({
    where: { projectId, ...(opts.includeDrafts ? {} : { status: { in: NON_DRAFT_STATUSES } }) },
    orderBy: { meetingDate: "desc" },
    include: { attachments: true },
  });
}

export async function getMeeting(id: string) {
  return prisma.meeting.findUnique({
    where: { id },
    include: { attachments: { orderBy: { uploadedAt: "asc" } } },
  });
}

export type MeetingListItem = Awaited<ReturnType<typeof listMeetings>>[number];
export type MeetingDetail = NonNullable<Awaited<ReturnType<typeof getMeeting>>>;
export type MeetingAttachmentItem = MeetingDetail["attachments"][number];

export async function listMeetingsForSprint(
  projectId: string,
  sprintNumber: number,
  opts: { includeDrafts: boolean } = { includeDrafts: true }
) {
  return prisma.meeting.findMany({
    where: { projectId, sprintNumber, ...(opts.includeDrafts ? {} : { status: { in: NON_DRAFT_STATUSES } }) },
    orderBy: { meetingDate: "desc" },
    include: { attachments: true },
  });
}

export async function listMeetingsForWorkItem(
  projectId: string,
  workItemId: number,
  opts: { includeDrafts: boolean } = { includeDrafts: true }
) {
  return prisma.meeting.findMany({
    where: { projectId, workItemId, ...(opts.includeDrafts ? {} : { status: { in: NON_DRAFT_STATUSES } }) },
    orderBy: { meetingDate: "desc" },
    include: { attachments: true },
  });
}

export async function createMeeting(projectId: string, input: MeetingFormInput) {
  return prisma.meeting.create({
    data: {
      projectId,
      title: input.title,
      meetingDate: new Date(input.meetingDate),
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      participants: input.participants,
      agenda: input.agenda,
      minutes: input.minutes,
      sprintNumber: input.sprintNumber,
      workItemId: input.workItemId,
    },
  });
}

export async function updateMeeting(id: string, input: MeetingFormInput) {
  return prisma.meeting.update({
    where: { id },
    data: {
      title: input.title,
      meetingDate: new Date(input.meetingDate),
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      participants: input.participants,
      agenda: input.agenda,
      minutes: input.minutes,
      sprintNumber: input.sprintNumber,
      workItemId: input.workItemId,
    },
  });
}

export async function deleteMeeting(id: string) {
  return prisma.meeting.delete({ where: { id } });
}

/** Marks a meeting as published (visible to clients from then on). */
export async function publishMeeting(id: string) {
  return prisma.meeting.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
}

/** Tucks a published meeting away as archived — still visible to clients, just organized apart. */
export async function archiveMeeting(id: string) {
  return prisma.meeting.update({
    where: { id },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });
}

/** Moves an archived meeting back to published. */
export async function unarchiveMeeting(id: string) {
  return prisma.meeting.update({
    where: { id },
    data: { status: "PUBLISHED", archivedAt: null },
  });
}

export async function addAttachment(
  meetingId: string,
  file: { fileName: string; filePath: string; fileSize: number; mimeType: string }
) {
  return prisma.meetingAttachment.create({
    data: {
      meetingId,
      fileName: file.fileName,
      filePath: file.filePath,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
    },
  });
}

export async function deleteAttachment(id: string) {
  return prisma.meetingAttachment.delete({ where: { id } });
}
