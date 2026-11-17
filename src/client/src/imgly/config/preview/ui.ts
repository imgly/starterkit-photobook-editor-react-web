/**
 * UI Configuration - The Preview's Canvas Bar
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/ui-extensions/register-new-component-b04a04/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

/** What the preview's buttons do, and the state they show. */
export interface PreviewControls {
  goToPrevious: () => void;
  goToNext: () => void;
  back: () => void;
  exportPDF: () => void;
  canGoToPrevious: () => boolean;
  canGoToNext: () => boolean;
  /** The label of the spread in view, read with the engine the bar renders with. */
  getLabel: (engine: CreativeEditorSDK['engine']) => string;
}

/**
 * Set up the preview's canvas bar: back to editing, paging through the book,
 * and the export.
 *
 * @param cesdk - The CreativeEditorSDK instance to configure
 * @param controls - What the buttons do
 */
export function setupUI(
  cesdk: CreativeEditorSDK,
  controls: PreviewControls
): void {
  cesdk.ui.registerComponent(
    'photobook.preview.back.canvasBar',
    ({ builder }) => {
      builder.Button('photobook-preview-back', {
        label: 'photobook.preview.back',
        variant: 'regular',
        onClick: controls.back
      });
    }
  );

  cesdk.ui.registerComponent(
    'photobook.preview.navigation.canvasBar',
    ({ builder, engine }) => {
      // The label reads which spread is visible, so the bar renders again
      // whenever the reader pages on.
      const label = controls.getLabel(engine);
      builder.Button('photobook-preview-previous', {
        label: '←',
        isDisabled: !controls.canGoToPrevious(),
        onClick: controls.goToPrevious
      });
      // A disabled button renders the label; the builder has no text component.
      builder.Button('photobook-preview-label', {
        label,
        variant: 'plain',
        isDisabled: true
      });
      builder.Button('photobook-preview-next', {
        label: '→',
        isDisabled: !controls.canGoToNext(),
        onClick: controls.goToNext
      });
    }
  );

  cesdk.ui.registerComponent(
    'photobook.preview.export.canvasBar',
    ({ builder }) => {
      builder.Button('photobook-preview-export', {
        label: 'photobook.preview.export',
        color: 'accent',
        variant: 'regular',
        trailingIcon: '@imgly/ArrowUpRight',
        onClick: controls.exportPDF
      });
    }
  );

  cesdk.ui.setComponentOrder({ in: 'ly.img.canvas.bar', at: 'bottom' }, [
    'photobook.preview.back.canvasBar',
    'ly.img.spacer',
    'photobook.preview.navigation.canvasBar',
    'ly.img.spacer',
    'photobook.preview.export.canvasBar'
  ]);
}
