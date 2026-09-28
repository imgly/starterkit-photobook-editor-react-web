/**
 * CE.SDK Photobook Server - HTTP Layer
 *
 * The job API's routes, admission middleware, and error handling. The
 * exporter is injected, so nothing here knows what is being exported.
 */

import { randomUUID } from 'node:crypto';

import express from 'express';

import type { ExportJobPhase } from '../../shared/export-api.ts';
import {
  activeJobs,
  consumeExportBudget,
  hasExportBudget,
  jobs,
  removeJob,
  MAX_ACTIVE_JOBS,
  MAX_ACTIVE_JOBS_PER_CLIENT,
  type ExportJob
} from '../jobs/store.ts';

const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;

interface Exporter {
  /** Runs one export; resolves with the finished file. */
  run: (
    getArchive: () => Buffer | null,
    signal: AbortSignal,
    onPhase: (phase: ExportJobPhase) => void
  ) => Promise<Buffer>;
  /** True while the exporter may be unusable. */
  isWedged: () => boolean;
  /** Returns an error message, or null when the body is acceptable. */
  validateArchive: (archive: Buffer) => string | null;
  resultContentType: string;
}

export function createApp(exporter: Exporter): express.Express {
  const app = express();
  // Trust only a local reverse proxy (like the vite dev server) for the
  // client address, otherwise a client could spoof its way past the
  // per-client limits with a forged Forwarded-For header.
  app.set('trust proxy', 'loopback');

  app.get('/api/health', (request, response) => {
    response.json({
      status: exporter.isWedged() ? 'degraded' : 'ok',
      activeJobs: activeJobs()
    });
  });

  let admitting = 0;
  const admittingPerClient = new Map<string, number>();

  /**
   * Rejects oversized and over-limit requests before Express buffers the
   * body, so a burst of large uploads cannot exhaust memory first.
   */
  function admitExport(
    request: express.Request,
    response: express.Response,
    next: express.NextFunction
  ): void {
    const contentLength = Number(request.headers['content-length'] ?? 0);
    if (contentLength > MAX_ARCHIVE_BYTES) {
      response.status(413).json({ error: 'The archive is too large' });
      return;
    }
    const client = request.ip ?? 'unknown';
    // Counted here rather than at job creation: the job is registered only
    // after the body is buffered, so concurrent uploads would all pass.
    if (
      activeJobs() + admitting >= MAX_ACTIVE_JOBS ||
      activeJobs(client) + (admittingPerClient.get(client) ?? 0) >=
        MAX_ACTIVE_JOBS_PER_CLIENT ||
      !hasExportBudget(client)
    ) {
      response
        .status(429)
        .json({ error: 'Too many exports, try again in a moment' });
      return;
    }
    admitting += 1;
    admittingPerClient.set(client, (admittingPerClient.get(client) ?? 0) + 1);
    response.on('close', () => {
      admitting -= 1;
      const pending = (admittingPerClient.get(client) ?? 1) - 1;
      if (pending > 0) admittingPerClient.set(client, pending);
      else admittingPerClient.delete(client);
    });
    next();
  }

  const readArchive = express.raw({
    type: 'application/octet-stream',
    limit: MAX_ARCHIVE_BYTES
  });

  function createExportJob(
    request: express.Request,
    response: express.Response
  ): void {
    if (!Buffer.isBuffer(request.body) || request.body.length < 4) {
      response.status(400).json({ error: 'Expected a scene archive body' });
      return;
    }
    const invalid = exporter.validateArchive(request.body);
    if (invalid != null) {
      response.status(400).json({ error: invalid });
      return;
    }

    consumeExportBudget(request.ip ?? 'unknown');

    const job: ExportJob = {
      id: randomUUID(),
      client: request.ip ?? 'unknown',
      status: 'pending',
      phase: null,
      archive: request.body,
      result: null,
      error: null,
      aborter: new AbortController(),
      createdAt: Date.now(),
      startedAt: null,
      finishedAt: null
    };
    jobs.set(job.id, job);

    // Reading the archive through the job lets a cancel release the
    // buffer while the job still waits in the chain.
    const uploadMB = (request.body.length / 1024 / 1024).toFixed(1);
    console.log(`export ${job.id} started (${uploadMB} MB)`);
    void exporter
      .run(
        () => job.archive,
        job.aborter.signal,
        (phase) => {
          job.startedAt ??= Date.now();
          job.phase = phase;
        }
      )
      .then((result) => {
        job.status = 'done';
        job.result = result;
        const seconds = ((Date.now() - job.createdAt) / 1000).toFixed(1);
        console.log(`export ${job.id} done in ${seconds}s`);
      })
      .catch((error) => {
        job.status = 'error';
        job.error = error instanceof Error ? error.message : String(error);
        console.error(`export ${job.id} failed: ${job.error}`);
      })
      .finally(() => {
        job.archive = null;
        job.finishedAt = Date.now();
      });

    response.status(202).json({ jobId: job.id });
  }

  app.post('/api/export', admitExport, readArchive, createExportJob);

  app.get('/api/export/:id', (request, response) => {
    const job = jobs.get(request.params.id);
    if (job == null) {
      response.status(404).json({ error: 'Unknown job' });
      return;
    }
    response.json({ status: job.status, phase: job.phase, error: job.error });
  });

  app.get('/api/export/:id/file', (request, response) => {
    const job = jobs.get(request.params.id);
    if (job == null) {
      response.status(404).json({ error: 'Unknown job' });
      return;
    }
    if (job.result == null) {
      response.status(409).json({ error: 'The export has not finished' });
      return;
    }
    // The job is cleared only after the bytes reached the client, so an
    // interrupted download can be retried.
    response.on('finish', () => removeJob(request.params.id));
    response.type(exporter.resultContentType).send(job.result);
  });

  app.delete('/api/export/:id', (request, response) => {
    const job = jobs.get(request.params.id);
    // Only the client that created a job may remove it.
    if (job != null && job.client === (request.ip ?? 'unknown')) {
      removeJob(request.params.id);
    }
    response.status(204).end();
  });

  // An unknown /api path is a client mistake, not a missing page: answer it
  // as JSON so a caller never has to parse Express's HTML to learn that.
  app.use('/api', (request, response) => {
    response.status(404).json({ error: 'Unknown endpoint' });
  });

  // Terminal error handler: body-parser failures and anything a route
  // throws answer as JSON, never as Express's default HTML page.
  app.use(
    (
      error: Error & { type?: string },
      request: express.Request,
      response: express.Response,
      next: express.NextFunction
    ) => {
      if (response.headersSent) {
        next(error);
        return;
      }
      if (error.type === 'entity.too.large') {
        response.status(413).json({ error: 'The archive is too large' });
        return;
      }
      console.error(`request failed: ${error.message}`);
      response.status(500).json({ error: 'Export failed' });
    }
  );

  return app;
}
