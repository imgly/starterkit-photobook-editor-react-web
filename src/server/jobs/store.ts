/**
 * CE.SDK Photobook Server - Job Store
 *
 * Holds the export jobs and the per-client rate windows, and expires both.
 */

import type {
  ExportJobPhase,
  ExportJobStatus
} from '../../shared/export-api.ts';

/** Jobs waiting or running at once, across all clients. */
export const MAX_ACTIVE_JOBS = 3;
/** Jobs waiting or running at once, per client. */
export const MAX_ACTIVE_JOBS_PER_CLIENT = 1;
/** Exports a client may start per window. */
const MAX_EXPORTS_PER_WINDOW = 10;
const EXPORT_WINDOW_MS = 10 * 60 * 1000;
/** How long a finished job (and its result) is kept for pickup. */
const RESULT_TTL_MS = 5 * 60 * 1000;
/** A job running longer than this is given up on, freeing its slot. */
const PENDING_JOB_TIMEOUT_MS = 15 * 60 * 1000;
/** The longest a job can wait behind others and still run. */
const UNSTARTED_JOB_TIMEOUT_MS = (MAX_ACTIVE_JOBS + 1) * PENDING_JOB_TIMEOUT_MS;

export interface ExportJob {
  id: string;
  client: string;
  status: ExportJobStatus;
  phase: ExportJobPhase;
  /** The uploaded archive; released on cancel and after the export ran. */
  archive: Buffer | null;
  result: Buffer | null;
  error: string | null;
  aborter: AbortController;
  createdAt: number;
  /** Null while the job is still queued. */
  startedAt: number | null;
  finishedAt: number | null;
}

export const jobs = new Map<string, ExportJob>();
const exportWindows = new Map<string, { start: number; count: number }>();

export function activeJobs(client?: string): number {
  return [...jobs.values()].filter(
    (job) =>
      job.status === 'pending' && (client == null || job.client === client)
  ).length;
}

/** True while the client has exports left in its window. */
export function hasExportBudget(client: string): boolean {
  const window = exportWindows.get(client);
  if (window == null || Date.now() - window.start > EXPORT_WINDOW_MS) {
    return true;
  }
  return window.count < MAX_EXPORTS_PER_WINDOW;
}

/** Counts one export against the client's window. */
export function consumeExportBudget(client: string): void {
  const now = Date.now();
  const window = exportWindows.get(client);
  if (window == null || now - window.start > EXPORT_WINDOW_MS) {
    exportWindows.set(client, { start: now, count: 1 });
    return;
  }
  window.count += 1;
}

export function removeJob(id: string): void {
  const job = jobs.get(id);
  if (job == null) return;
  job.aborter.abort();
  job.archive = null;
  jobs.delete(id);
}

// Uncollected results, given-up pending jobs, and stale rate windows
// expire, so memory and the job slots stay bounded without a client's
// cooperation.
setInterval(() => {
  const now = Date.now();
  jobs.forEach((job, id) => {
    const expired =
      (job.finishedAt != null && now - job.finishedAt > RESULT_TTL_MS) ||
      (job.status === 'pending' &&
        (job.startedAt != null
          ? now - job.startedAt > PENDING_JOB_TIMEOUT_MS
          : now - job.createdAt > UNSTARTED_JOB_TIMEOUT_MS));
    if (expired) removeJob(id);
  });
  exportWindows.forEach((window, client) => {
    if (now - window.start > EXPORT_WINDOW_MS) exportWindows.delete(client);
  });
}, 60 * 1000).unref();
