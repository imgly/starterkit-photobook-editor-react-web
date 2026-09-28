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
  }
};

/** Layouts are authored per page format, so the size decides the format. */
export function getLayoutFormat(size: PhotobookSize): LayoutFormat {
  return size.height > size.width ? 'portrait' : 'square';
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
 * The layout format a loaded scene is authored at, read from its cover page.
 * Only the ratio is compared, so the scene's design unit does not matter.
 */
export function getSceneLayoutFormat(
  engine: CreativeEditorSDK['engine']
): LayoutFormat {
  const [cover] = engine.scene.getPages();
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

/**
 * The steps preview walks, as indices into the order `getPreviewPageOrder`
 * returns: the jacket's three pages, then pairs.
 *
 * @param pageCount - How many pages the preview order holds
 */
export function getPreviewSpreads(pageCount: number): number[][] {
  if (pageCount < 3) {
    return Array.from({ length: pageCount }, (unused, index) => [index]);
  }

  const steps: number[][] = [[0, 1, 2]];
  for (let index = 3; index < pageCount; index += 2) {
    steps.push(index + 1 < pageCount ? [index, index + 1] : [index]);
  }
  return steps;
}

interface Jacket {
  jacket: number[];
  inside: number[];
}

/**
 * Resolves the back cover, the spine and the front cover, plus the inside
 * pages they leave.
 *
 * Each is looked up by its `PAGE_KIND`, which the scene must carry. One the
 * scene does not name falls back to its binding position: the front cover
 * first, then the spine and the back cover last.
 */
function splitJacket(
  pages: number[],
  engine: CreativeEditorSDK['engine']
): Jacket {
  const last = pages.length - 1;
  const find = (kind: string, fallback: number) =>
    pages.find((page) => engine.block.getKind(page) === kind) ?? fallback;

  const cover = find(PAGE_KIND.cover, pages[0]);
  const spine = find(PAGE_KIND.spine, pages[last - 1]);
  const back = find(PAGE_KIND.back, pages[last]);

  const named = new Set([cover, spine, back]);
  return {
    jacket: [back, spine, cover],
    inside: pages.filter((page) => !named.has(page))
  };
}

/**
 * The order preview lays the book out in, as page ids.
 *
 * A bound book opens on its jacket: the back cover, the spine and the front
 * cover lie flat side by side. The inside pages then read as facing pairs,
 * which puts the first inside page on the right of its own spread, so a blank
 * stands in on its left. A blank closes the book too when the inside pages
 * are even, so the last page keeps a partner.
 *
 * @param pages - The book's pages, in binding order
 * @param makeBlank - Creates a stand-in page; called once per blank needed
 * @param engine - The engine holding the scene, to read each page's kind
 * @returns The jacket, then the inside pages with their blanks
 */
export function getPreviewPageOrder(
  pages: number[],
  makeBlank: () => number,
  engine: CreativeEditorSDK['engine']
): number[] {
  if (pages.length < 3) return [...pages];

  const { jacket, inside } = splitJacket(pages, engine);
  if (inside.length === 0) return jacket;

  const order = [...jacket, makeBlank(), ...inside];
  // The leading blank shifts the pairing, so an even run ends one short.
  if (inside.length % 2 === 0) order.push(makeBlank());
  return order;
}
