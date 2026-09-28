/**
 * CE.SDK Photobook Editor - Shared Constants
 *
 * Identifiers and asset locations shared between the editor configuration,
 * the plugins, and the app shell.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

export const LAYOUTS_SOURCE_ID = 'ly.img.layouts';

export const LAYOUTS_ICON = '@imgly/Collage';

export const PAGE_TYPE = '//ly.img.ubq/page';

export const PREVIEW_BLANK_PAGE_NAME = 'photobook.preview.blank';

export const PAGE_KIND = {
  cover: 'photobook/cover',
  spine: 'photobook/spine',
  back: 'photobook/back'
} as const;

/**
 * The asset library payload for the layouts panel. `isPanelOpen` compares
 * payloads structurally, so every open and toggle site must use this one
 * value.
 */
export const LAYOUTS_PANEL_PAYLOAD = {
  payload: {
    entries: [LAYOUTS_SOURCE_ID],
    title: `libraries.${LAYOUTS_SOURCE_ID}.label`
  }
};

/** Opens the layouts asset library panel. */
export function openLayoutsPanel(cesdk: CreativeEditorSDK): void {
  cesdk.ui.openPanel('//ly.img.panel/assetLibrary', LAYOUTS_PANEL_PAYLOAD);
}

/** The library entry for uploaded photos; its asset source is a different id. */
export const PHOTOS_LIBRARY_ENTRY = 'ly.img.upload';

/**
 * The asset library payload for the photos panel. `isPanelOpen` compares
 * payloads structurally, so every open and toggle site must use this one
 * value.
 */
export const PHOTOS_PANEL_PAYLOAD = {
  payload: {
    entries: [PHOTOS_LIBRARY_ENTRY],
    title: 'photobook.dock.photos.label'
  }
};

/** Opens the photos asset library panel. */
export function openPhotosPanel(cesdk: CreativeEditorSDK): void {
  cesdk.ui.openPanel('//ly.img.panel/assetLibrary', PHOTOS_PANEL_PAYLOAD);
}
