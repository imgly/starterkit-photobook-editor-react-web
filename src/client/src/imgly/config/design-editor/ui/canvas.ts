/**
 * Canvas Configuration - Canvas Bar and Context Menu
 *
 * Configure the canvas bar (top/bottom of canvas) and right-click context menu.
 * Different edit modes can have different menu configurations.
 *
 * ## Edit Modes
 *
 * - `'Transform'`: Default mode for selecting and moving blocks
 * - `'Text'`: Text editing mode (when editing text content)
 * - `'Crop'`: Crop mode (when cropping images)
 * - `'Trim'`: Trim mode (when trimming video/audio)
 *
 * ## Canvas Bar Position
 *
 * The canvas bar can be positioned at `'top'` or `'bottom'` of the canvas.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/customization/canvas-632c8e/
 * @see https://img.ly/docs/cesdk/js/user-interface/customization/canvas-menu-0d2b5b/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import {
  LAYOUTS_ICON,
  LAYOUTS_PANEL_ID,
  LAYOUTS_SOURCE_ID,
  PAGE_SLICE_TYPE,
  PAGE_TYPE,
  openLayoutsPanel
} from '../../../constants';
import { takesLayout } from '../../../spreads';

/**
 * Configure the canvas bar and context menu.
 *
 * @param cesdk - The CreativeEditorSDK instance to configure
 */
export function setupCanvas(cesdk: CreativeEditorSDK): void {
  // ============================================================================
  // CUSTOM COMPONENTS
  // ============================================================================

  // #region Page Layouts Toggle
  // A canvas menu button for spreads and their pages that toggles the layouts panel.
  cesdk.ui.registerComponent(
    'photobook.page.layouts.canvasMenu',
    ({ builder, engine }) => {
      const [selected] = engine.block.findAllSelected();
      if (selected == null) return;
      const type = engine.block.getType(selected);
      if (type !== PAGE_TYPE && type !== PAGE_SLICE_TYPE) return;
      // The jacket takes no layout; a spread offers one while any of its pages takes it.
      const takers =
        type === PAGE_TYPE
          ? [selected, ...engine.block.getPageSlices(selected)]
          : [selected];
      if (!takers.some((block) => takesLayout(engine, block))) return;

      const isOpen = cesdk.ui.isPanelOpen(LAYOUTS_PANEL_ID);
      builder.Button('photobook-page-layouts', {
        label: `libraries.${LAYOUTS_SOURCE_ID}.label`,
        icon: LAYOUTS_ICON,
        variant: 'plain',
        isActive: isOpen,
        onClick: () => {
          if (isOpen) {
            cesdk.ui.closePanel(LAYOUTS_PANEL_ID);
          } else {
            openLayoutsPanel(cesdk);
          }
        }
      });
    }
  );
  // #endregion

  // ============================================================================
  // CANVAS BAR
  // Configure the bar at the top or bottom of the canvas
  // ============================================================================

  // #region Canvas Bar
  cesdk.ui.setComponentOrder(
    { in: 'ly.img.canvas.bar', at: 'bottom' /* Position: 'top' | 'bottom' */ },
    [
      // Needs the `ly.img.settings` feature enabled in config/features.ts:
      // 'ly.img.settings.canvasBar',
      'ly.img.spacer',
      'photobook.page.add.canvasBar',
      'ly.img.spacer'
    ]
  );
  // #endregion

  // ============================================================================
  // CANVAS MENU - TRANSFORM MODE
  // Context menu when blocks are selected in default mode
  // ============================================================================

  // #region Canvas Menu - Transform Mode
  cesdk.ui.setComponentOrder(
    { in: 'ly.img.canvas.menu', when: { editMode: 'Transform' } },
    [
      // ============================
      // Group Navigation
      // ============================
      'ly.img.group.enter.canvasMenu',
      'ly.img.group.select.canvasMenu',

      // ============================
      // Page Layout and Ordering
      // ============================
      'photobook.page.layouts.canvasMenu',
      'photobook.page.moveUp.canvasMenu',
      'photobook.page.moveDown.canvasMenu',
      'ly.img.separator',

      // ============================
      // Content Editing
      // ============================
      'ly.img.replace.canvasMenu',
      'ly.img.text.edit.canvasMenu',
      'ly.img.separator',

      // ============================
      // Layer Ordering
      // ============================
      'ly.img.bringForward.canvasMenu',
      'ly.img.sendBackward.canvasMenu',
      'ly.img.separator',

      // ============================
      // Common Operations
      // ============================
      'ly.img.duplicate.canvasMenu',
      'ly.img.delete.canvasMenu'
    ]
  );
  // #endregion

  // ============================================================================
  // CANVAS MENU - VECTOR MODE
  // ============================================================================

  // #region Canvas Menu - Vector Mode
  cesdk.ui.setComponentOrder(
    { in: 'ly.img.canvas.menu', when: { editMode: 'Vector' } },
    []
  );
  // #endregion

  // ============================================================================
  // CANVAS MENU - TEXT MODE
  // Context menu when editing text content
  // ============================================================================

  // #region Canvas Menu - Text Mode
  cesdk.ui.setComponentOrder(
    { in: 'ly.img.canvas.menu', when: { editMode: 'Text' } },
    [
      'ly.img.text.color.canvasMenu',
      'ly.img.separator',
      'ly.img.text.bold.canvasMenu',
      'ly.img.text.italic.canvasMenu',
      'ly.img.text.underline.canvasMenu',
      'ly.img.text.strikethrough.canvasMenu',
      'ly.img.separator',
      'ly.img.text.list.unordered.canvasMenu',
      'ly.img.text.list.ordered.canvasMenu',
      'ly.img.separator',
      'ly.img.text.variables.canvasMenu'
    ]
  );
  // #endregion
}
