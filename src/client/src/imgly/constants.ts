/**
 * CE.SDK Photobook Editor - Shared Constants
 *
 * Identifiers and asset locations shared between the editor configuration,
 * the plugins, and the app shell.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

export const LAYOUTS_SOURCE_ID = 'ly.img.layouts';

/** The layouts that cover a double page spread. */
export const SPREAD_LAYOUTS_SOURCE_ID = 'ly.img.layouts.spreads';

/** The panel that offers the single page and the spread layouts. */
export const LAYOUTS_PANEL_ID = 'photobook.layouts';

export const LAYOUTS_ICON = '@imgly/Collage';

export const PAGE_TYPE = '//ly.img.ubq/page';

export const PAGE_SLICE_TYPE = '//ly.img.ubq/pageSlice';

export const PAGE_KIND = {
  cover: 'photobook/cover',
  spine: 'photobook/spine',
  back: 'photobook/back',
  /** The inside of a cover: a page of a spread that takes no content and does not print. */
  blank: 'photobook/blank'
} as const;

/** Opens the layouts panel. */
export function openLayoutsPanel(cesdk: CreativeEditorSDK): void {
  cesdk.ui.openPanel(LAYOUTS_PANEL_ID);
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
