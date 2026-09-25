/**
 * CE.SDK Photobook Editor - Export
 *
 * Routes an export to the browser or the export server, then downloads the
 * finished print-ready PDF/X-4.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { exportPhotobookInBrowser } from './export-browser';
import { toPrintReadyPDF } from './print-ready-pdf';
import type { ExportJobStatusResponse } from '../../../shared/export-api';

/**
 * Whether exports go through the export server. Set `VITE_USE_SERVER=true`
 * to render with `@cesdk/node-native`; anything else renders in the browser.
 *
 * Routing is explicit rather than probed, so a server that is configured but
 * unreachable fails with an error instead of quietly exporting in the
 * browser at a different speed.
 */
const USE_SERVER = import.meta.env.VITE_USE_SERVER === 'true';

const INITIAL_POLL_INTERVAL_MS = 500;
const MAX_POLL_INTERVAL_MS = 3000;

/** How long the client polls once running; matches the server's timeout. */
const CLIENT_DEADLINE_MS = 10 * 60 * 1000;

/** Waits, or resolves early when the export is cancelled. */
const delay = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    // An already-aborted signal never fires 'abort', so it would wait out
    // the full delay.
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(finish, ms);
    function finish() {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    }
    signal.addEventListener('abort', finish);
  });

/** The dialog translates every string, so dynamic text needs its own key. */
function asDialogText(
  cesdk: CreativeEditorSDK,
  key: string,
  text: string
): string {
  cesdk.i18n.setTranslations({ [cesdk.i18n.getLocale()]: { [key]: text } });
  return key;
}

function showExportError(cesdk: CreativeEditorSDK, message: string): void {
  const errorDialogId = cesdk.ui.showDialog({
    type: 'error',
    content: {
      title: 'photobook.export.failedTitle',
      message: asDialogText(cesdk, 'photobook.export.error.text', message)
    },
    actions: {
      label: 'common.close',
      onClick: () => cesdk.ui.closeDialog(errorDialogId)
    }
  });
}

/**
 * Exports the photobook as a print-ready PDF/X-4 through the export server.
 *
 * @param cesdk - The editor holding the photobook
 * @param externalSignal - Aborts the export from outside, e.g. when the
 *   preview closes
 */
export async function exportPhotobook(
  cesdk: CreativeEditorSDK,
  externalSignal?: AbortSignal,
  scene?: Promise<Blob> | Blob
): Promise<void> {
  const translate = (key: string, values?: Record<string, unknown>) =>
    cesdk.i18n.translate(key, values);
  const totalPages = cesdk.engine.scene.getPages().length;
  let deadline = Date.now() + CLIENT_DEADLINE_MS;
  const aborter = new AbortController();
  // A signal that is already aborted never fires the event, so it is mirrored
  // up front; otherwise the export would run to completion uncancelled.
  const mirrorAbort = () => aborter.abort();
  if (externalSignal?.aborted) mirrorAbort();
  externalSignal?.addEventListener('abort', mirrorAbort);
  let jobId: string | null = null;
  const startedAt = Date.now();
  let finished = false;
  const dialogId = cesdk.ui.showDialog({
    type: 'loading',
    content: {
      title: 'photobook.export.title',
      message: 'photobook.export.preparing'
    },
    progress: 'indeterminate',
    actions: {
      label: 'common.cancel',
      onClick: () => cesdk.ui.closeDialog(dialogId)
    },
    onClose: () => {
      aborter.abort();
      if (jobId != null) {
        void fetch(`/api/export/${jobId}`, { method: 'DELETE' }).catch(
          () => undefined
        );
        jobId = null;
      }
    },
    clickOutsideToClose: false
  });

  const setDialogMessage = (messageKey: string) => {
    cesdk.ui.updateDialog(dialogId, {
      content: { title: 'photobook.export.title', message: messageKey }
    });
  };

  const showExportSuccess = () => {
    finished = true;
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    cesdk.ui.updateDialog(dialogId, {
      type: 'success',
      content: {
        title: 'photobook.export.doneTitle',
        message: asDialogText(
          cesdk,
          'photobook.export.done.text',
          translate('photobook.export.done', { pages: totalPages, seconds })
        )
      },
      progress: 100,
      actions: {
        label: 'common.close',
        onClick: () => cesdk.ui.closeDialog(dialogId)
      },
      clickOutsideToClose: true
    });
  };

  try {
    if (!USE_SERVER) {
      const deadlineTimer = setTimeout(
        () => aborter.abort(),
        CLIENT_DEADLINE_MS
      );
      let rendered = false;
      try {
        const pdf = await exportPhotobookInBrowser(
          cesdk,
          aborter.signal,
          scene,
          (exportedPages, pages) => {
            setDialogMessage(
              asDialogText(
                cesdk,
                'photobook.export.progress.text',
                translate('photobook.export.progress', { pages })
              )
            );
            cesdk.ui.updateDialog(dialogId, {
              progress: { value: exportedPages, max: pages }
            });
            if (exportedPages >= pages && !rendered) {
              rendered = true;
              setDialogMessage('photobook.export.converting');
              cesdk.ui.updateDialog(dialogId, { progress: 'indeterminate' });
            }
          }
        );
        if (aborter.signal.aborted) return;
        await cesdk.utils.downloadFile(pdf, 'application/pdf');
        showExportSuccess();
      } finally {
        clearTimeout(deadlineTimer);
      }
      return;
    }

    const archive = (await scene) ?? (await cesdk.engine.scene.saveToArchive());
    if (aborter.signal.aborted) return;
    setDialogMessage(
      asDialogText(
        cesdk,
        'photobook.export.progress.text',
        translate('photobook.export.progress', { pages: totalPages })
      )
    );

    const createResponse = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: archive,
      signal: aborter.signal
    });
    if (createResponse.status === 429) {
      throw new Error(translate('photobook.export.error.busy'));
    }
    if (!createResponse.ok) {
      throw new Error(
        translate('photobook.export.error.status', {
          status: createResponse.status
        })
      );
    }
    const contentType = createResponse.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new Error(translate('photobook.export.error.unexpected'));
    }
    const created = await createResponse.json();
    if (typeof created?.jobId !== 'string') {
      throw new Error(translate('photobook.export.error.unexpected'));
    }
    jobId = created.jobId;

    let pollInterval = INITIAL_POLL_INTERVAL_MS;
    let running = false;
    while (!aborter.signal.aborted) {
      if (Date.now() > deadline) {
        throw new Error(translate('photobook.export.error.timeout'));
      }
      const statusResponse = await fetch(`/api/export/${jobId}`, {
        signal: aborter.signal
      });
      if (!statusResponse.ok) {
        jobId = null;
        throw new Error(
          translate('photobook.export.error.lost', {
            status: statusResponse.status
          })
        );
      }
      const job: ExportJobStatusResponse = await statusResponse.json();
      if (job.phase != null && !running) {
        running = true;
        deadline = Date.now() + CLIENT_DEADLINE_MS;
      }
      if (job.status === 'error') {
        jobId = null;
        throw new Error(
          job.error ?? translate('photobook.export.error.generic')
        );
      }
      if (job.status === 'done') break;
      if (job.status !== 'pending') {
        throw new Error(translate('photobook.export.error.unknownState'));
      }
      await delay(pollInterval, aborter.signal);
      pollInterval = Math.min(MAX_POLL_INTERVAL_MS, pollInterval * 1.5);
    }
    if (aborter.signal.aborted) return;

    const fileResponse = await fetch(`/api/export/${jobId}/file`, {
      signal: aborter.signal
    });
    jobId = null;
    if (!fileResponse.ok) {
      throw new Error(
        translate('photobook.export.error.download', {
          status: fileResponse.status
        })
      );
    }
    const renderedPDF = await fileResponse.blob();
    setDialogMessage('photobook.export.converting');
    const printReady = await toPrintReadyPDF(renderedPDF, aborter.signal);
    if (aborter.signal.aborted) return;
    await cesdk.utils.downloadFile(printReady, 'application/pdf');

    showExportSuccess();
  } catch (error) {
    if (!aborter.signal.aborted) {
      showExportError(
        cesdk,
        error instanceof Error
          ? error.message
          : translate('photobook.export.error.generic')
      );
    }
  } finally {
    externalSignal?.removeEventListener('abort', mirrorAbort);
    if (!finished) {
      cesdk.ui.closeDialog(dialogId);
    }
  }
}
