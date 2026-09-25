/**
 * CE.SDK Photobook Editor - Example Texts
 *
 * Copy shipped with the kit so the photobook reads as a finished book without
 * typing anything. It matches the example photos, a summer trip to Rome.
 * Replace these lines with your own.
 *
 * Captions are written to fit the narrowest caption frame in the templates:
 * 44 characters on one line at the template's 10.08pt caption size.
 */

import type { PhotobookStyleId } from '../imgly';

/** The caption copy a style ships with. */
export interface PhotobookTexts {
  /** Page captions, used in page order. */
  captions: string[];
}

export const EXAMPLE_TEXTS: Record<PhotobookStyleId, PhotobookTexts> = {
  chic: {
    captions: [
      'Golden hour on the Aventine',
      'The long way back through Trastevere',
      'Shutters closed until five',
      'Espresso standing at the bar',
      'Stone worn smooth by August',
      'A courtyard we were not looking for',
      'Orange trees above the river',
      'Evening light on the Tiber',
      'The quiet side of the Pantheon',
      'Laundry lines over Monti',
      'Rain for eleven minutes',
      'Last table on the terrace'
    ]
  },
  playful: {
    captions: [
      'Tuesday, no plans',
      'Lost twice, on purpose',
      'Gelato before lunch. Twice.',
      'He insisted this was a shortcut',
      'Four flights up, worth it',
      'The cat owned that doorway',
      'We walked 19 kilometres today',
      'Nobody could read the map',
      'Second breakfast, obviously',
      'That fountain, again',
      'Too hot to argue about dinner',
      'One more piazza, then home'
    ]
  }
};
