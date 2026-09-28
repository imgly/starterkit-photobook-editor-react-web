/**
 * CE.SDK Photobook Server - Export API
 *
 * A small Express server that exports uploaded scene archives as
 * print-ready PDF/X-4 files through a job API:
 *
 * - `POST /api/export` - upload a scene archive, returns `{ jobId }`
 * - `GET /api/export/:id` - job status
 * - `GET /api/export/:id/file` - the finished PDF; the job is cleared
 *   once the download finished
 * - `DELETE /api/export/:id` - cancel and remove a job
 * - `GET /api/health` - readiness probe
 *
 * The server demonstrates the hardening patterns a public deployment
 * needs — request-body size caps, a bounded job queue, per-client
 * concurrency and rate limits, timeouts, and graceful shutdown — but
 * ships without TLS or authentication, so put a real gateway in front
 * before exposing it. Clients get a 429 and retry; nothing a client
 * sends can widen the limits.
 */

import 'dotenv/config';

import { createApp } from './http/routes.ts';
import {
  exportArchive,
  isExportWedged,
  validateSceneArchive
} from './imgly/export.ts';
import { jobs } from './jobs/store.ts';

// The vite dev server proxies /api to this port.
const PORT = 8080;

const app = createApp({
  run: exportArchive,
  isWedged: isExportWedged,
  validateArchive: validateSceneArchive,
  resultContentType: 'application/pdf'
});

const server = app.listen(PORT, () => {
  console.log(`Photobook export server on :${PORT}`);
});

// Graceful shutdown: stop accepting connections, give running exports a
// moment to finish, then exit.
const SHUTDOWN_TIMEOUT_MS = 10 * 1000;
function shutdown(): void {
  server.close(() => process.exit(0));
  jobs.forEach((job) => job.aborter.abort());
  setTimeout(() => process.exit(0), SHUTDOWN_TIMEOUT_MS).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
