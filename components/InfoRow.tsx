export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <p className="font-mono text-label-mono uppercase tracking-wider text-outline">{label}</p>
      <div className="text-right text-body-md text-on-surface">{value ?? "—"}</div>
    </div>
  );
}
