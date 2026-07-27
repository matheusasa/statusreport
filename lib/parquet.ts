import path from "path";
import fs from "fs";
import { asyncBufferFromFile, parquetReadObjects } from "hyparquet";

const DATA_DIR = path.join(process.cwd(), "data");

export interface RawRow {
  [key: string]: unknown;
}

/**
 * Reads every .parquet file inside /data, and merges rows by work_item_id,
 * keeping the most recent revision of each item (highest system_rev, falling
 * back to changeddate). This lets the app stay correct across successive
 * Azure DevOps exports, even if a newer export only contains a subset of
 * items (e.g. an incremental sync).
 */
export async function loadWorkItemRows(): Promise<{ rows: RawRow[]; sourceFiles: string[] }> {
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(DATA_DIR)
      .filter((f) => f.toLowerCase().endsWith(".parquet"))
      .sort();
  } catch {
    return { rows: [], sourceFiles: [] };
  }

  const byId = new Map<number, RawRow>();

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    try {
      const buffer = await asyncBufferFromFile(filePath);
      const rows = (await parquetReadObjects({ file: buffer })) as RawRow[];
      for (const row of rows) {
        const id = Number(row.work_item_id ?? row.system_id);
        if (!id || Number.isNaN(id)) continue;
        const existing = byId.get(id);
        if (!existing) {
          byId.set(id, row);
          continue;
        }
        const existingRev = Number(existing.system_rev ?? existing.rev ?? 0);
        const incomingRev = Number(row.system_rev ?? row.rev ?? 0);
        if (incomingRev >= existingRev) {
          byId.set(id, row);
        }
      }
    } catch (err) {
      console.error(`Failed to read parquet file ${file}:`, err);
    }
  }

  return { rows: Array.from(byId.values()), sourceFiles: files };
}
