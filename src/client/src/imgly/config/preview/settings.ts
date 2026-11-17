/**
 * Engine Settings Configuration - A Read-Only Book
 *
 * @see https://img.ly/docs/cesdk/js/settings-970c98/
 */

import type { CreativeEngine } from '@cesdk/cesdk-js';

/**
 * Configure engine settings for the preview.
 *
 * @param engine - The CreativeEngine instance to configure
 */
export function setupSettings(engine: CreativeEngine): void {
  // #region Role
  // Nothing in the preview can be selected or typed into, which also keeps
  // every selection control away.
  engine.editor.setRole('Adopter');
  engine.editor.setGlobalScope('editor/select', 'Deny');
  engine.editor.setGlobalScope('text/edit', 'Deny');
  // #endregion

  // #region Page Settings
  engine.editor.setSetting('page/title/show', false);
  // A printed book has no fold lines between its facing pages.
  engine.editor.setSetting('page/pageSliceGuideColor', {
    r: 0,
    g: 0,
    b: 0,
    a: 0
  });
  // #endregion

  // #region Mouse Settings
  // The preview frames one spread at a time, so the reader pages through the
  // book instead of scrolling or zooming.
  engine.editor.setSetting('mouse/enableScroll', false);
  engine.editor.setSetting('mouse/enableZoom', false);
  // #endregion
}
