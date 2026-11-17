/**
 * CE.SDK Photobook Editor - Initialization Module
 *
 * @see https://img.ly/docs/cesdk/js/get-started/overview-e18f40/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { rememberBookScopes } from './add-spread';
import { configurePhotobookEditor } from './editor';
import { stampDefaultTexts } from './placeholders';
import { openPhotosPanel } from './constants';
import { LayoutsAssetSourcePlugin } from './plugins/layouts/layout';
import {
  assetsBaseURLOf,
  getSceneLayoutFormat,
  setPageDimensions,
  type PhotobookSize
} from './photobook';

export { DesignEditorConfig } from './config/design-editor/plugin';
export { PhotobookPreviewConfig } from './config/preview/plugin';
export { configurePhotobookEditor } from './editor';
export {
  UPLOAD_SOURCE_ID,
  addPhotosToUploadSource,
  revokeUploadedPhotoURLs
} from './photos';
export type { PhotoRef, RemotePhotoAsset } from './photos';
export { autoFillPhotobook, autoFillPhotobookTexts } from './autofill';
export type { PhotobookTextContent } from './autofill';
export { enterPreviewMode, type PreviewModeOptions } from './preview-mode';
export { LAYOUTS_SOURCE_ID } from './constants';
export { LayoutsAssetSourcePlugin } from './plugins/layouts/layout';
export {
  assetsBaseURLOf,
  getLayoutFormat,
  getSceneLayoutFormat,
  getStyleSceneURL,
  type PhotobookSize,
  type PhotobookStyleId,
  type PhotoDistributionId
} from './photobook';

/**
 * Configures a CE.SDK instance for photobook editing: the editor
 * configuration, the asset sources, and the photobook scene itself.
 *
 * The scene sits at the root of the kit's asset tree, next to the `layouts`
 * folder, so its URL also locates the layouts the book can use.
 *
 * @param cesdk - The instance to configure
 * @param sceneURL - Absolute URL of the photobook scene to load
 * @param size - The size a page added later is created at
 */
export async function initPhotobookEditor(
  cesdk: CreativeEditorSDK,
  sceneURL: string,
  size: PhotobookSize
) {
  await configurePhotobookEditor(cesdk);

  await cesdk.load(sceneURL);

  setPageDimensions(cesdk.engine, size);

  // A spread the reader adds takes the permissions the style scene gives the
  // book's own spreads and pages.
  rememberBookScopes(cesdk.engine);

  // Text blocks remember their template text, so validation can tell
  // placeholder text from user content.
  stampDefaultTexts(cesdk.engine);

  await cesdk.addPlugin(
    new LayoutsAssetSourcePlugin(
      getSceneLayoutFormat(cesdk.engine),
      assetsBaseURLOf(sceneURL)
    )
  );

  openPhotosPanel(cesdk);
}
