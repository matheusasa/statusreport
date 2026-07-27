const STATE_STYLES: Record<string, string> = {
  New: "bg-surface-container-highest text-on-surface-variant border-outline-variant",
  Refined: "bg-secondary-container text-on-secondary-container border-transparent",
  "Technical Refinement": "bg-secondary-container text-on-secondary-container border-transparent",
  "A Refinar": "bg-secondary-container text-on-secondary-container border-transparent",
  Active: "bg-primary-container/20 text-primary border-primary/40",
  "In Progress": "bg-primary-container/20 text-primary border-primary/40",
  "Tests Done": "bg-tertiary-container/30 text-tertiary border-tertiary/40",
  "Pending Publish": "bg-tertiary-container/30 text-tertiary border-tertiary/40",
  Resolved: "bg-success-container text-success border-success/30",
  Closed: "bg-success-container text-success border-success/30",
};

export function StatusPill({ state }: { state: string }) {
  const style = STATE_STYLES[state] ?? "bg-surface-container-highest text-on-surface-variant border-outline-variant";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-label-mono uppercase tracking-wider ${style}`}
    >
      {state}
    </span>
  );
}

const SCHEDULE_STYLES: Record<string, { label: string; style: string }> = {
  late: { label: "Atrasado", style: "bg-error-container text-error border-error/30" },
  ahead: { label: "Adiantado", style: "bg-success-container text-success border-success/30" },
  "on-track": { label: "No prazo", style: "bg-surface-container-highest text-on-surface-variant border-outline-variant" },
};

export function SchedulePill({ flag }: { flag: string }) {
  const item = SCHEDULE_STYLES[flag] ?? SCHEDULE_STYLES["on-track"];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-label-mono uppercase tracking-wider ${item.style}`}
    >
      {item.label}
    </span>
  );
}
