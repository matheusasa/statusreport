import { prisma } from "@/lib/prisma";
import { listProjects, ProjectRecord } from "@/lib/projects";
import { requireAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { AutoSubmitSelect } from "@/components/AutoSubmitSelect";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import {
  inviteUserAction,
  resendSetPasswordAction,
  toggleBanAction,
  updateProjectAccessAction,
  updateRoleAction,
} from "./actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Gerente",
  CLIENT: "Cliente",
};

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Gerente de projetos" },
  { value: "CLIENT", label: "Cliente" },
];

function inputClass() {
  return "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none";
}

function labelClass() {
  return "mb-1 block font-mono text-label-mono uppercase tracking-wider text-outline";
}

export default async function AdminUsersPage() {
  const currentAdmin = await requireAdmin();
  const [users, projects] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: { projectAccess: { include: { project: true } } },
    }),
    listProjects(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        subtitle="Cadastro só acontece por convite de um administrador — não há tela de sign-up pública."
      />

      <div className="card space-y-4 p-6 shadow-card">
        <h3 className="text-headline-md text-on-surface">Convidar usuário</h3>
        <form action={inviteUserAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass()}>Nome</label>
              <input name="name" required className={inputClass()} />
            </div>
            <div>
              <label className={labelClass()}>Email</label>
              <input type="email" name="email" required className={inputClass()} />
            </div>
            <div>
              <label className={labelClass()}>Cargo</label>
              <select name="role" defaultValue="CLIENT" className={inputClass()}>
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass()}>Projetos visíveis (não se aplica a Admins, que veem tudo)</label>
            <div className="mt-1 flex flex-wrap gap-4 rounded-lg border border-outline-variant p-3">
              {projects.length === 0 ? (
                <span className="text-body-md text-on-surface-variant">Nenhum projeto cadastrado ainda.</span>
              ) : (
                projects.map((p: ProjectRecord) => (
                  <label key={p.id} className="flex items-center gap-2 text-body-md text-on-surface-variant">
                    <input type="checkbox" name="projectIds" value={p.id} className="rounded border-outline-variant" />
                    {p.name}
                  </label>
                ))
              )}
            </div>
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Enviar convite
          </button>
        </form>
        <p className="text-body-md text-on-surface-variant">
          O convidado recebe um email para definir a própria senha (mesmo fluxo de &quot;esqueci minha senha&quot;).
        </p>
      </div>

      <div className="space-y-3">
        {users.map((u: (typeof users)[number]) => {
          const accessibleProjectIds = new Set(
            u.projectAccess.map((a: (typeof u.projectAccess)[number]) => a.projectId)
          );
          return (
            <div key={u.id} className="card p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-body-lg font-semibold text-on-surface">
                    {u.name}
                    {u.id === currentAdmin.id ? <span className="ml-2 text-body-md text-outline">(você)</span> : null}
                    {u.banned ? (
                      <span className="ml-2 rounded-full border border-error/40 bg-error-container px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-error">
                        Bloqueado
                      </span>
                    ) : null}
                  </p>
                  <p className="text-body-md text-on-surface-variant">{u.email}</p>
                  <p className="mt-1 font-mono text-label-mono text-outline">
                    Criado em {formatDateTime(u.createdAt.toISOString())}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <form action={updateRoleAction.bind(null, u.id)}>
                    <AutoSubmitSelect
                      name="role"
                      defaultValue={u.role}
                      options={ROLE_OPTIONS}
                      className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-md text-on-surface focus:border-primary focus:outline-none"
                    />
                  </form>

                  <form action={resendSetPasswordAction.bind(null, u.email)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-outline-variant px-3 py-1.5 text-body-md text-on-surface transition-colors hover:bg-surface-container-high"
                    >
                      Reenviar link de senha
                    </button>
                  </form>

                  <form action={toggleBanAction.bind(null, u.id, Boolean(u.banned))}>
                    <ConfirmSubmitButton
                      confirmMessage={
                        u.banned ? `Desbloquear o acesso de ${u.name}?` : `Bloquear o acesso de ${u.name}?`
                      }
                      className={`rounded-lg border px-3 py-1.5 text-body-md transition-colors ${
                        u.banned
                          ? "border-outline-variant text-on-surface hover:bg-surface-container-high"
                          : "border-error/40 text-error hover:bg-error-container"
                      }`}
                    >
                      {u.banned ? "Desbloquear" : "Bloquear"}
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>

              {u.role !== "ADMIN" ? (
                <details className="mt-4 border-t border-outline-variant pt-4">
                  <summary className="cursor-pointer text-body-md font-semibold text-on-surface">
                    Projetos visíveis para {u.role === "MANAGER" ? "este gerente" : "este cliente"} (
                    {accessibleProjectIds.size})
                  </summary>
                  <form action={updateProjectAccessAction.bind(null, u.id)} className="mt-3 space-y-3">
                    <div className="flex flex-wrap gap-4">
                      {projects.map((p: ProjectRecord) => (
                        <label key={p.id} className="flex items-center gap-2 text-body-md text-on-surface-variant">
                          <input
                            type="checkbox"
                            name="projectIds"
                            value={p.id}
                            defaultChecked={accessibleProjectIds.has(p.id)}
                            className="rounded border-outline-variant"
                          />
                          {p.name}
                        </label>
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="rounded-lg border border-outline-variant px-3 py-1.5 text-body-md text-on-surface transition-colors hover:bg-surface-container-high"
                    >
                      Salvar acesso
                    </button>
                  </form>
                </details>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
