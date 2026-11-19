/**
 * Preview Plugin - The Book as the Reader Will Hold It
 *
 * A read-only editor configuration: one spread at a time, with buttons to
 * page through the book, to go back to editing and to export the PDF. The
 * kit switches to it for the preview and back to the design editor after.
 *
 * @example
 * ```typescript
 * await cesdk.addPlugin(new PhotobookPreviewConfig(controls));
 * // ...and back to editing:
 * await cesdk.addPlugin(new DesignEditorConfig());
 * ```
 *
 * @see https://img.ly/docs/cesdk/js/configuration-2c1c3d/
 */

import type { EditorPlugin, EditorPluginContext } from '@cesdk/cesdk-js';
import CreativeEditorSDK from '@cesdk/cesdk-js';

import { setupFeatures } from './features';
import { setupSettings } from './settings';
import { setupUI, type PreviewControls } from './ui';

export type { PreviewControls } from './ui';

/**
 * Preview configuration plugin.
 *
 * @public
 */
export class PhotobookPreviewConfig implements EditorPlugin {
  name = 'photobook-preview';

  version = CreativeEditorSDK.version;

  /** @param controls - What the preview's buttons do */
  constructor(private readonly controls: PreviewControls) {}

  async initialize({ cesdk, engine }: EditorPluginContext) {
    if (cesdk) {
      // #region Editor Reset
      cesdk.resetEditor();
      // #endregion

      // #region Compatibility
      cesdk.setEditorCompatibilityVersion('1.87.0-rc.2');
      // #endregion

      setupFeatures(cesdk);
      setupUI(cesdk, this.controls);
      setupSettings(engine);

      // eslint-disable-next-line -- Intentional backward-compat shim for pre-migration user configurations. Remove once all deprecated configuration paths are dropped.
      cesdk.reapplyLegacyUserConfiguration();
    }
  }
}
