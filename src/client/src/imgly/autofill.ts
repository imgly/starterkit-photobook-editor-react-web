/**
 * CE.SDK Photobook Editor - Auto-Fill
 *
 * Fills the photobook's placeholders with example content: photos into the
 * image slots, matched to the slot whose shape crops them least, and copy
 * into the placeholder captions. The layout templates mark their slots as
 * placeholders, so the placeholder flag decides what gets filled.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import type { PhotoRef } from './photos';
import { getChildrenTree, visuallySortBlocks } from './block-utils';
import {
  CAPTION_DEFAULTS,
  getDefaultText,
  isPlaceholderText,
  isUnfilledImageSlot,
  setPhotoFill
} from './placeholders';

type CreativeEngine = CreativeEditorSDK['engine'];

/**
 * Returns a page's placeholder image slots, sorted top to bottom and left
 * to right.
 */
function getPlaceholderImageSlots(
  engine: CreativeEngine,
  page: number
): number[] {
  return visuallySortBlocks(engine, getChildrenTree(engine, page)).filter(
    (block) => isUnfilledImageSlot(engine, block)
  );
}

/**
 * Returns an aspect ratio on a logarithmic scale, so that a 2:1 and a 1:2
 * mismatch sit the same distance from square. Not finite when the shape is
 * unusable, which drops the page back to reading order.
 */
function logAspectRatio(width: number, height: number): number {
  return Math.log(width / height);
}

/**
 * Pairs photos with slots so each photo lands in the slot of the most
 * similar shape. Sorting both sides by log aspect ratio and zipping them
 * minimises the total mismatch, so no search is needed.
 */
function matchPhotosToSlots(
  engine: CreativeEngine,
  slots: number[],
  photos: PhotoRef[]
): { slot: number; photo: PhotoRef }[] {
  const ranked = slots.map((slot, index) => ({
    slot,
    photo: photos[index],
    slotRatio: logAspectRatio(
      engine.block.getFrameWidth(slot),
      engine.block.getFrameHeight(slot)
    ),
    photoRatio: logAspectRatio(photos[index].width, photos[index].height)
  }));
  const measurable = ranked.every(
    ({ slotRatio, photoRatio }) =>
      Number.isFinite(slotRatio) && Number.isFinite(photoRatio)
  );
  if (!measurable) return ranked;

  const slotOrder = [...ranked].sort((a, b) => a.slotRatio - b.slotRatio);
  const photoOrder = [...ranked].sort((a, b) => a.photoRatio - b.photoRatio);
  return slotOrder.map(({ slot }, index) => ({
    slot,
    photo: photoOrder[index].photo
  }));
}

/**
 * Fills the photobook's placeholder image slots with the given photos. The
 * photos reach the pages in the order given, and within a page they go to
 * the slots that crop them least. Each photo is placed once: when a book has
 * more slots than photos, the remaining slots stay placeholders. A filled
 * slot stops being a placeholder.
 *
 * @param engine - The engine holding the photobook scene
 * @param photos - The photos to place, in fill order
 * @param options - Set `addUndoStep: false` to skip the single undo step
 *   this creates
 */
export function autoFillPhotobook(
  engine: CreativeEngine,
  photos: PhotoRef[],
  options: { addUndoStep?: boolean } = {}
): void {
  if (photos.length === 0) return;

  let photoIndex = 0;
  engine.scene.getPages().forEach((page) => {
    if (photoIndex >= photos.length) return;
    const slots = getPlaceholderImageSlots(engine, page).slice(
      0,
      photos.length - photoIndex
    );
    const pagePhotos = slots.map(() => photos[photoIndex++]);
    matchPhotosToSlots(engine, slots, pagePhotos).forEach(({ slot, photo }) => {
      setPhotoFill(engine, slot, {
        imageFileURI: photo.uri,
        sourceSet: []
      });
    });
  });

  if (options.addUndoStep ?? true) {
    engine.editor.addUndoStep();
  }
}

const TEXT_TYPE = '//ly.img.ubq/text';

/** The copy an auto-filled photobook is written with. */
export interface PhotobookTextContent {
  captions: string[];
}

/** Returns a page's placeholder captions, sorted top to bottom. */
function getPlaceholderCaptions(
  engine: CreativeEngine,
  page: number
): number[] {
  return visuallySortBlocks(engine, getChildrenTree(engine, page)).filter(
    (block) => {
      if (engine.block.getType(block) !== TEXT_TYPE) return false;
      const defaultText = getDefaultText(engine, block);
      return (
        defaultText != null &&
        CAPTION_DEFAULTS.includes(defaultText) &&
        isPlaceholderText(engine, block)
      );
    }
  );
}

/**
 * Replaces the photobook's placeholder captions with the given copy. Pages
 * are walked in order and captions are used in that order, so the same
 * photobook always reads the same. Captions repeat from the first once they
 * run out.
 *
 * @param engine - The engine holding the photobook scene
 * @param texts - The captions to write
 * @param options - Set `addUndoStep: false` to skip the single undo step
 *   this creates
 */
export function autoFillPhotobookTexts(
  engine: CreativeEngine,
  texts: PhotobookTextContent,
  options: { addUndoStep?: boolean } = {}
): void {
  if (texts.captions.length === 0) return;

  let captionIndex = 0;
  engine.scene.getPages().forEach((page) => {
    getPlaceholderCaptions(engine, page).forEach((block) => {
      const value = texts.captions[captionIndex++ % texts.captions.length];
      engine.block.setString(block, 'text/text', value);
    });
  });

  if (options.addUndoStep ?? true) {
    engine.editor.addUndoStep();
  }
}
