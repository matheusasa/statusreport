const FEATURES = [
  {
    icon: "event_repeat",
    title: "Sprints em tempo real",
    description: "Pontos planejados, concluídos e itens fora do prazo, sprint a sprint.",
  },
  {
    icon: "calendar_month",
    title: "Agenda centralizada",
    description: "Pautas, atas e anexos de cada reunião num só lugar.",
  },
  {
    icon: "group",
    title: "Acesso por papel",
    description: "Admin, gerente e cliente — cada um vê exatamente o que precisa.",
  },
];

/**
 * Decorative panel shown on the right side of every public/auth page
 * (login, forgot/reset password, setup) — see the "no user" branch of
 * app/layout.tsx. Purely presentational, hidden below the lg breakpoint so
 * mobile users just get the form.
 */
export function AuthSidePanel() {
  return (
    <div className="relative hidden w-[44%] shrink-0 overflow-hidden border-l border-outline-variant bg-surface-container-lowest lg:flex lg:flex-col lg:justify-between">
      {/* decorative background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-[360px] w-[360px] rounded-full bg-secondary/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle, #e7e0e9 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative flex flex-1 flex-col justify-center px-12 py-16 xl:px-16">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-on-primary">
            <span className="material-symbols-outlined text-[24px]">insights</span>
          </div>
          <span className="text-body-lg font-semibold text-on-surface">Project Status Report</span>
        </div>

        <h2 className="max-w-md text-display-lg text-on-surface">
          Visibilidade total do seu projeto, em um só lugar.
        </h2>
        <p className="mt-4 max-w-sm text-body-lg text-on-surface-variant">
          Dados sincronizados direto do Azure DevOps — sprints, demandas e reuniões sempre atualizados.
        </p>

        <div className="mt-12 space-y-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low">
                <span className="material-symbols-outlined text-[20px] text-primary">{f.icon}</span>
              </div>
              <div>
                <p className="text-body-lg font-semibold text-on-surface">{f.title}</p>
                <p className="text-body-md text-on-surface-variant">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative border-t border-outline-variant px-12 py-6 xl:px-16">
        <p className="font-mono text-label-mono uppercase tracking-wider text-outline">
          Acesso restrito · convite de um administrador
        </p>
      </div>
    </div>
  );
}
