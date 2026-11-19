/**
 * CE.SDK Photobook Editor - Spreads in the Print File
 *
 * The print file holds one PDF page per spread, so the jacket prints as one
 * sheet. The blank inside of a cover does not print. Both the browser export
 * and the export server run this on their own copy of the scene, so the book
 * on screen keeps its spreads.
 */

import { PAGE_KIND, PAGE_SLICE_TYPE } from './constants';

/**
 * The engine calls this module makes. The browser engine and the export
 * server's native engine both have them.
 */
interface SpreadExportEngine {
  scene: { getPages(): number[] };
  block: {
    getChildren(id: number): number[];
    getType(id: number): string;
    getKind(id: number): string;
    destroy(id: number): void;
  };
}

/**
 * Leaves the blank inside of a cover out of the print. The spread then takes
 * the size of the page slices left, so the page facing the blank prints as a
 * page of its own. A blank holds no content, so destroying it destroys none.
 */
export function removeBlanksForPrint(engine: SpreadExportEngine): void {
  for (const page of engine.scene.getPages()) {
    engine.block
      .getChildren(page)
      .filter(
        (child) =>
          engine.block.getType(child) === PAGE_SLICE_TYPE &&
          engine.block.getKind(child) === PAGE_KIND.blank
      )
      .forEach((blank) => engine.block.destroy(blank));
  }
}
