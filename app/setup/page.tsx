import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createFirstAdminAction } from "./actions";

export const dynamic = "force-dynamic";

function fieldClass() {
  return "flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 transition-colors focus-within:border-primary";
}

function labelClass() {
  return "mb-1.5 block font-mono text-label-mono uppercase tracking-wider text-outline";
}

export default async function SetupPage() {
  const count = await prisma.user.count().catch(() => 0);
  if (count > 0) redirect("/login");

  return (
    <div className="w-full">
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary">
          <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
        </div>
        <span className="text-body-lg font-semibold text-on-surface">Project Status Report</span>
      </div>

      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface">Configuração inicial</h1>
        <p className="mt-1.5 text-body-md text-on-surface-variant">
          Crie a primeira conta de administrador. Novos usuários depois disso só podem ser criados por um admin.
        </p>
      </div>

      <form action={createFirstAdminAction} className="space-y-5">
        <div>
          <label className={labelClass()}>Nome</label>
          <div className={fieldClass()}>
            <span className="material-symbols-outlined text-[18px] text-outline">person</span>
            <input
              name="name"
              required
              className="w-full bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className={labelClass()}>Email</label>
          <div className={fieldClass()}>
            <span className="material-symbols-outlined text-[18px] text-outline">mail</span>
            <input
              type="email"
              name="email"
              required
              className="w-full bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className={labelClass()}>Senha</label>
          <div className={fieldClass()}>
            <span className="material-symbols-outlined text-[18px] text-outline">lock</span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          Criar administrador
        </button>
      </form>
    </div>
  );
}
