type Tone = "default" | "primary" | "success" | "warning" | "error";

const TONE_STYLES: Record<Tone, { border: string; icon: string; iconBg: string }> = {
  default: { border: "border-l-outline-variant", icon: "text-on-surface-variant", iconBg: "bg-surface-container-high" },
  primary: { border: "border-l-primary", icon: "text-primary", iconBg: "bg-primary/10" },
  success: { border: "border-l-success", icon: "text-success", iconBg: "bg-success-container" },
  warning: { border: "border-l-warning", icon: "text-warning", iconBg: "bg-warning-container" },
  error: { border: "border-l-error", icon: "text-error", iconBg: "bg-error-container" },
};

export function KpiCard({
  label,
  value,
  sublabel,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: string;
  tone?: Tone;
}) {
  const t = TONE_STYLES[tone];
  return (
    <div className={`card border-l-4 ${t.border} p-5 shadow-card`}>
      <div className="flex items-start justify-between">
        <p className="font-mono text-label-mono uppercase tracking-wider text-outline">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-md ${t.iconBg}`}>
          <span className={`material-symbols-outlined text-[18px] ${t.icon}`}>{icon}</span>
        </span>
      </div>
      <p className="mt-2 text-headline-lg text-on-surface">{value}</p>
      {sublabel ? <p className="mt-1 text-body-md text-on-surface-variant">{sublabel}</p> : null}
    </div>
  );
}
