/**
 * CE.SDK Photobook Editor - PDF/X Conversion Worker
 *
 * Dispatches conversion jobs to the shared Ghostscript runtime and reports
 * their results to the editor. The runtime owns the conversion worker.
 */

import type { PDFXOptions } from '@imgly/plugin-print-ready-pdfs-web';

export interface ConvertRequest {
  pdf: Blob;
  options: PDFXOptions;
  assetBaseURL: string;
}

export type ConvertResponse =
  | { ok: true; pdf: Blob }
  | { ok: false; error: string };

self.onmessage = async (event: MessageEvent<ConvertRequest>) => {
  const { pdf, options, assetBaseURL } = event.data;
  try {
    const { convertToPDFX } =
      await import('@imgly/plugin-print-ready-pdfs-web');
    const { createConversionRuntime } =
      await import('@imgly/pdf-conversion-utils');
    const runtime = createConversionRuntime({ assetBaseURL });
    const converted = await convertToPDFX(pdf, { ...options, runtime }).finally(
      () => runtime.dispose()
    );
    const result = Array.isArray(converted) ? converted[0] : converted;
    self.postMessage({ ok: true, pdf: result } satisfies ConvertResponse);
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    } satisfies ConvertResponse);
  }
};
