/**
 * CE.SDK Photobook Editor - Block Utilities
 *
 * Small engine helpers shared by autofill, layouts, and validation.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { PAGE_TYPE } from './constants';

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
