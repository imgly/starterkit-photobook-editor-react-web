/**
 * CE.SDK Photobook Editor - Start Screen Options
 *
 * The photobook sizes, styles, and photo distribution modes offered on the
 * start screen.
 */

import type {
  PhotoDistributionId,
  PhotobookSize,
  PhotobookStyleId
} from '../imgly';
import sizePortraitIcon from './icons/size-portrait.png';
import sizeSquareIcon from './icons/size-square.png';
import styleChicThumb from './icons/style-chic.png';
import stylePlayfulThumb from './icons/style-playful.png';

export type { PhotoDistributionId } from '../imgly';

export interface SizeOption extends PhotobookSize {
  id: string;
  label: string;
  /** Formatted page dimensions shown under the label. */
  dimensionsLabel: string;
  icon: string;
}

export interface StyleOption {
  id: PhotobookStyleId;
  label: string;
  thumb: string;
}

export interface PhotoDistributionOption {
  id: PhotoDistributionId;
  label: string;
  description: string;
}

/** Maximum number of photos a photobook supports. */
export const PHOTO_LIMIT = 50;

export const SIZE_OPTIONS: SizeOption[] = [
  {
    id: 'portrait',
    label: 'Portrait',
    dimensionsLabel: '22 × 28,6 cm',
    width: 220,
    height: 286,
    icon: sizePortraitIcon
  },
  {
    id: 'square',
    label: 'Square',
    dimensionsLabel: '25 × 25 cm',
    width: 250,
    height: 250,
    icon: sizeSquareIcon
  }
];

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'playful',
    label: 'Playful',
    thumb: stylePlayfulThumb
  },
  {
    id: 'chic',
    label: 'Chic',
    thumb: styleChicThumb
  }
];

export const PHOTO_DISTRIBUTION_OPTIONS: PhotoDistributionOption[] = [
  {
    id: 'autoFill',
    label: 'Auto-Fill',
    description: 'Insert photos automatically.'
  },
  {
    id: 'byHand',
    label: 'By Hand',
    description: 'Place each photo yourself.'
  }
];
