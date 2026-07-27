import { formatDate } from "@/lib/format";
import { updateProjectInfoAction } from "@/app/agenda/actions";
import { ProgressBar } from "./ProgressBar";

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function ProjectDatesCard({
  startDate,
  endDate,
  notes,
  pctDoneByPoints,
  canEdit = true,
}: {
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  pctDoneByPoints: number;
  canEdit?: boolean;
}) {
  let pctTimeElapsed: number | null = null;
  if (startDate && endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    if (end > start) {
      pctTimeElapsed = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
    }
  }

  return (
    <div className="card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-label-mono uppercase tracking-wider text-outline">Período do Projeto</p>
          {startDate || endDate ? (
            <p className="mt-1 text-body-lg text-on-surface">
              {startDate ? formatDate(startDate) : "?"} <span className="text-outline">→</span>{" "}
              {endDate ? formatDate(endDate) : "?"}
            </p>
          ) : (
            <p className="mt-1 text-body-lg text-on-surface-variant">Datas ainda não definidas</p>
          )}
          {notes ? <p className="mt-1 text-body-md text-on-surface-variant">{notes}</p> : null}
        </div>

        {pctTimeElapsed !== null ? (
          <div className="min-w-[220px] flex-1 max-w-sm">
            <div className="mb-1 flex justify-between font-mono text-label-mono text-outline">
              <span>{Math.round(pctTimeElapsed)}% do tempo decorrido</span>
              <span>{pctDoneByPoints}% do trabalho concluído</span>
            </div>
            <div className="relative">
              <ProgressBar pct={pctTimeElapsed} colorClass="bg-outline" />
              <div className="absolute inset-0">
                <ProgressBar pct={pctDoneByPoints} colorClass="bg-primary" />
              </div>
            </div>
            {pctTimeElapsed - pctDoneByPoints > 15 ? (
              <p className="mt-1.5 text-body-md text-error">Ritmo abaixo do cronograma.</p>
            ) : null}
          </div>
        ) : null}

        {canEdit ? (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-body-md text-on-surface transition-colors hover:bg-surface-container-high">
            <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
            {startDate || endDate ? "Editar" : "Definir datas"}
          </summary>
          <form action={updateProjectInfoAction} className="mt-4 w-full space-y-3 border-t border-outline-variant pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-mono text-label-mono uppercase tracking-wider text-outline">
                  Início
                </label>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={toDateInputValue(startDate)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-label-mono uppercase tracking-wider text-outline">Fim</label>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={toDateInputValue(endDate)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block font-mono text-label-mono uppercase tracking-wider text-outline">
                Observações
              </label>
              <input
                name="notes"
                defaultValue={notes ?? ""}
                placeholder="Ex.: datas contratuais, marco de go-live..."
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90"
            >
              Salvar
            </button>
          </form>
        </details>
        ) : null}
      </div>
    </div>
  );
}
