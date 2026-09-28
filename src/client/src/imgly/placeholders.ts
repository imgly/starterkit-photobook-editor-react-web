/**
 * CE.SDK Photobook Editor - Placeholder Semantics
 *
 * One home for the rule that decides what counts as placeholder content:
 * an image slot without a photo, and a text block whose content still
 * equals the template text it was stamped with. Autofill, the layouts
 * plugin, and validation all share these predicates.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

type CreativeEngine = CreativeEditorSDK['engine'];

export const DEFAULT_TEXT_METADATA_KEY = 'photobook/defaultText';

const IMAGE_FILL_TYPE = '//ly.img.ubq/fill/image';
const TEXT_TYPE = '//ly.img.ubq/text';

/**
 * True when a block holds a photo, whatever its kind.
 *
 * A block's kind is authoring metadata and templates do not always set it,
 * so the fill decides: a block carrying an image fill is a photo slot.
 */
export function isPhotoBlock(engine: CreativeEngine, block: number): boolean {
  if (!engine.block.supportsFill(block)) return false;
  const fill = engine.block.getFill(block);
  return (
    engine.block.isValid(fill) && engine.block.getType(fill) === IMAGE_FILL_TYPE
  );
}

/** A photo as stored on an image fill. */
export interface PhotoFill {
  imageFileURI: string;
  sourceSet: ReturnType<CreativeEngine['block']['getSourceSet']>;
}

/** Reads a block's photo fill; both fields empty when it has none. */
export function getPhotoFill(engine: CreativeEngine, block: number): PhotoFill {
  const fill = engine.block.getFill(block);
  if (!engine.block.isValid(fill)) {
    return { imageFileURI: '', sourceSet: [] };
  }
  return {
    imageFileURI: engine.block.getString(fill, 'fill/image/imageFileURI'),
    sourceSet: engine.block.getSourceSet(fill, 'fill/image/sourceSet')
  };
}

/** Returns any URI of a block's photo fill, empty when it has none. */
export function getPhotoURI(engine: CreativeEngine, block: number): string {
  const photo = getPhotoFill(engine, block);
  return photo.imageFileURI !== ''
    ? photo.imageFileURI
    : (photo.sourceSet[0]?.uri ?? '');
}

/**
 * Writes a photo into a block's fill.
 *
 */
export function setPhotoFill(
  engine: CreativeEngine,
  block: number,
  photo: PhotoFill
): void {
  const fill = engine.block.getFill(block);
  engine.block.setString(fill, 'fill/image/imageFileURI', photo.imageFileURI);
  engine.block.setSourceSet(fill, 'fill/image/sourceSet', photo.sourceSet);
  engine.block.resetCrop(block);

  const isFilled = photo.imageFileURI !== '' || photo.sourceSet.length > 0;
  engine.block.setPlaceholderEnabled(block, !isFilled);
  if (engine.block.supportsPlaceholderBehavior(fill)) {
    engine.block.setPlaceholderBehaviorEnabled(fill, !isFilled);
  }
}

/** A photo slot still marked as placeholder, or without a photo. */
export function isUnfilledImageSlot(
  engine: CreativeEngine,
  block: number
): boolean {
  return isPhotoBlock(engine, block) && getPhotoURI(engine, block) === '';
}

export const CAPTION_DEFAULTS = [
  'Add a caption',
  'Write a few lines about these photos.'
];

/**
 * Stamps the given text blocks, or every unstamped one when none are given.
 *
 * Pass the blocks a template just brought in: stamping the whole scene
 * would also stamp the user's own text, which then reads as placeholder.
 */
export function stampDefaultTexts(
  engine: CreativeEngine,
  blocks?: number[]
): void {
  const texts = blocks ?? engine.block.findByType(TEXT_TYPE);
  texts.forEach((block) => {
    if (engine.block.getType(block) !== TEXT_TYPE) return;
    if (engine.block.hasMetadata(block, DEFAULT_TEXT_METADATA_KEY)) return;
    if (!CAPTION_DEFAULTS.includes(engine.block.getString(block, 'text/text')))
      return;
    engine.block.setMetadata(
      block,
      DEFAULT_TEXT_METADATA_KEY,
      engine.block.getString(block, 'text/text')
    );
  });
}

/** Returns the text a block was stamped with, or null when unstamped. */
export function getDefaultText(
  engine: CreativeEngine,
  block: number
): string | null {
  if (!engine.block.hasMetadata(block, DEFAULT_TEXT_METADATA_KEY)) return null;
  return engine.block.getMetadata(block, DEFAULT_TEXT_METADATA_KEY);
}

/** A text block whose content still equals its stamp is placeholder text. */
export function isPlaceholderText(
  engine: CreativeEngine,
  block: number
): boolean {
  const defaultText = getDefaultText(engine, block);
  if (defaultText == null) return false;
  return engine.block.getString(block, 'text/text') === defaultText;
}
