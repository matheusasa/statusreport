const STYLE: Record<string, string> = {
  DRAFT: "bg-warning-container text-warning border-warning/30",
  PUBLISHED: "bg-success-container text-success border-success/30",
  ARCHIVED: "bg-surface-container-highest text-on-surface-variant border-outline-variant",
};

const LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicada",
  ARCHIVED: "Arquivada",
};

export function MeetingStatusPill({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 font-mono text-label-mono uppercase tracking-wider ${
        STYLE[status] ?? STYLE.DRAFT
      }`}
    >
      {LABEL[status] ?? status}
    </span>
  );
}
