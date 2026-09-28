/**
 * Design Validation Checks
 *
 * The full list of photobook checks, each mapping engine state to
 * validation results. Presentation (names, descriptions, icons) is
 * handled at the app level, keyed by the check id.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import type {
  BlockValidationResult,
  ValidationState
} from './validation-types';
import {
  getOutsideBlocks,
  getProtrudingBlocks,
  getImageBlockQuality,
  getBleedShortfallBlocks,
  getDuplicateImageBlocks,
  getEmptyPages,
  getPlaceholderImageBlocks,
  getPhotoBlocks
} from './validation-utils';
import {
  isPhotoBlock,
  isPlaceholderText,
  isUnfilledImageSlot
} from './placeholders';

type CreativeEngine = CreativeEditorSDK['engine'];

export type ValidationCheckId =
  | 'outsidePage'
  | 'protrudesFromPage'
  | 'lowResolution'
  | 'bleedMargin'
  | 'duplicateImage'
  | 'emptyPage'
  | 'placeholderImage'
  | 'placeholderText';

export interface ValidationCheck {
  id: ValidationCheckId;
  validate: (
    engine: CreativeEngine
  ) => BlockValidationResult[] | Promise<BlockValidationResult[]>;
}

/**
 * The kind a block reports for display.
 *
 * A template does not always set a block's kind, so a photo is recognised
 * by its fill and everything else falls back to the block's own kind.
 */
function displayKind(engine: CreativeEngine, blockId: number): string {
  if (isPhotoBlock(engine, blockId)) return 'image';
  return engine.block.getKind(blockId);
}

/** Maps detected blocks to results of one severity. */
function toResults(
  engine: CreativeEngine,
  blockIds: number[],
  state: ValidationState
): BlockValidationResult[] {
  return blockIds.map((blockId) => ({
    blockId,
    state,
    blockType: displayKind(engine, blockId)
  }));
}

/**
 * When a photo counts as too low a resolution to print.
 *
 * Quality is the photo's pixels over the pixels its slot needs at the scene's
 * DPI, so 1 is exactly enough.
 *
 * @note These are demo values. Adjust them for production print.
 */
export const LOW_RESOLUTION_THRESHOLDS = {
  failed: 0.15,
  warning: 0.25
};

export const VALIDATION_CHECKS: ValidationCheck[] = [
  {
    id: 'outsidePage',
    validate: (engine) => toResults(engine, getOutsideBlocks(engine), 'failed')
  },
  {
    id: 'protrudesFromPage',
    validate: (engine) =>
      toResults(engine, getProtrudingBlocks(engine), 'warning')
  },
  {
    // The only per-block severity, see LOW_RESOLUTION_THRESHOLDS.
    id: 'lowResolution',
    validate: async (engine) => {
      // An empty slot still carries the template's placeholder graphic, so
      // measuring it would report the template as a low-resolution photo.
      const allImageBlocks = getPhotoBlocks(engine).filter(
        (blockId) => !isUnfilledImageSlot(engine, blockId)
      );
      const measured = await Promise.all(
        allImageBlocks.map(async (blockId) => {
          const quality = await getImageBlockQuality(engine, blockId);
          if (!engine.block.isValid(blockId)) return null;

          const state: ValidationState =
            quality < LOW_RESOLUTION_THRESHOLDS.failed
              ? 'failed'
              : quality < LOW_RESOLUTION_THRESHOLDS.warning
                ? 'warning'
                : 'success';
          return {
            blockId,
            state,
            blockType: displayKind(engine, blockId)
          };
        })
      );
      return measured.filter((result) => result != null);
    }
  },
  {
    id: 'bleedMargin',
    validate: (engine) =>
      toResults(engine, getBleedShortfallBlocks(engine), 'warning')
  },
  {
    id: 'duplicateImage',
    validate: (engine) =>
      toResults(engine, getDuplicateImageBlocks(engine), 'warning')
  },
  {
    id: 'emptyPage',
    validate: (engine) =>
      getEmptyPages(engine).map((blockId) => ({
        blockId,
        state: 'warning' as const,
        blockType: 'page'
      }))
  },
  {
    id: 'placeholderImage',
    validate: (engine) =>
      toResults(engine, getPlaceholderImageBlocks(engine), 'warning')
  },
  {
    id: 'placeholderText',
    validate: (engine) =>
      toResults(
        engine,
        engine.block
          .findByType('//ly.img.ubq/text')
          .filter((blockId) => isPlaceholderText(engine, blockId)),
        'warning'
      )
  }
];
