import Link from "next/link";
import { getPortfolio } from "@/lib/metrics";
import { getActiveProject } from "@/lib/active-project";
import { listProjectMembers } from "@/lib/projects";
import { requireManager } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { MeetingForm } from "@/components/MeetingForm";
import { createMeetingAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewMeetingPage() {
  const user = await requireManager();
  const project = await getActiveProject(user);
  if (!project) throw new Error("Nenhum projeto ativo.");
  const [portfolio, projectMembers] = await Promise.all([getPortfolio(project), listProjectMembers(project.id)]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-body-md text-on-surface-variant">
        <Link href="/agenda" className="hover:text-primary hover:underline">
          Agenda
        </Link>
        <span className="text-outline">/</span>
        <span className="text-on-surface">Nova reunião</span>
      </div>

      <PageHeader title="Nova Reunião" subtitle="Registre a pauta agora e volte depois para preencher a ata." />

      <MeetingForm
        action={createMeetingAction}
        sprints={portfolio.sprints}
        projectMembers={projectMembers}
        submitLabel="Criar Reunião"
      />
    </div>
  );
}
