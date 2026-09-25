/**
 * CE.SDK Photobook Editor - Overflow Photo Stash
 *
 * Photos that no longer fit a page after a layout switch stay in memory
 * per page until a layout with enough slots takes them back. The stash
 * cleans itself up: a deleted page drops its photos, a scene switch forgets
 * everything, and a photo deleted from the upload source leaves every
 * stash.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { UPLOAD_SOURCE_ID } from './photos';
import type { PhotoFill } from './placeholders';

type CreativeEngine = CreativeEditorSDK['engine'];

export class PhotoStash {
  private photos = new Map<number, PhotoFill[]>();

  /**
   * The upload source's photo URIs at the last source update, to tell a
   * deleted photo from one that never was in the source. Null means the
   * source has not been seen yet, so nothing is pruned.
   */
  private lastKnownUploadURIs: Set<string> | null = null;

  private unsubscribers: VoidFunction[] = [];

  /** Starts the cleanup subscriptions on the given engine. */
  attach(engine: CreativeEngine): void {
    this.unsubscribers.push(
      engine.event.subscribe([], (events) => {
        events.forEach((event) => {
          if (event.type === 'Destroyed') this.photos.delete(event.block);
        });
      }),
      engine.scene.onActiveChanged(() => {
        // Block ids do not survive a scene switch.
        this.photos.clear();
        this.lastKnownUploadURIs = null;
      }),
      engine.asset.onAssetSourceUpdated((sourceId) => {
        if (sourceId === UPLOAD_SOURCE_ID) {
          void this.pruneDeletedPhotos(engine);
        }
      })
    );
  }

  /**
   * Prepends photos to a page's stash. Overflowing photos come earlier in
   * the book's photo order than what is already stashed.
   */
  stashOverflow(page: number, overflow: PhotoFill[]): void {
    if (overflow.length === 0) return;
    this.photos.set(page, [...overflow, ...(this.photos.get(page) ?? [])]);
  }

  /** Takes up to `count` photos from a page's stash, in photo order. */
  takePhotos(page: number, count: number): PhotoFill[] {
    const stashed = this.photos.get(page) ?? [];
    const taken = stashed.slice(0, count);
    const remaining = stashed.slice(count);
    if (remaining.length > 0) {
      this.photos.set(page, remaining);
    } else {
      this.photos.delete(page);
    }
    return taken;
  }

  dispose(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
    this.photos.clear();
  }

  /**
   * Removes stashed photos whose image was deleted from the upload source.
   * Only photos seen in the source before are pruned, so photos from other
   * sources stay stashed.
   */
  private async pruneDeletedPhotos(engine: CreativeEngine): Promise<void> {
    const result = await engine.asset.findAssets(UPLOAD_SOURCE_ID, {
      page: 0,
      perPage: 9999
    });
    const currentURIs = new Set(
      (result?.assets ?? [])
        .map((asset) => asset.meta?.uri)
        .filter((uri): uri is string => uri != null)
    );

    const previousURIs = this.lastKnownUploadURIs;
    this.lastKnownUploadURIs = currentURIs;
    if (previousURIs == null) return;

    const deletedURIs = new Set(
      [...previousURIs].filter((uri) => !currentURIs.has(uri))
    );
    if (deletedURIs.size === 0) return;

    this.photos.forEach((photos, page) => {
      const remaining = photos.filter(
        (photo) => !deletedURIs.has(photo.imageFileURI)
      );
      if (remaining.length > 0) {
        this.photos.set(page, remaining);
      } else {
        this.photos.delete(page);
      }
    });
  }
}
