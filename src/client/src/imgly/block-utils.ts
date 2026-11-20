/**
 * CE.SDK Photobook Editor - Block Utilities
 *
 * Small engine helpers shared by autofill, layouts, and validation.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { PAGE_TYPE } from './constants';
import type { BoundingBox } from './validation-types';

type CreativeEngine = CreativeEditorSDK['engine'];

/** Returns a block's children and all their descendants. */
export function getChildrenTree(
  engine: CreativeEngine,
  block: number
): number[] {
  const children = engine.block.getChildren(block);
  return [
    ...children,
    ...children.map((childBlock) => getChildrenTree(engine, childBlock)).flat()
  ];
}

/** Finds the page a block sits on, or null when it is not on a page. */
export function getParentPage(
  engine: CreativeEngine,
  block: number
): number | null {
  const parent = engine.block.getParent(block);
  if (parent == null) return null;
  if (engine.block.getType(parent) === PAGE_TYPE) return parent;
  return getParentPage(engine, parent);
}

/**
 * Sorts blocks from top to bottom, left to right based on coordinates.
 * Blocks whose vertical overlap exceeds half the smaller block count as
 * one row, so sub-unit offsets do not flip the reading order.
 */
export function visuallySortBlocks(
  engine: CreativeEngine,
  blocks: number[]
): number[] {
  const blocksWithCoordinates = blocks
    .map((block) => ({
      block,
      // Global, not parent-relative: a slot inside a group would otherwise
      // be sorted against its group's origin rather than the page's.
      x: engine.block.getGlobalBoundingBoxX(block),
      y: engine.block.getGlobalBoundingBoxY(block),
      height: engine.block.getGlobalBoundingBoxHeight(block)
    }))
    .sort((a, b) => {
      const rowTolerance = Math.min(a.height, b.height) / 2;
      if (Math.abs(a.y - b.y) < rowTolerance) return a.x - b.x;
      return a.y - b.y;
    });
  return blocksWithCoordinates.map(({ block }) => block);
}

/**
 * The block's frame, or null when the engine has not laid it out yet.
 */
export function frameOf(
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
 * A block's box relative to its page's top-left corner. Global boxes can
 * lag a relayout by more than a page height in a stacked scene, which would
 * read as a block sitting entirely off its page.
 */
export function getPageLocalBoundingBox(
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
