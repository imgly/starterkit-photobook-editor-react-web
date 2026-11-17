/**
 * CE.SDK Photobook Editor - Editing Configuration
 *
 * The editor the reader fills the book in. The kit switches to the preview
 * configuration and back, so applying this one again restores the editor.
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
  VectorShapeAssetSource
} from '@cesdk/cesdk-js/plugins';

import { DesignEditorConfig } from './config/design-editor/plugin';
import { addPhotoSource } from './photos';

/**
 * Applies the design editor configuration with its asset sources. A
 * configuration starts from a reset editor, which removes the asset sources
 * the previous one added.
 *
 * @param cesdk - The instance to configure
 */
export async function configurePhotobookEditor(
  cesdk: CreativeEditorSDK
): Promise<void> {
  await cesdk.addPlugin(new DesignEditorConfig());

  await Promise.all([
    cesdk.addPlugin(new BlurAssetSource()),
    cesdk.addPlugin(new ImageColorsAssetSource()),
    cesdk.addPlugin(new ColorPaletteAssetSource()),
    cesdk.addPlugin(new EffectsAssetSource()),
    cesdk.addPlugin(new FiltersAssetSource()),
    cesdk.addPlugin(new StickerAssetSource()),
    cesdk.addPlugin(new TextAssetSource()),
    cesdk.addPlugin(new TextComponentAssetSource()),
    cesdk.addPlugin(new VectorShapeAssetSource()),
    cesdk.addPlugin(new TypefaceAssetSource())
  ]);

  addPhotoSource(cesdk);
}
