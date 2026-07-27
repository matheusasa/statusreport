import type { ProjectMember } from "@/lib/projects";
import { SprintSummary } from "@/lib/types";

export interface MeetingFormValues {
  title: string;
  meetingDate: string; // yyyy-mm-dd
  startTime: string;
  endTime: string;
  location: string;
  participants: string[];
  agenda: string;
  minutes: string;
  sprintNumber: string; // "" or number as string
  workItemId: string; // "" or number as string
}

const EMPTY_VALUES: MeetingFormValues = {
  title: "",
  meetingDate: "",
  startTime: "",
  endTime: "",
  location: "",
  participants: [],
  agenda: "",
  minutes: "",
  sprintNumber: "",
  workItemId: "",
};

function inputClass() {
  return "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none";
}

function labelClass() {
  return "mb-1 block font-mono text-label-mono uppercase tracking-wider text-outline";
}

export function MeetingForm({
  action,
  sprints,
  projectMembers,
  initial = EMPTY_VALUES,
  submitLabel = "Salvar Reunião",
  allowAttachments = true,
}: {
  action: (formData: FormData) => void;
  sprints: SprintSummary[];
  projectMembers: ProjectMember[];
  initial?: MeetingFormValues;
  submitLabel?: string;
  allowAttachments?: boolean;
}) {
  const memberNames = new Set(projectMembers.map((m) => m.name));
  const otherParticipants = initial.participants.filter((p) => !memberNames.has(p)).join(", ");

  return (
    <form action={action} className="space-y-6">
      <div className="card space-y-4 p-6 shadow-card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass()}>Título *</label>
            <input name="title" required defaultValue={initial.title} className={inputClass()} placeholder="Ex.: Refinamento Sprint 07" />
          </div>
          <div>
            <label className={labelClass()}>Data *</label>
            <input type="date" name="meetingDate" required defaultValue={initial.meetingDate} className={inputClass()} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass()}>Início</label>
              <input type="time" name="startTime" defaultValue={initial.startTime} className={inputClass()} />
            </div>
            <div>
              <label className={labelClass()}>Fim</label>
              <input type="time" name="endTime" defaultValue={initial.endTime} className={inputClass()} />
            </div>
          </div>
          <div>
            <label className={labelClass()}>Local / Link</label>
            <input name="location" defaultValue={initial.location} className={inputClass()} placeholder="Google Meet, Sala 3, etc." />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass()}>Participantes</label>
            {projectMembers.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-4 rounded-lg border border-outline-variant p-3">
                {projectMembers.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-body-md text-on-surface-variant">
                    <input
                      type="checkbox"
                      name="participants"
                      value={m.name}
                      defaultChecked={initial.participants.includes(m.name)}
                      className="rounded border-outline-variant"
                    />
                    {m.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-body-md text-on-surface-variant">
                Nenhum usuário vinculado a este projeto ainda — vincule em Usuários.
              </p>
            )}
            <input
              name="participantsOther"
              defaultValue={otherParticipants}
              className={`${inputClass()} mt-2`}
              placeholder="Outros participantes, separados por vírgula (ex.: convidados externos)"
            />
          </div>
          <div>
            <label className={labelClass()}>Sprint relacionada</label>
            <select name="sprintNumber" defaultValue={initial.sprintNumber} className={inputClass()}>
              <option value="">Nenhuma</option>
              {sprints.map((s) => (
                <option key={s.sprintNumber} value={s.sprintNumber}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass()}>ID da demanda relacionada</label>
            <input
              type="number"
              name="workItemId"
              defaultValue={initial.workItemId}
              className={inputClass()}
              placeholder="Ex.: 1590 (opcional)"
            />
          </div>
        </div>
      </div>

      <div className="card space-y-4 p-6 shadow-card">
        <div>
          <label className={labelClass()}>Pauta</label>
          <textarea
            name="agenda"
            defaultValue={initial.agenda}
            rows={4}
            className={inputClass()}
            placeholder="O que será discutido nesta reunião..."
          />
        </div>
        <div>
          <label className={labelClass()}>Ata</label>
          <textarea
            name="minutes"
            defaultValue={initial.minutes}
            rows={6}
            className={inputClass()}
            placeholder="Decisões, encaminhamentos e próximos passos..."
          />
        </div>
      </div>

      {allowAttachments ? (
        <div className="card space-y-3 p-6 shadow-card">
          <label className={labelClass()}>Anexos</label>
          <input
            type="file"
            name="attachments"
            multiple
            className="block w-full text-body-md text-on-surface-variant file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-body-md file:font-semibold file:text-on-primary hover:file:opacity-90"
          />
        </div>
      ) : null}

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
