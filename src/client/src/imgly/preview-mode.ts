/**
 * CE.SDK Photobook Editor - Preview Mode
 *
 * Shows the book one spread at a time, as the reader will hold it. Entering
 * switches the editor to the preview configuration; leaving switches it back
 * to the design editor. What the preview changes on the book goes into a
 * history of its own, so it leaves no undo steps behind.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { PhotobookPreviewConfig } from './config/preview/plugin';
import { configurePhotobookEditor } from './editor';
import { getPreviewLabel } from './preview-label';

/** The space around the spread in view, in screen pixels. */
const PREVIEW_PADDING = 48;

export interface PreviewModeOptions {
  /** Called when the reader leaves the preview with its back button or Escape. */
  onBack: () => void;
  /**
   * Runs the export behind the preview's export button. The signal aborts
   * when the preview exits while the export still runs.
   */
  onExport?: (signal: AbortSignal) => Promise<void>;
}

/**
 * Switches the editor to the preview.
 *
 * @param cesdk - The editor to switch
 * @param options - The back and export callbacks
 * @returns Switches the editor back to the design editor, on the page it
 *   showed before
 */
export async function enterPreviewMode(
  cesdk: CreativeEditorSDK,
  options: PreviewModeOptions
): Promise<() => Promise<void>> {
  const { engine } = cesdk;
  const previousPage = engine.scene.getCurrentPage();
  const previousZoomLevel = engine.scene.getZoomLevel();
  const previousHistory = engine.editor.getActiveHistory();

  const spreads = () => engine.scene.getPages();
  let spreadIndex = 0;
  let activeExport: AbortController | null = null;

  const showSpread = (index: number) => {
    const all = spreads();
    spreadIndex = Math.max(0, Math.min(all.length - 1, index));
    all.forEach((spread, at) =>
      engine.block.setVisible(spread, at === spreadIndex)
    );
    const spread = all[spreadIndex];
    if (spread != null) {
      void engine.scene.zoomToBlock(spread, {
        padding: PREVIEW_PADDING,
        animate: false
      });
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') showSpread(spreadIndex - 1);
    if (event.key === 'ArrowRight') showSpread(spreadIndex + 1);
    if (event.key === 'Escape') options.onBack();
  };

  await cesdk.addPlugin(
    new PhotobookPreviewConfig({
      goToPrevious: () => showSpread(spreadIndex - 1),
      goToNext: () => showSpread(spreadIndex + 1),
      back: () => options.onBack(),
      canGoToPrevious: () => spreadIndex > 0,
      canGoToNext: () => spreadIndex < spreads().length - 1,
      getLabel: (renderEngine) => getPreviewLabel(cesdk, renderEngine),
      exportPDF: async () => {
        if (options.onExport == null || activeExport != null) return;
        const aborter = new AbortController();
        activeExport = aborter;
        try {
          await options.onExport(aborter.signal);
        } finally {
          if (activeExport === aborter) activeExport = null;
        }
      }
    })
  );

  const scratchHistory = engine.editor.createHistory();
  engine.editor.setActiveHistory(scratchHistory);
  engine.block
    .findAllSelected()
    .forEach((block) => engine.block.setSelected(block, false));
  showSpread(0);
  window.addEventListener('keydown', handleKeyDown);

  let exited = false;
  return async () => {
    if (exited) return;
    exited = true;
    window.removeEventListener('keydown', handleKeyDown);
    activeExport?.abort();

    spreads().forEach((spread) => engine.block.setVisible(spread, true));
    engine.editor.setActiveHistory(previousHistory);
    engine.editor.destroyHistory(scratchHistory);

    await configurePhotobookEditor(cesdk);

    if (previousPage != null && engine.block.isValid(previousPage)) {
      await engine.scene.zoomToBlock(previousPage, { animate: false });
      await cesdk.actions.run('zoom.toLevel', previousZoomLevel, {
        animate: false
      });
    }
  };
}
