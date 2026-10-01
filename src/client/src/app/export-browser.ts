/**
 * CE.SDK Photobook Editor - Browser Export
 *
 * Renders the book to a PDF in the browser, with no export server.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { PREVIEW_BLANK_PAGE_NAME } from '../imgly/constants';
import { toPrintReadyPDF } from './print-ready-pdf';

/**
 * Exports the scene and downloads it as a print-ready PDF/X-4.
 *
 * @param cesdk - The editor holding the book
 * @param signal - Aborts the export
 * @param scene - Scene archive to export; defaults to the live scene
 * @param onProgress - Reports rendered pages while the PDF is drawn
 */
export async function exportPhotobookInBrowser(
  cesdk: CreativeEditorSDK,
  signal: AbortSignal,
  scene?: Promise<Blob> | Blob,
  onProgress?: (exportedPages: number, totalPages: number) => void
): Promise<Blob> {
  const { engine } = cesdk;
  if (engine.scene.get() == null)
    throw new Error('There is no scene to export');

  // An archive, not a scene string: it inlines the resource bytes, so the
  // fonts resolve in the export engine.
  const snapshot = (await scene) ?? (await engine.scene.saveToArchive());
  signal.throwIfAborted();

  const { default: CreativeEngine } = await import('@cesdk/engine');
  const exportEngine = await CreativeEngine.init({
    featureFlags: { exportWorker: true }
  });

  try {
    const snapshotURL = URL.createObjectURL(snapshot);
    try {
      await exportEngine.scene.loadFromArchiveURL(snapshotURL);
    } finally {
      URL.revokeObjectURL(snapshotURL);
    }
    const exportScene = exportEngine.scene.get();
    if (exportScene == null) {
      throw new Error('The exported scene failed to load');
    }

    // A hidden page is left out of the PDF, so every page is revealed first.
    // The bleed is off while editing, so it is turned back on here: this
    // engine renders a snapshot, so the book on screen is untouched.
    exportEngine.scene.getPages().forEach((page) => {
      // A snapshot taken in preview carries its blank stand-in pages, which
      // belong to no book.
      if (exportEngine.block.getName(page) === PREVIEW_BLANK_PAGE_NAME) {
        exportEngine.block.destroy(page);
        return;
      }
      exportEngine.block.setVisible(page, true);
      exportEngine.block.setBool(page, 'page/marginEnabled', true);
    });

    // High compatibility rasterizes every photo at scene DPI; off, baseline
    // JPEGs are embedded as-is, so the PDF stays small enough for the
    // PDF/X conversion.
    const exportOptions = {
      mimeType: 'application/pdf' as const,
      exportPdfWithHighCompatibility: false,
      // A print shop cuts and aligns by these. They sit outside the bleed,
      // so the PDF page grows around the unchanged trim and bleed boxes.
      exportPdfWithCropMarks: true,
      exportPdfWithRegistrationMarks: true,
      abortSignal: signal,
      onProgress
    };

    const pdf: Blob = await exportEngine.block.export(
      exportScene,
      exportOptions
    );
    signal.throwIfAborted();
    return toPrintReadyPDF(pdf, signal);
  } finally {
    exportEngine.dispose();
  }
}
