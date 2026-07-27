import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage({ searchParams }: { searchParams: { redirect?: string } }) {
  const redirectTo = searchParams.redirect || "/";

  return (
    <div className="w-full">
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary">
          <span className="material-symbols-outlined text-[20px]">insights</span>
        </div>
        <span className="text-body-lg font-semibold text-on-surface">Project Status Report</span>
      </div>

      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface">Bem-vindo de volta</h1>
        <p className="mt-1.5 text-body-md text-on-surface-variant">Entre com sua conta para continuar.</p>
      </div>

      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
