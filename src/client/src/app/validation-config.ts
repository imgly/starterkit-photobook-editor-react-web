/**
 * Validation Presentation Configuration
 *
 * User-facing names and descriptions for the validation checks defined in
 * `imgly/validation`. Add an entry here when adding a check there.
 */

import type { ValidationCheckId } from '../imgly/validation';

export const VALIDATION_PRESENTATION: Record<
  ValidationCheckId,
  { name: string; description: string }
> = {
  outsidePage: {
    name: 'Outside of page',
    description: 'The element sits completely outside the page.'
  },
  protrudesFromPage: {
    name: 'Protrudes from page',
    description: 'The element extends beyond the page edge.'
  },
  lowResolution: {
    name: 'Low resolution',
    description:
      'The image resolution is too low for printing and will look blurry.'
  },
  bleedMargin: {
    name: 'Bleed margin',
    description:
      'The image stops at the page edge instead of extending into the bleed.'
  },
  duplicateImage: {
    name: 'Duplicate image',
    description: 'The same photo is used more than once.'
  },
  emptyPage: {
    name: 'Empty page',
    description: 'The page has no content yet.'
  },
  placeholderImage: {
    name: 'Placeholder image',
    description: 'The image slot has no photo yet.'
  },
  placeholderText: {
    name: 'Placeholder text',
    description: 'The text still shows its placeholder content.'
  }
};
