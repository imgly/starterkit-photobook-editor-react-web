/**
 * CE.SDK Photobook Editor - Asset Application Middleware
 *
 * A photo belongs in a slot the layout defines, so clicking one in the Photos
 * panel must not add a loose block to the page. The click is turned into a
 * hint naming the gesture that does work: drag the photo onto a slot.
 *
 * @see https://img.ly/docs/cesdk/js/asset-handling/asset-sources-5b0a3b/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { UPLOAD_SOURCE_ID } from './photos';

/**
 * Stops a click in the Photos panel from adding a block, and says what to do
 * instead.
 *
 * Only `apply` is intercepted. Replacing the content of an existing block goes
 * through `applyToBlock`, which keeps working, so a drag onto a slot and the
 * canvas menu's replace both behave as before.
 *
 * @param cesdk - The CreativeEditorSDK instance to configure
 * @returns A function that removes the middleware
 */
export function setupAssetMiddleware(cesdk: CreativeEditorSDK): VoidFunction {
  return cesdk.engine.asset.registerApplyMiddleware(
    async (sourceId, assetResult, apply, context) => {
      if (sourceId !== UPLOAD_SOURCE_ID) {
        return apply(sourceId, assetResult, context);
      }

      cesdk.ui.showNotification({
        type: 'info',
        message: 'photobook.photos.dragToPlace'
      });
      // Returning without calling `apply` adds no block. `apply` already
      // resolves to undefined when it creates none, so callers handle this.
      return undefined;
    }
  );
}
