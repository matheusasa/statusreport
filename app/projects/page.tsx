import { listAccessibleProjects, ProjectRecord } from "@/lib/projects";
import { requireManager } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { createProjectAction, deleteProjectAction, syncProjectAction } from "./actions";

export const dynamic = "force-dynamic";

function inputClass() {
  return "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none";
}

function labelClass() {
  return "mb-1 block font-mono text-label-mono uppercase tracking-wider text-outline";
}

export default async function ProjectsPage() {
  const user = await requireManager();
  const isAdmin = user.role === "ADMIN";
  const projects = await listAccessibleProjects(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projetos"
        subtitle="Cadastre outros projetos do Azure DevOps e sincronize os dados com o banco a qualquer momento."
      />

      <div className="card space-y-4 p-6 shadow-card">
        <h3 className="text-headline-md text-on-surface">Novo projeto</h3>
        <form action={createProjectAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass()}>Nome de exibição</label>
            <input name="name" required className={inputClass()} placeholder="Ex.: Projeto Fênix" />
          </div>
          <div>
            <label className={labelClass()}>Nome exato no Azure DevOps</label>
            <input
              name="azureDevOpsProjectName"
              required
              className={inputClass()}
              placeholder="Nome do Team Project na organização"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Criar projeto
            </button>
          </div>
        </form>
        <p className="text-body-md text-on-surface-variant">
          Todos os projetos usam a mesma organização e token do Azure DevOps, configurados em{" "}
          <code className="rounded bg-surface-container-highest px-1.5 py-0.5 font-mono text-label-mono">
            AZURE_DEVOPS_ORG_URL
          </code>{" "}
          /{" "}
          <code className="rounded bg-surface-container-highest px-1.5 py-0.5 font-mono text-label-mono">
            AZURE_DEVOPS_PAT
          </code>
          .
        </p>
      </div>

      <div className="space-y-3">
        {projects.map((p: ProjectRecord) => (
          <div key={p.id} className="card flex flex-wrap items-center justify-between gap-4 p-5 shadow-card">
            <div className="min-w-0">
              <p className="text-body-lg font-semibold text-on-surface">{p.name}</p>
              <p className="font-mono text-label-mono uppercase tracking-wider text-outline">
                {p.source === "PARQUET" ? "Arquivos parquet (data/)" : `Azure DevOps · ${p.azureDevOpsProjectName}`}
              </p>
              <p className="mt-1 text-body-md text-on-surface-variant">
                {p.lastSyncedAt
                  ? `Última sincronização: ${formatDateTime(new Date(p.lastSyncedAt).toISOString())}`
                  : "Ainda não sincronizado"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {p.source === "AZURE_DEVOPS" ? (
                <form action={syncProjectAction.bind(null, p.id)}>
                  <ConfirmSubmitButton
                    confirmMessage={`Sincronizar "${p.name}" agora? Isso substitui os dados atuais do projeto pelos dados mais recentes do Azure DevOps.`}
                    className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-body-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined text-[18px]">sync</span>
                    Sincronizar
                  </ConfirmSubmitButton>
                </form>
              ) : null}
              {isAdmin ? (
                <form action={deleteProjectAction.bind(null, p.id)}>
                  <ConfirmSubmitButton
                    confirmMessage={
                      p.source === "PARQUET"
                        ? `Excluir "${p.name}"? Isso remove reuniões, anexos e datas cadastradas para este projeto no banco. Os arquivos .parquet em /data não são apagados — se este for o único projeto restante, ele volta a aparecer sozinho na próxima vez que a lista de projetos for carregada. Essa ação não pode ser desfeita.`
                        : `Excluir "${p.name}"? Isso remove permanentemente todas as demandas sincronizadas, reuniões, anexos e datas cadastradas para este projeto. Essa ação não pode ser desfeita.`
                    }
                    className="flex items-center gap-2 rounded-lg border border-error/40 px-4 py-2 text-body-md font-semibold text-error transition-colors hover:bg-error-container"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Excluir
                  </ConfirmSubmitButton>
                </form>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
