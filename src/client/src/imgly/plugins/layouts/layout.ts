/**
 * Layouts Asset Source Plugin
 *
 * Applies a layout to a page and carries the page's photos and text over
 * into the new slots. Photos that no longer fit wait in a per-page stash.
 *
 * @see https://img.ly/docs/cesdk/js/import-media/asset-panel/customize-c9a4de/
 */

import type {
  AssetResult,
  CreativeEngine,
  EditorPlugin,
  EditorPluginContext
} from '@cesdk/cesdk-js';
import CreativeEditorSDK from '@cesdk/cesdk-js';

import { getChildrenTree, visuallySortBlocks } from '../../block-utils';
import { LAYOUTS_SOURCE_ID } from '../../constants';
import { PhotoStash } from '../../photo-stash';
import {
  getDefaultText,
  getPhotoFill,
  isPhotoBlock,
  isUnfilledImageSlot,
  setPhotoFill,
  stampDefaultTexts,
  type PhotoFill
} from '../../placeholders';

const TEXT_TYPE = '//ly.img.ubq/text';

/** The page format a layout set is authored for. */
export type LayoutFormat = 'square' | 'portrait';

/**
 * Where the layout scenes and thumbnails load from.
 *
 * @param assetsBaseURL - The kit's asset root, without a trailing slash
 * @param path - Path under the layouts directory, starting with '/'
 */
function layoutsURL(assetsBaseURL: string, path: string): string {
  return `${assetsBaseURL}/layouts${path}`;
}
/** A page's text and image blocks, each in visual reading order. */
function partitionPageBlocks(engine: CreativeEngine, pageId: number) {
  const children = visuallySortBlocks(engine, getChildrenTree(engine, pageId));
  return {
    texts: children.filter(
      (childId) => engine.block.getType(childId) === TEXT_TYPE
    ),
    images: children.filter((childId) => isPhotoBlock(engine, childId))
  };
}

/** Copies user-entered text with its font and color, slot by slot. */
function copyTexts(
  engine: CreativeEngine,
  fromTexts: number[],
  toTexts: number[]
): void {
  const count = Math.min(fromTexts.length, toTexts.length);
  for (let index = 0; index < count; index++) {
    const fromBlock = fromTexts[index];
    const toBlock = toTexts[index];
    const fromText = engine.block.getString(fromBlock, 'text/text');

    // Placeholder text is not user content: the new layout keeps its own
    // template text instead.
    if (fromText === getDefaultText(engine, fromBlock)) continue;

    const fromFontFileUri = engine.block.getString(
      fromBlock,
      'text/fontFileUri'
    );
    try {
      const fromTypeface = engine.block.getTypeface(fromBlock);
      engine.block.setFont(toBlock, fromFontFileUri, fromTypeface);
    } catch (error) {
      console.warn('Copying the text font failed:', error);
    }

    const fromTextFillColor = engine.block.getColor(
      fromBlock,
      'fill/solid/color'
    );
    engine.block.setString(toBlock, 'text/text', fromText);
    engine.block.setColor(toBlock, 'fill/solid/color', fromTextFillColor);
  }
}

/**
 * Copies photos into the new layout's slots, slot by slot, and returns
 * the photos that no longer fit.
 */
function copyImages(
  engine: CreativeEngine,
  fromImages: number[],
  toImages: number[]
): PhotoFill[] {
  const count = Math.min(fromImages.length, toImages.length);
  for (let index = 0; index < count; index++) {
    const fromBlock = fromImages[index];
    const toBlock = toImages[index];
    const photo = getPhotoFill(engine, fromBlock);
    setPhotoFill(engine, toBlock, photo);
    if (engine.block.supportsPlaceholderBehavior(fromBlock)) {
      engine.block.setPlaceholderBehaviorEnabled(
        toBlock,
        engine.block.isPlaceholderBehaviorEnabled(fromBlock)
      );
    }
  }

  return fromImages
    .slice(count)
    .map((fromBlock) => getPhotoFill(engine, fromBlock))
    .filter((photo) => photo.imageFileURI !== '' || photo.sourceSet.length > 0);
}

/**
 * Applies a layout asset to the current page: the page's blocks are
 * replaced by the layout's, user content is carried over slot by slot,
 * and excess photos spill into the stash. Creates one undo step.
 */
export async function applyLayoutToPage(
  engine: CreativeEngine,
  asset: AssetResult,
  stash: PhotoStash
): Promise<number> {
  // The current page is the selected page when one is selected, so a
  // layout opened from a page's canvas menu replaces that page while the
  // dock flow targets the centred page.
  const page = engine.scene.getCurrentPage();
  if (page == null) {
    throw new Error('No current page found');
  }
  const pageWasSelected = engine.block.isSelected(page);

  const layoutURI = asset.meta?.uri;
  if (typeof layoutURI !== 'string') {
    throw new Error('The layout asset carries no URI');
  }

  engine.block
    .findAllSelected()
    .forEach((block) => engine.block.setSelected(block, false));

  // The layout's fonts and images sit beside its blocks file, so the engine
  // resolves them against the URL it was loaded from.
  const blocks = await engine.block.loadFromURL(layoutURI);
  const layoutPage = blocks[0];

  stampDefaultTexts(engine, getChildrenTree(engine, layoutPage));

  // The page can be deleted while the layout loads.
  if (!engine.block.isValid(page)) {
    engine.block.destroy(layoutPage);
    return page;
  }

  const scopeBefore = engine.editor.getGlobalScope('lifecycle/destroy');
  engine.editor.setGlobalScope('lifecycle/destroy', 'Allow');
  let oldPage: number | null = null;
  try {
    // The layout template is authored for one page format; a content-aware
    // resize reflows it to the target page instead of stretching it. The
    // resize needs attached blocks, so the template page joins the scene
    // first and leaves it again when it is destroyed below.
    const pageParent = engine.block.getParent(page);
    if (pageParent != null) {
      engine.block.appendChild(pageParent, layoutPage);
    }
    engine.block.resizeContentAware(
      [layoutPage],
      engine.block.getWidth(page),
      engine.block.getHeight(page)
    );

    oldPage = engine.block.duplicate(page);

    engine.block.getChildren(page).forEach((child) => {
      engine.block.destroy(child);
    });
    engine.block.getChildren(layoutPage).forEach((child) => {
      engine.block.appendChild(page, child);
    });

    const from = partitionPageBlocks(engine, oldPage);
    const to = partitionPageBlocks(engine, page);
    copyTexts(engine, from.texts, to.texts);
    // An empty slot still carries the template's placeholder graphic, so
    // only slots holding a real photo are worth carrying over.
    const fromPhotos = from.images.filter(
      (block) => !isUnfilledImageSlot(engine, block)
    );
    const overflow = copyImages(engine, fromPhotos, to.images);
    stash.stashOverflow(page, overflow);
    const openSlots = to.images.slice(fromPhotos.length);
    stash
      .takePhotos(page, openSlots.length)
      .forEach((photo, index) => setPhotoFill(engine, openSlots[index], photo));
  } finally {
    // The elevated destroy scope and the temporary pages must not survive
    // a failure between load and cleanup.
    if (oldPage != null && engine.block.isValid(oldPage)) {
      engine.block.destroy(oldPage);
    }
    if (engine.block.isValid(layoutPage)) {
      engine.block.destroy(layoutPage);
    }
    engine.editor.setGlobalScope('lifecycle/destroy', scopeBefore);
  }

  // Keeping the page selected keeps it the current page, so applying
  // several layouts in a row replaces the same page.
  if (pageWasSelected) {
    engine.block.setSelected(page, true);
  }

  engine.editor.addUndoStep();
  return page;
}
/**
 * Adds the layouts asset source and applies a picked layout to the
 * current page. The dock entry for the panel is configured in the dock
 * setup.
 */
export class LayoutsAssetSourcePlugin implements EditorPlugin {
  name = 'cesdk-layouts-asset-source';

  version = CreativeEditorSDK.version;

  private unsubscribeMiddleware?: VoidFunction;

  /** Photos per page that did not fit the last applied layout. */
  private stash = new PhotoStash();

  /**
   * @param format - Which layout set to offer. Layouts are authored per page
   *   format, so a square book must not be offered portrait layouts.
   * @param assetsBaseURL - Where the layout scenes and thumbnails load from,
   *   without a trailing slash. The host app resolves this, so this plugin
   *   reads no bundler environment.
   */
  constructor(
    private format: LayoutFormat,
    private assetsBaseURL: string
  ) {}

  async initialize({ cesdk }: EditorPluginContext): Promise<void> {
    if (!cesdk) return;

    // The asset list is generated by scripts/generate-layouts.ts. The engine
    // replaces {{base_url}} in it with the base URL below.
    const response = await fetch(
      layoutsURL(this.assetsBaseURL, `/${this.format}/content.json`)
    );
    if (!response.ok) {
      throw new Error(`Loading the layouts failed: ${response.status}`);
    }
    const content = await response.json();
    // The source id is fixed, so the panel and the canvas toggle address the
    // same source whichever format is loaded.
    await cesdk.engine.asset.addLocalAssetSourceFromJSONString(
      JSON.stringify({ ...content, id: LAYOUTS_SOURCE_ID }),
      layoutsURL(this.assetsBaseURL, '')
    );

    this.stash.attach(cesdk.engine);

    this.unsubscribeMiddleware = cesdk.engine.asset.registerApplyMiddleware(
      async (sourceId, assetResult, apply) => {
        if (sourceId !== LAYOUTS_SOURCE_ID) {
          return apply(sourceId, assetResult);
        }

        return applyLayoutToPage(cesdk.engine, assetResult, this.stash);
      }
    );

    cesdk.ui.addAssetLibraryEntry({
      id: LAYOUTS_SOURCE_ID,
      sourceIds: [LAYOUTS_SOURCE_ID],
      // The layouts are grouped by photo-slot count, so the panel opens on
      // an overview of the groups rather than every thumbnail at once.
      showGroupOverview: true,
      previewLength: 3,
      gridColumns: 2,
      gridItemHeight: 'square',
      previewBackgroundType: 'contain',
      gridBackgroundType: 'contain'
    });
  }

  dispose(): void {
    this.unsubscribeMiddleware?.();
    this.stash.dispose();
  }
}
