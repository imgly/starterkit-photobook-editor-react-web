/**
 * Dock Configuration - Photobook Panels
 *
 * Configure the dock to control which photobook panels appear.
 *
 * ## `'ly.img.assetLibrary.dock'`
 *
 * A pre-defined component that opens a panel with asset libraries.
 *
 * - `id` - Component ID (e.g., `'ly.img.assetLibrary.dock'`)
 * - `key` - Unique identifier for this entry
 * - `label` - Translation key for the button label
 * - `icon` - Icon name (e.g., `'@imgly/Text'`, `'@imgly/Sticker'`) or URL
 * - `entries` - Array of asset library entry IDs to display
 * - `onClick` - Custom click handler (overrides default behavior)
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/customization/dock-cb916c/
 * @see https://img.ly/docs/cesdk/js/user-interface/appearance/icons-679e32/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import {
  LAYOUTS_ICON,
  LAYOUTS_SOURCE_ID,
  PHOTOS_LIBRARY_ENTRY
} from '../../constants';

/**
 * The Pages dock icon. `@imgly/BookOpen` ships in the icon package's
 * `products` set, which the editor does not bundle, so the kit registers the
 * one symbol it needs.
 */
const PHOTOBOOK_ICON_SET = `<svg xmlns="http://www.w3.org/2000/svg">
  <symbol width="24" height="24" viewBox="0 0 24 24" fill="none" id="@photobook/BookOpen">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M18.4716 4.54101C16.6875 4.0124 14.3409 3.98187 12 5.71233C9.65907 3.98187 7.31255 4.0124 5.52842 4.54101C4.57235 4.82428 3.78414 5.24596 3.23744 5.59306C2.96255 5.76759 2.7444 5.92602 2.59188 6.04351C2.51552 6.10233 2.45528 6.15115 2.41228 6.18691C2.39077 6.20479 2.37354 6.21944 2.36073 6.23046L2.34483 6.24425L2.3394 6.24902L2.33731 6.25086L2.33643 6.25165C2.33603 6.252 2.33565 6.25234 3 6.99976L2.33565 6.25234C2.12215 6.44211 2 6.71412 2 6.99976V18.9998C2 19.3935 2.23111 19.7507 2.59034 19.912C2.94856 20.0729 3.36769 20.0092 3.66189 19.7494L3.6631 19.7483L3.66536 19.7464C3.66986 19.7425 3.67845 19.7352 3.69099 19.7247C3.71611 19.7038 3.75694 19.6706 3.81241 19.6279C3.92357 19.5423 4.09214 19.4195 4.30943 19.2815C4.74711 19.0036 5.36515 18.6753 6.09658 18.4586C7.51852 18.0373 9.3915 18.0191 11.3356 19.7472C11.7145 20.084 12.2855 20.084 12.6644 19.7472C14.6085 18.0191 16.4815 18.0373 17.9034 18.4586C18.6348 18.6753 19.2529 19.0036 19.6906 19.2815C19.9079 19.4195 20.0764 19.5423 20.1876 19.6279C20.2431 19.6706 20.2839 19.7038 20.309 19.7247C20.3216 19.7352 20.3301 19.7425 20.3346 19.7464L20.3356 19.7472L21 18.9998C20.3356 19.7472 20.3353 19.7469 20.3356 19.7472L20.3381 19.7494C20.6323 20.0092 21.0514 20.0729 21.4097 19.912C21.7689 19.7507 22 19.3935 22 18.9998V6.99976C22 6.71412 21.8778 6.44211 21.6644 6.25234L21 6.99976C21.6644 6.25234 21.664 6.252 21.6636 6.25165L21.6627 6.25086L21.6606 6.24902L21.6552 6.24425L21.6393 6.23046C21.6265 6.21944 21.6092 6.20479 21.5877 6.18691C21.5447 6.15115 21.4845 6.10233 21.4081 6.04351C21.2556 5.92602 21.0375 5.76759 20.7626 5.59306C20.2159 5.24596 19.4277 4.82428 18.4716 4.54101ZM4 17.1568V7.48928C4.08786 7.42683 4.19146 7.3564 4.30943 7.2815C4.74711 7.00362 5.36515 6.67533 6.09658 6.45861C7.4365 6.06162 9.17692 6.02255 11 7.46531V17.0759C9.00137 16.0007 7.05817 16.0878 5.52842 16.541C4.95272 16.7116 4.43789 16.9323 4 17.1568ZM13 17.0759C14.9986 16.0007 16.9418 16.0878 18.4716 16.541C19.0473 16.7116 19.5621 16.9323 20 17.1568V7.48928C19.9121 7.42683 19.8085 7.3564 19.6906 7.2815C19.2529 7.00362 18.6348 6.67533 17.9034 6.45861C16.5635 6.06162 14.8231 6.02255 13 7.46531V17.0759Z" fill="currentColor"/>
  </symbol>
</svg>`;

/** The editor's built-in layer and page list panel. */
const PAGES_PANEL_ID = '//ly.img.panel/layers';

/** Every dock asset library opens into this one panel. */
const ASSET_LIBRARY_PANEL_ID = '//ly.img.panel/assetLibrary';

/**
 * Toggles one asset library, closing the pages panel first so the two never
 * share the dock. Mirrors the built-in dock entry, which knows nothing about
 * the pages panel.
 */
function openLibrary(
  cesdk: CreativeEditorSDK,
  entries: string[],
  title: string
): void {
  const payload = { entries, title };
  const isOpen = cesdk.ui.isPanelOpen(ASSET_LIBRARY_PANEL_ID, { payload });
  if (isOpen) {
    cesdk.ui.closePanel(ASSET_LIBRARY_PANEL_ID);
    return;
  }
  cesdk.ui.closePanel(PAGES_PANEL_ID);
  cesdk.ui.openPanel(ASSET_LIBRARY_PANEL_ID, { payload });
}

/** The page list lives behind its own dock button, so it can carry the kit's
 * label and icon instead of the editor's generic "Layers" ones. */
function registerPagesDock(cesdk: CreativeEditorSDK): void {
  cesdk.ui.registerComponent(
    'photobook.pages.dock',
    ({ builder: { Button }, engine }) => {
      if (!cesdk.feature.isEnabled('ly.img.layerList.panel', { engine }))
        return;
      const isOpen = cesdk.ui.isPanelOpen(PAGES_PANEL_ID);
      Button('photobook.pages.dock', {
        label: 'photobook.dock.pages.label',
        icon: '@photobook/BookOpen',
        isSelected: isOpen,
        onClick: () => {
          if (isOpen) {
            cesdk.ui.closePanel(PAGES_PANEL_ID);
            return;
          }
          // The asset libraries share one panel and replace each other, so
          // this one closes them to take the same slot.
          cesdk.ui.closePanel(ASSET_LIBRARY_PANEL_ID);
          cesdk.ui.openPanel(PAGES_PANEL_ID);
        }
      });
    }
  );
}

/**
 * Configure the dock panel layout for photobook editing.
 *
 * @param cesdk - The CreativeEditorSDK instance to configure
 */
export function setupDock(cesdk: CreativeEditorSDK): void {
  cesdk.ui.addIconSet('@photobook', PHOTOBOOK_ICON_SET);
  registerPagesDock(cesdk);

  // ============================================================================
  // DOCK APPEARANCE SETTINGS
  // Configure how the dock looks
  // ============================================================================

  // #region Dock Appearance
  // Show text labels under dock icons
  cesdk.engine.editor.setSetting('dock/hideLabels', false);

  // Icon size: 'normal' or 'large'
  cesdk.engine.editor.setSetting('dock/iconSize', 'normal');
  // #endregion

  // ============================================================================
  // DOCK ORDER
  // The spacers center the dock entries vertically
  // ============================================================================

  // #region Dock Order
  cesdk.ui.setComponentOrder({ in: 'ly.img.dock' }, [
    'ly.img.spacer',

    'photobook.pages.dock',

    {
      id: 'ly.img.assetLibrary.dock',
      key: 'photobook.photos',
      icon: '@imgly/Image',
      label: 'photobook.dock.photos.label',
      onClick: () =>
        openLibrary(
          cesdk,
          [PHOTOS_LIBRARY_ENTRY],
          'photobook.dock.photos.label'
        ),
      entries: [PHOTOS_LIBRARY_ENTRY]
    },

    {
      id: 'ly.img.assetLibrary.dock',
      key: LAYOUTS_SOURCE_ID,
      icon: LAYOUTS_ICON,
      label: `libraries.${LAYOUTS_SOURCE_ID}.label`,
      onClick: () =>
        openLibrary(
          cesdk,
          [LAYOUTS_SOURCE_ID],
          `libraries.${LAYOUTS_SOURCE_ID}.label`
        ),
      entries: [LAYOUTS_SOURCE_ID]
    },

    'ly.img.spacer'
  ]);
  // #endregion
}
