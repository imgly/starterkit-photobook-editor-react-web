/**
 * CE.SDK Photobook Editor - Example Photos
 *
 * Photos shipped with the kit so the photobook can be filled without
 * uploading anything. They are served from DEMO_ASSETS_URL; replace them with
 * your own and update the lists below.
 */

import type { RemotePhotoAsset } from '../imgly';
import { DEMO_ASSETS_URL } from '../imgly/demo-assets';

const PORTRAIT_SIZE = { width: 765, height: 1024 };
const LANDSCAPE_SIZE = { width: 1024, height: 572 };

/** Photo numbers that are landscape; every other photo is portrait. */
const LANDSCAPE_NUMBERS = new Set([
  24, 25, 26, 27, 28, 29, 31, 38, 39, 42, 43, 44, 45, 46, 47
]);

const EXAMPLE_PHOTO_COUNT = 50;

const examplePhoto = (number: number): RemotePhotoAsset => {
  const { width, height } = LANDSCAPE_NUMBERS.has(number)
    ? LANDSCAPE_SIZE
    : PORTRAIT_SIZE;
  const uri = `${DEMO_ASSETS_URL}/photos/chic${number}.jpg`;
  return {
    id: `example-photo-${number}`,
    label: `Example ${number}`,
    uri,
    thumbUri: uri,
    width,
    height
  };
};

export const EXAMPLE_PHOTOS: RemotePhotoAsset[] = Array.from(
  { length: EXAMPLE_PHOTO_COUNT },
  (unused, index) => examplePhoto(index + 1)
);
