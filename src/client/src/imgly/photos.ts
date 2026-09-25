/**
 * CE.SDK Photobook Editor - Photo Upload Source
 *
 * Fills the `ly.img.image.upload` asset source with the photobook's photos:
 * remote example photos and the files the user picked.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';
import type { AssetDefinition } from '@cesdk/cesdk-js';

type CreativeEngine = CreativeEditorSDK['engine'];

export const UPLOAD_SOURCE_ID = 'ly.img.image.upload';

/** A remote photo with known pixel dimensions. */
export interface RemotePhotoAsset {
  id: string;
  label: string;
  uri: string;
  thumbUri: string;
  width: number;
  height: number;
}

/** A photo available for filling the photobook. */
export interface PhotoRef {
  uri: string;
  width: number;
  height: number;
}

const resolutionCache = new Map<string, { width: number; height: number }>();

/** Loads an image once and returns its pixel size; results are cached. */
export function fetchImageResolution(
  uri: string
): Promise<{ width: number; height: number }> {
  const cached = resolutionCache.get(uri);
  if (cached != null) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const resolution = {
        width: image.naturalWidth,
        height: image.naturalHeight
      };
      resolutionCache.set(uri, resolution);
      resolve(resolution);
    };
    image.onerror = () => reject(new Error(`Could not load image: ${uri}`));
    image.src = uri;
  });
}

/** Whether an image URI actually loads. */
async function isReachable(uri: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = uri;
  });
}

const imageAssetDefinition = (
  id: string,
  photo: RemotePhotoAsset
): AssetDefinition => ({
  id,
  label: { en: photo.label },
  meta: {
    uri: photo.uri,
    thumbUri: photo.thumbUri,
    kind: 'image',
    fillType: '//ly.img.ubq/fill/image',
    width: photo.width,
    height: photo.height
  }
});

// Object URLs created for uploaded files, revoked when the editor closes.
const createdObjectURLs = new Set<string>();

/** Releases the object URLs of all photos uploaded so far. */
export function revokeUploadedPhotoURLs(): void {
  createdObjectURLs.forEach((uri) => {
    URL.revokeObjectURL(uri);
    // A revoked URL never resolves again, so its measurement is dead weight.
    resolutionCache.delete(uri);
  });
  createdObjectURLs.clear();
}

/**
 * Adds photos to the `ly.img.image.upload` source.
 *
 * Call after the UploadAssetSources plugin has registered the source, so the
 * photos are available the moment the editor shows.
 *
 * @param engine - The engine whose upload source to fill
 * @param remotePhotos - Remote photos with known dimensions
 * @param files - Image files picked by the user
 * @returns The added photos, the user's files first, in pick order
 */
export async function addPhotosToUploadSource(
  engine: CreativeEngine,
  remotePhotos: RemotePhotoAsset[],
  files: File[]
): Promise<PhotoRef[]> {
  const remoteAvailable =
    remotePhotos.length > 0 && (await isReachable(remotePhotos[0].uri));
  const availableRemotePhotos = remoteAvailable ? remotePhotos : [];
  if (!remoteAvailable && remotePhotos.length > 0) {
    console.warn(
      `Remote photos are not reachable at ${remotePhotos[0].uri}; continuing without them.`
    );
  }

  availableRemotePhotos.forEach((photo) => {
    // Their size is already known, so validation need not download them
    // to measure one.
    resolutionCache.set(photo.uri, {
      width: photo.width,
      height: photo.height
    });
    engine.asset.addAssetToSource(
      UPLOAD_SOURCE_ID,
      imageAssetDefinition(photo.id, photo)
    );
  });

  const uploads = await Promise.all(
    files.map(async (file, index) => {
      const uri = URL.createObjectURL(file);
      // Tracked before the measurement awaits, so closing the editor in
      // the meantime still revokes it.
      createdObjectURLs.add(uri);
      try {
        const { width, height } = await fetchImageResolution(uri);
        return {
          photo: { uri, width, height },
          definition: imageAssetDefinition(
            `photobook-upload-${index}-${file.name}`,
            {
              id: `photobook-upload-${index}-${file.name}`,
              label: file.name,
              uri,
              thumbUri: uri,
              width,
              height
            }
          )
        };
      } catch (error) {
        // An unreadable file is skipped rather than failing initialization.
        console.warn('Reading a photo failed:', error);
        URL.revokeObjectURL(uri);
        createdObjectURLs.delete(uri);
        return null;
      }
    })
  );

  const accepted = uploads.filter(
    (upload): upload is NonNullable<(typeof uploads)[number]> => upload != null
  );
  accepted.forEach((upload) => {
    engine.asset.addAssetToSource(UPLOAD_SOURCE_ID, upload.definition);
  });

  return [
    ...accepted.map((upload) => upload.photo),
    ...availableRemotePhotos.map(({ uri, width, height }) => ({
      uri,
      width,
      height
    }))
  ];
}
