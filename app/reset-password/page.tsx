import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <div className="w-full">
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary">
          <span className="material-symbols-outlined text-[20px]">insights</span>
        </div>
        <span className="text-body-lg font-semibold text-on-surface">Project Status Report</span>
      </div>

      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface">Definir senha</h1>
        <p className="mt-1.5 text-body-md text-on-surface-variant">Escolha uma nova senha de acesso.</p>
      </div>

      <ResetPasswordForm token={searchParams.token ?? null} />
    </div>
  );
}
