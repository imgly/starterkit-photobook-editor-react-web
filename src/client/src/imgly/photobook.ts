/**
 * CE.SDK Photobook Editor - Book Definition
 *
 * What a photobook is made of: the page formats it can be authored at and the
 * scene each size and style starts from.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { PAGE_KIND } from './constants';
import type { LayoutFormat } from './plugins/layouts/layout';

/** Page format in millimeters. */
export interface PhotobookSize {
  width: number;
  height: number;
}

export type PhotobookStyleId = 'playful' | 'chic';

/** How photos are placed into the photobook's slots. */
export type PhotoDistributionId = 'autoFill' | 'byHand';

/**
 * The scene each size and style combination starts from. A scene is authored
 * at its page format, so the size picks the format and the style picks the
 * design. Paths are relative to the kit's asset root.
 */
const STYLE_SCENES: Record<LayoutFormat, Record<PhotobookStyleId, string>> = {
  portrait: {
    playful: 'style-playful-portrait.imgly',
    chic: 'style-chic-portrait.imgly'
  },
  square: {
    playful: 'style-playful-square.imgly',
    chic: 'style-chic-square.imgly'
  },
  a4: {
    playful: 'style-playful-a4.imgly',
    chic: 'style-chic-a4.imgly'
  },
  'a4-landscape': {
    playful: 'style-playful-a4-landscape.imgly',
    chic: 'style-chic-a4-landscape.imgly'
  }
};

/** The page size each layout format is authored at, in millimeters. */
const FORMAT_SIZES: Record<LayoutFormat, PhotobookSize> = {
  portrait: { width: 220, height: 286 },
  square: { width: 250, height: 250 },
  a4: { width: 210, height: 297 },
  'a4-landscape': { width: 297, height: 210 }
};

/**
 * Layouts are authored per page format, so the size decides the format: the
 * one whose aspect ratio is closest. Portrait and A4 differ only in ratio.
 */
export function getLayoutFormat(size: PhotobookSize): LayoutFormat {
  const distance = (format: LayoutFormat) => {
    const authored = FORMAT_SIZES[format];
    return Math.abs(
      Math.log(size.width / size.height / (authored.width / authored.height))
    );
  };
  const formats = Object.keys(FORMAT_SIZES) as LayoutFormat[];
  return formats.reduce((best, format) =>
    distance(format) < distance(best) ? format : best
  );
}

/** The scene URL a size and style start from. */
export function getStyleSceneURL(
  assetsBaseURL: string,
  format: LayoutFormat,
  styleId: PhotobookStyleId
): string {
  return `${assetsBaseURL}/${STYLE_SCENES[format][styleId]}`;
}

/**
 * The layout format a loaded book is authored at, read from its front cover,
 * or from its first page when the book is made of single pages. Only the
 * ratio is compared, so the scene's design unit does not matter.
 */
export function getSceneLayoutFormat(
  engine: CreativeEditorSDK['engine']
): LayoutFormat {
  const spreads = engine.scene.getPages();
  const cover =
    spreads
      .flatMap((spread) => engine.block.getPageSlices(spread))
      .find((page) => engine.block.getKind(page) === PAGE_KIND.cover) ??
    spreads.find((page) => engine.block.getPageSlices(page).length === 0);
  if (cover == null) return 'portrait';
  return getLayoutFormat({
    width: engine.block.getWidth(cover),
    height: engine.block.getHeight(cover)
  });
}

/**
 * Sets the size a page added later is created at.
 *
 * A new page takes its size from `scene/pageDimensions`, which the style
 * scenes leave at the spine's width.
 *
 * @param engine - The engine holding the loaded scene
 * @param size - The page size to add pages at, in the scene's design unit
 */
export function setPageDimensions(
  engine: CreativeEditorSDK['engine'],
  size: PhotobookSize
): void {
  const scene = engine.scene.get();
  if (scene == null) return;
  engine.block.setFloat(scene, 'scene/pageDimensions/width', size.width);
  engine.block.setFloat(scene, 'scene/pageDimensions/height', size.height);
}

/**
 * The asset root a scene hangs off: its parent directory. The kit's scenes sit
 * beside the `layouts` folder they draw from, so the scene URL locates both.
 */
export function assetsBaseURLOf(sceneURL: string): string {
  return sceneURL.slice(0, sceneURL.lastIndexOf('/'));
}
