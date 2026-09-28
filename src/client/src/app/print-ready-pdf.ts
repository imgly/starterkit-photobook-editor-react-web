/**
 * CE.SDK Photobook Editor - PDF/X Conversion
 *
 * Converts an exported PDF to PDF/X-4. Both export paths end here: the
 * server renders the PDF, the browser always converts it.
 */

import type { ConvertRequest, ConvertResponse } from './pdfx.worker';

const PDFX_OPTIONS = {
  outputProfile: 'fogra39',
  outputStandard: 'PDF/X-4',
  title: 'Photobook'
} as const;

/**
 * Converts an exported PDF to PDF/X-4 for print.
 *
 * The conversion runs in a worker: Ghostscript is a synchronous WASM call
 * that holds its thread for most of a large export.
 */
export async function toPrintReadyPDF(
  pdf: Blob,
  signal?: AbortSignal
): Promise<Blob> {
  signal?.throwIfAborted();
  return convertInWorker(pdf, signal);
}

/**
 * Ghostscript holds its thread until it returns, so a cancelled conversion is
 * stopped by terminating the worker.
 */
async function convertInWorker(pdf: Blob, signal?: AbortSignal): Promise<Blob> {
  const worker = new Worker(new URL('./pdfx.worker.ts', import.meta.url), {
    type: 'module'
  });
  const abort = () => worker.terminate();
  signal?.addEventListener('abort', abort);
  try {
    return await new Promise<Blob>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<ConvertResponse>) => {
        const result = event.data;
        if (result.ok) resolve(result.pdf);
        else reject(new Error(result.error));
      };
      // A terminated worker fires no error, so the signal rejects instead.
      worker.onerror = (event) => reject(new Error(event.message));
      signal?.addEventListener('abort', () => reject(signal.reason));
      worker.postMessage({
        pdf,
        options: PDFX_OPTIONS
      } satisfies ConvertRequest);
    });
  } finally {
    signal?.removeEventListener('abort', abort);
    worker.terminate();
  }
}
