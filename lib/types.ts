export type ScheduleFlag = "late" | "ahead" | "on-track";
export type StateGroup = "done" | "active" | "backlog";

export interface WorkItem {
  id: number;
  type: string;
  title: string;
  state: string;
  stateGroup: StateGroup;
  priority: number | null;
  sprintPath: string | null;
  sprintNumber: number | null;
  sprintLabel: string;
  assignee: string | null;
  points: number | null;
  hoursPlanned: number | null;
  size: string | null;
  parentId: number | null;
  createdDate: string | null;
  changedDate: string | null;
  stateChangedDate: string | null;
  resolvedDate: string | null;
  closedDate: string | null;
  url: string | null;
  scheduleFlag: ScheduleFlag;
  description: string | null;
  acceptanceCriteria: string | null;
  qaValidation: string | null;
  poApproval: string | null;
  history: string | null;
  risk: string | null;
  valueArea: string | null;
  reason: string | null;
  createdBy: string | null;
  changedBy: string | null;
  closedBy: string | null;
  resolvedBy: string | null;
  commentCount: number | null;
}

export interface SprintSummary {
  sprintNumber: number;
  label: string;
  totalItems: number;
  doneItems: number;
  activeItems: number;
  backlogItems: number;
  totalPoints: number;
  donePoints: number;
  pendingPoints: number;
  pctDoneByPoints: number;
  pctDoneByItems: number;
  lateItems: number;
  aheadItems: number;
  phase: "concluida" | "andamento" | "planejada";
  isCurrent: boolean;
}

export interface Portfolio {
  items: WorkItem[];
  sprints: SprintSummary[];
  currentSprintNumber: number | null;
  backlog: WorkItem[];
  totals: {
    totalItems: number;
    doneItems: number;
    activeItems: number;
    backlogItems: number;
    totalPoints: number;
    donePoints: number;
    pendingPoints: number;
    lateItems: number;
    aheadItems: number;
    onTrackItems: number;
    pctDoneByPoints: number;
    pctDoneByItems: number;
  };
  assignees: { name: string; total: number; done: number; active: number; late: number; points: number }[];
  lastSyncedAt: string | null;
  sourceFiles: string[];
}
