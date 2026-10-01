/**
 * CE.SDK Photobook Editor - Initialization Module
 *
 * @see https://img.ly/docs/cesdk/js/get-started/overview-e18f40/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import {
  BlurAssetSource,
  ImageColorsAssetSource,
  ColorPaletteAssetSource,
  EffectsAssetSource,
  FiltersAssetSource,
  StickerAssetSource,
  TextAssetSource,
  TextComponentAssetSource,
  TypefaceAssetSource,
  UploadAssetSources,
  VectorShapeAssetSource
} from '@cesdk/cesdk-js/plugins';

import { DesignEditorConfig } from './config/plugin';
import { allowPageSelection } from './page-selection';
import { stampDefaultTexts } from './placeholders';
import { openPhotosPanel } from './constants';
import { LayoutsAssetSourcePlugin } from './plugins/layouts/layout';
import {
  assetsBaseURLOf,
  getSceneLayoutFormat,
  setPageDimensions,
  type PhotobookSize
} from './photobook';

export { DesignEditorConfig } from './config/plugin';
export {
  UPLOAD_SOURCE_ID,
  addPhotosToUploadSource,
  revokeUploadedPhotoURLs
} from './photos';
export type { PhotoRef, RemotePhotoAsset } from './photos';
export { autoFillPhotobook, autoFillPhotobookTexts } from './autofill';
export type { PhotobookTextContent } from './autofill';
export { enterPreviewMode } from './preview-mode';
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
  await cesdk.addPlugin(new DesignEditorConfig());

  await Promise.all([
    cesdk.addPlugin(new BlurAssetSource()),
    cesdk.addPlugin(new ImageColorsAssetSource()),
    cesdk.addPlugin(new ColorPaletteAssetSource()),
    cesdk.addPlugin(
      new UploadAssetSources({
        include: ['ly.img.image.upload']
      })
    ),
    cesdk.addPlugin(new EffectsAssetSource()),
    cesdk.addPlugin(new FiltersAssetSource()),
    cesdk.addPlugin(new StickerAssetSource()),
    cesdk.addPlugin(new TextAssetSource()),
    cesdk.addPlugin(new TextComponentAssetSource()),
    cesdk.addPlugin(new VectorShapeAssetSource()),
    cesdk.addPlugin(new TypefaceAssetSource())
  ]);

  await cesdk.load(sceneURL);

  setPageDimensions(cesdk.engine, size);

  // The reader fills a book rather than authoring one, so the editor runs as
  // an adopter: page structure and layouts stay fixed, slots stay editable.
  cesdk.engine.editor.setRole('Adopter');

  // The role defers selection to each block, whose default denies it, so pages
  // are granted it explicitly. Selecting a page is what lets the Pages panel
  // follow a row to the canvas.
  allowPageSelection(cesdk.engine);

  // Text blocks remember their template text, so validation can tell
  // placeholder text from user content.
  stampDefaultTexts(cesdk.engine);

  // Layouts are authored per page format, so the loaded cover decides which
  // set the book is offered.
  await cesdk.addPlugin(
    new LayoutsAssetSourcePlugin(
      getSceneLayoutFormat(cesdk.engine),
      assetsBaseURLOf(sceneURL)
    )
  );

  openPhotosPanel(cesdk);
}
