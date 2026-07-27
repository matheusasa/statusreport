export function ProgressBar({
  pct,
  colorClass = "bg-primary",
  height = "h-1.5",
}: {
  pct: number;
  colorClass?: string;
  height?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={`progress-track w-full ${height}`}>
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
