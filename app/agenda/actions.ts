"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addAttachment,
  archiveMeeting,
  createMeeting,
  deleteAttachment,
  deleteMeeting,
  getMeeting,
  publishMeeting,
  readMeetingFormData,
  unarchiveMeeting,
  updateMeeting,
} from "@/lib/meetings";
import { deleteFromS3, uploadToS3 } from "@/lib/s3";
import { upsertProjectInfo } from "@/lib/project-info";
import { getActiveProject } from "@/lib/active-project";
import { getProject } from "@/lib/projects";
import { requireManager } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sendMeetingPublishedEmail } from "@/lib/email";
import { formatDate } from "@/lib/format";

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

/**
 * Uploads every file attached to the form under `attachments` to S3
 * (key: `meetings/{meetingId}/{timestamp}-{filename}`) and records the
 * resulting key + metadata in the database. filePath on MeetingAttachment
 * stores the S3 object key, not a public URL — signed URLs are generated
 * on demand when rendering (see lib/s3.ts#getS3SignedUrl).
 */
async function saveAttachments(meetingId: string, formData: FormData) {
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;

  for (const file of files) {
    const key = `meetings/${meetingId}/${Date.now()}-${safeFileName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToS3(key, buffer, file.type || "application/octet-stream");

    await addAttachment(meetingId, {
      fileName: file.name,
      filePath: key,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
    });
  }
}

export async function createMeetingAction(formData: FormData) {
  const user = await requireManager();
  const input = readMeetingFormData(formData);
  if (!input.title || !input.meetingDate) {
    throw new Error("Título e data da reunião são obrigatórios.");
  }

  const project = await getActiveProject(user);
  if (!project) throw new Error("Nenhum projeto ativo.");

  const meeting = await createMeeting(project.id, input);
  await saveAttachments(meeting.id, formData);

  revalidatePath("/agenda");
  if (input.sprintNumber !== null) revalidatePath("/sprints");
  if (input.workItemId !== null) revalidatePath(`/work-items/${input.workItemId}`);

  redirect(`/agenda/${meeting.id}`);
}

export async function updateMeetingAction(id: string, formData: FormData) {
  await requireManager();
  const input = readMeetingFormData(formData);
  if (!input.title || !input.meetingDate) {
    throw new Error("Título e data da reunião são obrigatórios.");
  }

  await updateMeeting(id, input);
  await saveAttachments(id, formData);

  revalidatePath("/agenda");
  revalidatePath(`/agenda/${id}`);
  if (input.sprintNumber !== null) revalidatePath("/sprints");
  if (input.workItemId !== null) revalidatePath(`/work-items/${input.workItemId}`);

  redirect(`/agenda/${id}`);
}

export async function addAttachmentAction(meetingId: string, formData: FormData) {
  await requireManager();
  await saveAttachments(meetingId, formData);
  revalidatePath(`/agenda/${meetingId}`);
}

export async function deleteAttachmentAction(meetingId: string, attachmentId: string, s3Key: string) {
  await requireManager();
  await deleteAttachment(attachmentId);
  try {
    await deleteFromS3(s3Key);
  } catch (err) {
    // Object might already be gone, or S3 not configured yet — not fatal.
    console.error("Failed to remove attachment from S3:", err);
  }
  revalidatePath(`/agenda/${meetingId}`);
}

export async function deleteMeetingAction(id: string) {
  await requireManager();
  const meeting = await getMeeting(id);
  if (meeting) {
    for (const att of meeting.attachments) {
      try {
        await deleteFromS3(att.filePath);
      } catch (err) {
        console.error("Failed to remove attachment from S3:", err);
      }
    }
  }
  await deleteMeeting(id);
  revalidatePath("/agenda");
  redirect("/agenda");
}

/**
 * Publishes a draft meeting (visible to clients from then on) and emails
 * every CLIENT user with access to the meeting's project — the "ata
 * publicada" notification.
 */
export async function publishMeetingAction(id: string) {
  await requireManager();
  const meeting = await getMeeting(id);
  if (!meeting) throw new Error("Reunião não encontrada.");

  await publishMeeting(id);

  const [recipients, project] = await Promise.all([
    prisma.clientProjectAccess.findMany({
      where: { projectId: meeting.projectId, user: { role: "CLIENT", banned: false } },
      include: { user: true },
    }),
    getProject(meeting.projectId),
  ]);

  const baseUrl = (process.env.BETTER_AUTH_URL ?? "").replace(/\/+$/, "");
  const meetingUrl = `${baseUrl}/agenda/${id}`;

  await Promise.all(
    recipients.map((r: { user: { email: string } }) =>
      sendMeetingPublishedEmail(r.user.email, {
        projectName: project?.name ?? "Projeto",
        meetingTitle: meeting.title,
        meetingDateLabel: formatDate(meeting.meetingDate.toISOString()),
        minutesPreview: meeting.minutes ? meeting.minutes.slice(0, 400) : null,
        meetingUrl,
      })
    )
  );

  revalidatePath("/agenda");
  revalidatePath(`/agenda/${id}`);
}

/** Tucks a published meeting away as archived — still visible to clients. */
export async function archiveMeetingAction(id: string) {
  await requireManager();
  await archiveMeeting(id);
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${id}`);
}

export async function unarchiveMeetingAction(id: string) {
  await requireManager();
  await unarchiveMeeting(id);
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${id}`);
}

export async function updateProjectInfoAction(formData: FormData) {
  const user = await requireManager();
  const startDate = (formData.get("startDate") as string) || null;
  const endDate = (formData.get("endDate") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  const project = await getActiveProject(user);
  if (!project) throw new Error("Nenhum projeto ativo.");

  await upsertProjectInfo(project.id, { startDate, endDate, notes });
  revalidatePath("/");
}
