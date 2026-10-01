/**
 * Design Validation Utilities
 *
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import type { BoundingBox } from './validation-types';
import { getParentPage } from './block-utils';
import {
  getPhotoURI,
  isPhotoBlock,
  isUnfilledImageSlot,
  getPhotoFill
} from './placeholders';
import { fetchImageResolution } from './photos';

type CreativeEngine = CreativeEditorSDK['engine'];

/**
 * Calculates the overlap of two elements as percentage of the first element.
 */
function getElementOverlap(
  [aX1, aY1, aX2, aY2]: BoundingBox,
  [bX1, bY1, bX2, bY2]: BoundingBox
): number {
  const overlapWidth = Math.max(0, Math.min(aX2, bX2) - Math.max(aX1, bX1));
  const overlapHeight = Math.max(0, Math.min(aY2, bY2) - Math.max(aY1, bY1));
  const areaA = (aX2 - aX1) * (aY2 - aY1);
  return areaA > 0 ? (overlapWidth * overlapHeight) / areaA : 0;
}

function getElementBoundingBox(
  engine: CreativeEngine,
  blockId: number
): BoundingBox {
  const x = engine.block.getGlobalBoundingBoxX(blockId);
  const y = engine.block.getGlobalBoundingBoxY(blockId);
  const width = engine.block.getGlobalBoundingBoxWidth(blockId);
  const height = engine.block.getGlobalBoundingBoxHeight(blockId);
  return [x, y, x + width, y + height];
}

/**
 * A block's box relative to its page's top-left corner. Global boxes can
 * lag a relayout by more than a page height in a stacked scene, which would
 * read as a block sitting entirely off its page.
 */
function getPageLocalBoundingBox(
  engine: CreativeEngine,
  blockId: number,
  page: number
): BoundingBox | null {
  let x = 0;
  let y = 0;
  let node: number | null = blockId;
  while (node != null && node !== page) {
    x += engine.block.getPositionX(node);
    y += engine.block.getPositionY(node);
    node = engine.block.getParent(node);
  }
  const frame = frameOf(engine, blockId);
  if (frame == null) return null;
  const { width, height } = frame;
  // A rotated block covers a different area than its frame.
  const rotation = engine.block.getRotation(blockId);
  if (rotation === 0) return [x, y, x + width, y + height];

  // The block turns about its position, not its centre, so rotate the frame's
  // corners about that point and take their extent.
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const cornerX = [0, width, width, 0];
  const cornerY = [0, 0, height, height];
  const rotatedX = cornerX.map((cx, index) => cx * cos - cornerY[index] * sin);
  const rotatedY = cornerX.map((cx, index) => cx * sin + cornerY[index] * cos);
  return [
    x + Math.min(...rotatedX),
    y + Math.min(...rotatedY),
    x + Math.max(...rotatedX),
    y + Math.max(...rotatedY)
  ];
}

/**
 * How much of a block may sit outside its page before it counts as
 * protruding. A full-bleed photo is deliberately larger than the page, and
 * effects grow the measured box further, so the check only reports a block
 * that leaves a tenth of itself outside.
 */
const PAGE_OVERLAP_EPSILON = 0.9;

/** Every block that holds a photo, wherever it sits in the scene. */
export function getPhotoBlocks(engine: CreativeEngine): number[] {
  return engine.block
    .findByType('graphic')
    .filter((blockId) => isPhotoBlock(engine, blockId));
}

function getRelevantBlocks(engine: CreativeEngine): number[] {
  return [
    ...engine.block.findByType('text'),
    ...engine.block.findByType('graphic')
  ];
}

/**
 * The block's frame, or null when the engine has not laid it out yet.
 */
function frameOf(
  engine: CreativeEngine,
  blockId: number
): { width: number; height: number } | null {
  try {
    return {
      width: engine.block.getFrameWidth(blockId),
      height: engine.block.getFrameHeight(blockId)
    };
  } catch {
    return null;
  }
}

/**
 * Computes each block's overlap with its own parent page. The page bounding
 * boxes are computed once per call, not once per block.
 */
function getOverlapWithParentPage(engine: CreativeEngine): Map<number, number> {
  const pageBoundingBoxes = new Map<number, BoundingBox>();
  const overlaps = new Map<number, number>();

  getRelevantBlocks(engine).forEach((blockId) => {
    const page = getParentPage(engine, blockId);
    if (page == null) return;
    let pageBoundingBox = pageBoundingBoxes.get(page);
    if (pageBoundingBox == null) {
      const pageFrame = frameOf(engine, page);
      if (pageFrame == null) return;
      pageBoundingBox = [0, 0, pageFrame.width, pageFrame.height];
      pageBoundingBoxes.set(page, pageBoundingBox);
    }

    const blockBoundingBox = getPageLocalBoundingBox(engine, blockId, page);
    if (blockBoundingBox == null) return;
    overlaps.set(blockId, getElementOverlap(blockBoundingBox, pageBoundingBox));
  });

  return overlaps;
}
/**
 * Returns blocks that are completely outside their page.
 */
export function getOutsideBlocks(engine: CreativeEngine): number[] {
  return [...getOverlapWithParentPage(engine)]
    .filter(([, overlap]) => overlap === 0)
    .map(([blockId]) => blockId);
}

/** Returns blocks that leave a meaningful part of themselves off the page. */
export function getProtrudingBlocks(engine: CreativeEngine): number[] {
  return [...getOverlapWithParentPage(engine)]
    .filter(([, overlap]) => overlap > 0 && overlap < PAGE_OVERLAP_EPSILON)
    .map(([blockId]) => blockId);
}

/**
 * Returns image blocks on bleed-enabled pages that touch a page edge but
 * stop short of running that edge's margin into the bleed. Pages without
 * enabled margins are skipped.
 */
export function getBleedShortfallBlocks(engine: CreativeEngine): number[] {
  const EDGE_EPSILON = 1;
  interface PageMargins {
    box: BoundingBox;
    margins: [number, number, number, number]; // left, top, right, bottom
  }
  const pages = new Map<number, PageMargins>();
  engine.scene.getPages().forEach((page) => {
    if (!engine.block.getBool(page, 'page/marginEnabled')) return;
    const margins: PageMargins['margins'] = [
      engine.block.getFloat(page, 'page/margin/left'),
      engine.block.getFloat(page, 'page/margin/top'),
      engine.block.getFloat(page, 'page/margin/right'),
      engine.block.getFloat(page, 'page/margin/bottom')
    ];
    if (Math.max(...margins) <= 0) return;
    pages.set(page, { box: getElementBoundingBox(engine, page), margins });
  });
  if (pages.size === 0) return [];

  const results: number[] = [];
  getRelevantBlocks(engine).forEach((blockId) => {
    if (!isPhotoBlock(engine, blockId)) return;
    const page = getParentPage(engine, blockId);
    const entry = page != null ? pages.get(page) : undefined;
    if (entry == null) return;

    const box = getElementBoundingBox(engine, blockId);
    const { box: pageBox, margins } = entry;
    // Per edge: the block touches the page edge but does not run that
    // edge's margin into the bleed. `sign` points out of the page.
    const edges: [number, number, number, number][] = [
      [box[0], pageBox[0], margins[0], -1],
      [box[1], pageBox[1], margins[1], -1],
      [box[2], pageBox[2], margins[2], 1],
      [box[3], pageBox[3], margins[3], 1]
    ];
    const short = edges.some(([value, pageEdge, margin, sign]) => {
      if (margin <= 0) return false;
      const outward = (value - pageEdge) * sign;
      return outward >= -EDGE_EPSILON && outward < margin - EDGE_EPSILON;
    });
    if (short) results.push(blockId);
  });
  return results;
}

/** Returns image blocks that share any photo URI with another block. */
export function getDuplicateImageBlocks(engine: CreativeEngine): number[] {
  const blocksByURI = new Map<string, number[]>();
  const urisByBlock = new Map<number, string[]>();
  getPhotoBlocks(engine).forEach((blockId) => {
    // Unfilled slots share the template's default image; the placeholder
    // check reports them instead.
    if (isUnfilledImageSlot(engine, blockId)) return;
    const photo = getPhotoFill(engine, blockId);
    const uris = [
      ...new Set(
        [
          photo.imageFileURI,
          ...photo.sourceSet.map((source) => source.uri)
        ].filter((uri) => uri !== '')
      )
    ];
    if (uris.length === 0) return;
    urisByBlock.set(blockId, uris);
    uris.forEach((uri) => {
      blocksByURI.set(uri, [...(blocksByURI.get(uri) ?? []), blockId]);
    });
  });
  const sharedURIs = new Set(
    [...blocksByURI.entries()]
      .filter(([, blocks]) => blocks.length > 1)
      .map(([uri]) => uri)
  );
  return [...urisByBlock.entries()]
    .filter(([, uris]) => uris.some((uri) => sharedURIs.has(uri)))
    .map(([blockId]) => blockId);
}

/** Returns pages without any child blocks. */
export function getEmptyPages(engine: CreativeEngine): number[] {
  return engine.scene
    .getPages()
    .filter((page) => engine.block.getChildren(page).length === 0);
}

/** Returns image slots that hold no photo yet. */
export function getPlaceholderImageBlocks(engine: CreativeEngine): number[] {
  return getPhotoBlocks(engine).filter((blockId) =>
    isUnfilledImageSlot(engine, blockId)
  );
}
function transformToPixel(
  fromUnit: string,
  fromValue: number,
  dpi: number
): number {
  if (fromUnit === 'Pixel') {
    return fromValue;
  }
  if (fromUnit === 'Millimeter') {
    return (fromValue * dpi) / 25.4;
  }
  // Inch
  return fromValue * dpi;
}

/**
 * Gets the image quality for a block.
 * Returns a value where < 0.7 is failed, 0.7-1 is warning, >= 1 is success.
 */
export async function getImageBlockQuality(
  engine: CreativeEngine,
  imageId: number
): Promise<number> {
  const frame = frameOf(engine, imageId);
  if (frame == null) return 1;
  const frameWidthDesignUnit = frame.width;
  const frameHeightDesignUnit = frame.height;

  const scene = engine.scene.get();
  if (scene == null) return 1;

  const pageUnit = engine.block.getEnum(scene, 'scene/designUnit');
  const pageDPI = engine.block.getFloat(scene, 'scene/dpi');

  const frameWidth = transformToPixel(pageUnit, frameWidthDesignUnit, pageDPI);
  const frameHeight = transformToPixel(
    pageUnit,
    frameHeightDesignUnit,
    pageDPI
  );

  const imageURI = getPhotoURI(engine, imageId);
  if (!imageURI) return 1;
  if (!/^(https?:|blob:|data:)/.test(imageURI)) return 1;

  try {
    const { width, height } = await fetchImageResolution(imageURI);
    const scaleX = engine.block.getCropScaleX(imageId) || 1;
    const scaleY = engine.block.getCropScaleY(imageId) || 1;

    const originalRatios = {
      width: frameWidth / (width / scaleX),
      height: frameHeight / (height / scaleY)
    };
    const coverRatio = Math.max(originalRatios.width, originalRatios.height);
    return 1 / coverRatio;
  } catch (error) {
    // An unloadable image cannot be measured and passes this check.
    console.warn('Measuring an image resolution failed:', error);
    return 1;
  }
}
