/**
 * CE.SDK Photobook Editor - Layout Blocks at the Fold
 *
 * A page of a spread bleeds at the edges of the spread only. At an edge it
 * shares with another page, a block stops, otherwise it covers the facing page.
 */

import type { Rect } from '../../spreads';

/** Tolerance for telling an edge shared with a facing page from an edge of the spread. */
const EDGE_TOLERANCE = 0.01;

/**
 * Keeps a block of a layout inside its page where the page meets another
 * page.
 *
 * @param block - The block, in the coordinates of its page
 * @param page - Where the page sits on its spread
 * @param spread - The size of the spread
 * @returns The block in the coordinates of the spread, cut at the edges the
 *   page shares with another page
 */
export function clipToPage(
  block: Rect,
  page: Rect,
  spread: { width: number; height: number }
): Rect {
  const shared = (at: number, end: number) =>
    at > EDGE_TOLERANCE && at < end - EDGE_TOLERANCE;
  const x0 = Math.max(
    block.x + page.x,
    shared(page.x, spread.width) ? page.x : -Infinity
  );
  const y0 = Math.max(
    block.y + page.y,
    shared(page.y, spread.height) ? page.y : -Infinity
  );
  const x1 = Math.min(
    block.x + page.x + block.width,
    shared(page.x + page.width, spread.width) ? page.x + page.width : Infinity
  );
  const y1 = Math.min(
    block.y + page.y + block.height,
    shared(page.y + page.height, spread.height)
      ? page.y + page.height
      : Infinity
  );
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}
