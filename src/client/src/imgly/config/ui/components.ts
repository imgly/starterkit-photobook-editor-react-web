/**
 * Custom Components - Buttons, Panels, and UI Extensions
 *
 * Register custom UI components using the builder API.
 * Add custom buttons to the dock, navigation bar, or inspector bar.
 *
 * ## Component Registration
 *
 * - `cesdk.ui.registerComponent(id, renderFn)` - Register a custom component
 * - `cesdk.ui.registerPanel(id, renderFn)` - Register a custom panel
 *
 * ## Builder API
 *
 * The builder context provides methods to create UI elements:
 * - `builder.Button(id, options)` - Button
 * - `builder.ButtonGroup(id, options)` - Button group
 * - `builder.Checkbox(id, options)` - Checkbox
 * - `builder.ColorInput(id, options)` - Color picker
 * - `builder.Component(id, options)` - Embed another component
 * - `builder.Dropdown(id, options)` - Dropdown menu
 * - `builder.Heading(id, options)` - Heading text
 * - `builder.Library(id, options)` - Asset library
 * - `builder.MediaPreview(id, options)` - Media preview
 * - `builder.NumberInput(id, options)` - Number input
 * - `builder.Section(id, options)` - Section container
 * - `builder.Select(id, options)` - Dropdown select
 * - `builder.Separator(id)` - Visual separator
 * - `builder.Slider(id, options)` - Slider control
 * - `builder.Text(id, options)` - Text content
 * - `builder.TextArea(id, options)` - Multi-line text input
 * - `builder.TextInput(id, options)` - Single-line text input
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/ui-extensions/register-new-component-b04a04/
 * @see https://img.ly/docs/cesdk/js/user-interface/ui-extensions/create-custom-panel-d87b83/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { PAGE_TYPE } from '../../constants';

/**
 * Register and configure custom UI components.
 *
 * @param cesdk - The CreativeEditorSDK instance to configure
 */
export function setupComponents(cesdk: CreativeEditorSDK): void {
  // #region Page Move and Add
  // The cover, the spine and the back cover are transform
  // locked, and a locked page neither moves nor is passed by one.
  const selectedPage = (engine: CreativeEditorSDK['engine']) => {
    const [selected] = engine.block.findAllSelected();
    if (selected == null) return null;
    if (engine.block.getType(selected) !== PAGE_TYPE) return null;
    return selected;
  };

  const movablePages = (engine: CreativeEditorSDK['engine']) =>
    engine.scene
      .getPages()
      .map((page) => ({ page, locked: engine.block.isTransformLocked(page) }));

  cesdk.ui.registerComponent(
    'photobook.page.moveUp.canvasMenu',
    ({ builder, engine }) => {
      const page = selectedPage(engine);
      if (page == null || engine.block.isTransformLocked(page)) return;

      const pages = movablePages(engine);
      const at = pages.findIndex((entry) => entry.page === page);
      const above = pages[at - 1];
      if (above == null || above.locked) return;

      builder.Button('photobook-page-move-up', {
        label: 'action.pageMove.up',
        icon: '@imgly/ArrowUp',
        variant: 'plain',
        onClick: () => cesdk.actions.run('page.moveUp')
      });
    }
  );

  cesdk.ui.registerComponent(
    'photobook.page.moveDown.canvasMenu',
    ({ builder, engine }) => {
      const page = selectedPage(engine);
      if (page == null || engine.block.isTransformLocked(page)) return;

      const pages = movablePages(engine);
      const at = pages.findIndex((entry) => entry.page === page);
      const below = pages[at + 1];
      if (below == null || below.locked) return;

      builder.Button('photobook-page-move-down', {
        label: 'action.pageMove.down',
        icon: '@imgly/ArrowDown',
        variant: 'plain',
        onClick: () => cesdk.actions.run('page.moveDown')
      });
    }
  );

  cesdk.ui.registerComponent('photobook.page.add.canvasBar', ({ builder }) => {
    builder.Button('photobook-page-add', {
      label: 'action.page.add',
      icon: '@imgly/FilePlus',
      variant: 'regular',
      onClick: () => cesdk.actions.run('page.add')
    });
  });
  // #endregion
}
