/**
 * CE.SDK Photobook Editor - PDF/X Conversion Worker
 *
 * Runs the Ghostscript WASM conversion off the main thread. `callMain` is a
 * synchronous WASM call that occupies its thread until Ghostscript returns,
 * which on a 100-page book is most of the export, so on the main thread it
 * freezes the editor.
 */

import type { PDFXOptions } from '@imgly/plugin-print-ready-pdfs-web';

export interface ConvertRequest {
  pdf: Blob;
  options: PDFXOptions;
}

export type ConvertResponse =
  | { ok: true; pdf: Blob }
  | { ok: false; error: string };

self.onmessage = async (event: MessageEvent<ConvertRequest>) => {
  const { pdf, options } = event.data;
  try {
    const { convertToPDFX } =
      await import('@imgly/plugin-print-ready-pdfs-web');
    const converted = await convertToPDFX(pdf, options);
    const result = Array.isArray(converted) ? converted[0] : converted;
    self.postMessage({ ok: true, pdf: result } satisfies ConvertResponse);
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    } satisfies ConvertResponse);
  }
};
