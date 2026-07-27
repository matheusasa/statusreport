const API_VERSION = "7.1";

/**
 * A single Personal Access Token + organization URL is used for every
 * Azure-DevOps-backed project (they must all live in the same ADO
 * organization). Configure via AZURE_DEVOPS_ORG_URL / AZURE_DEVOPS_PAT.
 */
function getConfig(): { orgUrl: string; pat: string } {
  const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;
  const pat = process.env.AZURE_DEVOPS_PAT;
  if (!orgUrl || !pat) {
    throw new Error(
      "Integração com Azure DevOps não configurada. Defina AZURE_DEVOPS_ORG_URL (ex.: https://dev.azure.com/sua-organizacao) e AZURE_DEVOPS_PAT no .env."
    );
  }
  return { orgUrl: orgUrl.replace(/\/+$/, ""), pat };
}

function authHeader(pat: string): string {
  return `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
}

interface WiqlResponse {
  workItems: { id: number; url: string }[];
}

async function fetchWorkItemIds(orgUrl: string, pat: string, projectName: string): Promise<number[]> {
  const url = `${orgUrl}/${encodeURIComponent(projectName)}/_apis/wit/wiql?api-version=${API_VERSION}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: authHeader(pat), "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project ORDER BY [System.Id]",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Falha ao consultar work items no Azure DevOps (HTTP ${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as WiqlResponse;
  return data.workItems.map((w) => w.id);
}

// Field reference names, mirroring the same underlying Azure DevOps fields
// used by the .parquet export (see the snake_case names read in
// lib/metrics.ts, e.g. custom_qavalidationandevidence -> Custom.QAValidationAndEvidence).
const FIELDS = [
  "System.Id",
  "System.WorkItemType",
  "System.Title",
  "System.State",
  "Microsoft.VSTS.Common.Priority",
  "System.IterationPath",
  "System.AssignedTo",
  "Microsoft.VSTS.Scheduling.StoryPoints",
  "Custom.HorasPrevistas",
  "Custom.Tamanho",
  "System.Parent",
  "System.CreatedDate",
  "System.ChangedDate",
  "Microsoft.VSTS.Common.StateChangeDate",
  "Microsoft.VSTS.Common.ResolvedDate",
  "Microsoft.VSTS.Common.ClosedDate",
  "System.Description",
  "Microsoft.VSTS.Common.AcceptanceCriteria",
  "Custom.QAValidationAndEvidence",
  "Custom.POApproval",
  "System.History",
  "Microsoft.VSTS.Common.Risk",
  "Microsoft.VSTS.Common.ValueArea",
  "System.Reason",
  "System.CreatedBy",
  "System.ChangedBy",
  "Microsoft.VSTS.Common.ClosedBy",
  "Microsoft.VSTS.Common.ResolvedBy",
  "System.CommentCount",
];

interface AzureWorkItemFields {
  [key: string]: unknown;
}

interface AzureWorkItem {
  id: number;
  fields: AzureWorkItemFields;
}

async function fetchWorkItemsBatch(orgUrl: string, pat: string, ids: number[]): Promise<AzureWorkItem[]> {
  if (ids.length === 0) return [];
  const url = `${orgUrl}/_apis/wit/workitemsbatch?api-version=${API_VERSION}`;

  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += 200) {
    chunks.push(ids.slice(i, i + 200));
  }

  const results: AzureWorkItem[] = [];
  for (const chunk of chunks) {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader(pat), "Content-Type": "application/json" },
      body: JSON.stringify({ ids: chunk, fields: FIELDS }),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(
        `Falha ao buscar detalhes dos work items no Azure DevOps (HTTP ${res.status}): ${await res.text()}`
      );
    }
    const data = (await res.json()) as { value: AzureWorkItem[] };
    results.push(...data.value);
  }
  return results;
}

function toDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isNaN(n) ? null : n;
}

function toStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    // Identity fields (AssignedTo, CreatedBy, ...) come back as
    // { displayName, uniqueName, ... } instead of a plain string.
    const displayName = (value as { displayName?: unknown }).displayName;
    return typeof displayName === "string" && displayName.trim() ? displayName.trim() : null;
  }
  const s = String(value).trim();
  return s.length ? s : null;
}

export interface MappedAzureWorkItem {
  id: number;
  type: string;
  title: string;
  state: string;
  priority: number | null;
  sprintPath: string | null;
  assignee: string | null;
  points: number | null;
  hoursPlanned: number | null;
  size: string | null;
  parentId: number | null;
  createdDate: Date | null;
  changedDate: Date | null;
  stateChangedDate: Date | null;
  resolvedDate: Date | null;
  closedDate: Date | null;
  url: string | null;
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

function mapAzureWorkItem(raw: AzureWorkItem, webUrl: string): MappedAzureWorkItem {
  const f = raw.fields;
  return {
    id: raw.id,
    type: toStr(f["System.WorkItemType"]) ?? "Unknown",
    title: toStr(f["System.Title"]) ?? "(sem título)",
    state: toStr(f["System.State"]) ?? "New",
    priority: toNumber(f["Microsoft.VSTS.Common.Priority"]),
    sprintPath: toStr(f["System.IterationPath"]),
    assignee: toStr(f["System.AssignedTo"]),
    points: toNumber(f["Microsoft.VSTS.Scheduling.StoryPoints"]),
    hoursPlanned: toNumber(f["Custom.HorasPrevistas"]),
    size: toStr(f["Custom.Tamanho"]),
    parentId: toNumber(f["System.Parent"]),
    createdDate: toDate(f["System.CreatedDate"]),
    changedDate: toDate(f["System.ChangedDate"]),
    stateChangedDate: toDate(f["Microsoft.VSTS.Common.StateChangeDate"]),
    resolvedDate: toDate(f["Microsoft.VSTS.Common.ResolvedDate"]),
    closedDate: toDate(f["Microsoft.VSTS.Common.ClosedDate"]),
    url: webUrl,
    description: toStr(f["System.Description"]),
    acceptanceCriteria: toStr(f["Microsoft.VSTS.Common.AcceptanceCriteria"]),
    qaValidation: toStr(f["Custom.QAValidationAndEvidence"]),
    poApproval: toStr(f["Custom.POApproval"]),
    history: toStr(f["System.History"]),
    risk: toStr(f["Microsoft.VSTS.Common.Risk"]),
    valueArea: toStr(f["Microsoft.VSTS.Common.ValueArea"]),
    reason: toStr(f["System.Reason"]),
    createdBy: toStr(f["System.CreatedBy"]),
    changedBy: toStr(f["System.ChangedBy"]),
    closedBy: toStr(f["Microsoft.VSTS.Common.ClosedBy"]),
    resolvedBy: toStr(f["Microsoft.VSTS.Common.ResolvedBy"]),
    commentCount: toNumber(f["System.CommentCount"]),
  };
}

/**
 * Fetches every work item belonging to `projectName` (an Azure DevOps
 * "team project" inside the configured organization) via the WIQL + work
 * items batch REST APIs, and maps them into our internal shape.
 */
export async function fetchProjectWorkItems(projectName: string): Promise<MappedAzureWorkItem[]> {
  const { orgUrl, pat } = getConfig();
  const ids = await fetchWorkItemIds(orgUrl, pat, projectName);
  const raw = await fetchWorkItemsBatch(orgUrl, pat, ids);
  return raw.map((item) => mapAzureWorkItem(item, `${orgUrl}/${encodeURIComponent(projectName)}/_workitems/edit/${item.id}`));
}
