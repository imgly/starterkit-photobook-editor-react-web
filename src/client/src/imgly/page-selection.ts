import type CreativeEngine from '@cesdk/engine';

import { PAGE_TYPE } from './constants';

/**
 * Lets a reader select a page in the Adopter role.
 *
 * The role leaves `editor/select` at `Defer`, which hands the decision to each
 * block, and a block's own `editor/select` defaults to false. So pages are
 * unselectable until something grants them, and the Pages panel cannot follow
 * a row to the canvas: `ly.img.layerList.canvasFollow` only fires when the
 * selected block is a page.
 */
export function allowPageSelection(engine: CreativeEngine): VoidFunction {
  const grant = (page: number) => {
    if (engine.block.isValid(page)) {
      engine.block.setScopeEnabled(page, 'editor/select', true);
    }
  };

  engine.scene.getPages().forEach(grant);

  // A page added later starts from the block default, so grant it on creation.
  return engine.event.subscribe([], (events) => {
    events.forEach((event) => {
      if (
        event.type === 'Created' &&
        engine.block.isValid(event.block) &&
        engine.block.getType(event.block) === PAGE_TYPE
      ) {
        grant(event.block);
      }
    });
  });
}
