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
import {
  LAYOUTS_PANEL_ID,
  LAYOUTS_SOURCE_ID,
  PAGE_KIND,
  PAGE_SLICE_TYPE,
  PAGE_TYPE,
  SPREAD_LAYOUTS_SOURCE_ID
} from '../../constants';
import { PhotoStash } from '../../photo-stash';
import {
  getBookPageBlocks,
  getBookPagesOf,
  isBlank,
  takesLayout,
  type BookPage
} from '../../spreads';
import {
  getDefaultText,
  getPhotoFill,
  isPhotoBlock,
  isUnfilledImageSlot,
  setPhotoFill,
  stampDefaultTexts,
  type PhotoFill
} from '../../placeholders';

import { clipToPage } from './fold';

const TEXT_TYPE = '//ly.img.ubq/text';

/** The page format a layout set is authored for. */
export type LayoutFormat = 'square' | 'portrait' | 'a4' | 'a4-landscape';

/**
 * Where the layout scenes and thumbnails load from.
 *
 * @param assetsBaseURL - The kit's asset root, without a trailing slash
 * @param path - Path under the layouts directory, starting with '/'
 */
function layoutsURL(assetsBaseURL: string, path: string): string {
  return `${assetsBaseURL}/layouts${path}`;
}
/** The text and image blocks under `roots`, each in visual reading order. */
function partitionBlocks(engine: CreativeEngine, roots: number[]) {
  const children = visuallySortBlocks(
    engine,
    roots.flatMap((root) => [root, ...getChildrenTree(engine, root)])
  );
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
    const fromBlock = fromTexts[index]!;
    const toBlock = toTexts[index]!;
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
    const fromBlock = fromImages[index]!;
    const toBlock = toImages[index]!;
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
 * The page of the book nearest the centre of the visible canvas, the first one
 * when the engine has no canvas or two pages are as near. The editor's panels
 * cover the canvas at its safe area insets, so the centre is that of the rest.
 */
function pageNearestView(engine: CreativeEngine, bookPages: BookPage[]) {
  const canvas = engine.element;
  if (canvas == null) return bookPages[0];
  const inset = engine.editor.getSafeAreaInsets();
  const centreX =
    inset.left + (canvas.clientWidth - inset.left - inset.right) / 2;
  const centreY =
    inset.top + (canvas.clientHeight - inset.top - inset.bottom) / 2;
  const distance = ({ page, pageSlice }: BookPage) => {
    const [x, y, width, height] = engine.block.getScreenSpaceBoundingBoxXYWH([
      pageSlice ?? page
    ]);
    return Math.hypot(x + width / 2 - centreX, y + height / 2 - centreY);
  };
  return bookPages.reduce((nearest, bookPage) =>
    distance(bookPage) < distance(nearest) - 1 ? bookPage : nearest
  );
}

/**
 * The page of the book a single page layout applies to: the selected page of
 * a spread, or else the page of the current spread nearest the centre of the
 * canvas. The spine, a blank inside of a cover and a page that does not take
 * a layout are left out, so the list is empty when no page takes it.
 */
function getLayoutTargets(engine: CreativeEngine, page: number): BookPage[] {
  const bookPages = getBookPagesOf(engine, page);
  const [selected] = engine.block.findAllSelected();
  const selectedPage = bookPages.find(
    (bookPage) => bookPage.pageSlice != null && bookPage.pageSlice === selected
  );
  const candidates = (
    selectedPage != null
      ? [selectedPage]
      : bookPages.filter(
          (bookPage) =>
            bookPage.pageSlice == null ||
            (engine.block.getKind(bookPage.pageSlice) !== PAGE_KIND.spine &&
              !isBlank(engine, bookPage.pageSlice))
        )
  ).filter((bookPage) =>
    takesLayout(engine, bookPage.pageSlice ?? bookPage.page)
  );
  return candidates.length === 0 ? [] : [pageNearestView(engine, candidates)!];
}

/**
 * Applies a layout to one page of the book: its blocks are replaced by the
 * layout's, user content is carried over slot by slot, and excess photos
 * spill into that page's stash.
 */
async function applyLayoutToBookPage(
  engine: CreativeEngine,
  layoutURI: string,
  target: BookPage,
  stash: PhotoStash
): Promise<boolean> {
  // The layout's fonts and images sit beside its blocks file, so the engine
  // resolves them against the URL it was loaded from.
  const blocks = await engine.block.loadFromURL(layoutURI);
  const layoutPage = blocks[0]!;
  stampDefaultTexts(engine, getChildrenTree(engine, layoutPage));

  // The page can be deleted while the layout loads.
  const { page, rect } = target;
  if (!engine.block.isValid(page)) {
    engine.block.destroy(layoutPage);
    return false;
  }

  try {
    // The layout template is authored for one page format; a content-aware
    // resize reflows it to the target page instead of stretching it. The
    // resize needs attached blocks, so the template page joins the scene
    // first and leaves it again when it is destroyed below.
    const pageParent = engine.block.getParent(page);
    if (pageParent != null) {
      engine.block.appendChild(pageParent, layoutPage);
    }
    engine.block.resizeContentAware([layoutPage], rect.width, rect.height);

    const oldBlocks = getBookPageBlocks(engine, target);
    const newBlocks = engine.block.getChildren(layoutPage);
    const spreadSize = {
      width: engine.block.getWidth(page),
      height: engine.block.getHeight(page)
    };
    newBlocks.forEach((child) => {
      const clipped = clipToPage(
        {
          x: engine.block.getPositionX(child),
          y: engine.block.getPositionY(child),
          width: engine.block.getWidth(child),
          height: engine.block.getHeight(child)
        },
        rect,
        spreadSize
      );
      engine.block.appendChild(page, child);
      engine.block.setPositionX(child, clipped.x);
      engine.block.setPositionY(child, clipped.y);
      engine.block.setWidth(child, clipped.width);
      engine.block.setHeight(child, clipped.height);
    });

    const from = partitionBlocks(engine, oldBlocks);
    const to = partitionBlocks(engine, newBlocks);
    copyTexts(engine, from.texts, to.texts);
    // An empty slot still carries the template's placeholder graphic, so
    // only slots holding a real photo are worth carrying over.
    const fromPhotos = from.images.filter(
      (block) => !isUnfilledImageSlot(engine, block)
    );
    const overflow = copyImages(engine, fromPhotos, to.images);
    const stashKey = target.pageSlice ?? page;
    stash.stashOverflow(stashKey, overflow);
    const openSlots = to.images.slice(fromPhotos.length);
    stash
      .takePhotos(stashKey, openSlots.length)
      .forEach((photo, index) =>
        setPhotoFill(engine, openSlots[index]!, photo)
      );
    oldBlocks.forEach((block) => engine.block.destroy(block));
    return true;
  } finally {
    if (engine.block.isValid(layoutPage)) {
      engine.block.destroy(layoutPage);
    }
  }
}

/**
 * The spread a layout goes to and the pages of the book it replaces, in the
 * selected spread, or in the spread of a selected page, else in the current
 * spread. A spread layout covers the whole spread, and a single page layout
 * one of its pages. No page is listed when none of them takes a layout.
 */
export function findLayoutTargets(
  engine: CreativeEngine,
  scope: 'page' | 'spread' = 'page'
): { page: number; targets: BookPage[] } {
  const [selected] = engine.block.findAllSelected();
  const selectedType =
    selected != null ? engine.block.getType(selected) : undefined;
  const page =
    selectedType === PAGE_SLICE_TYPE
      ? engine.block.getParent(selected)
      : selectedType === PAGE_TYPE
        ? selected
        : engine.scene.getCurrentPage();
  if (page == null) {
    throw new Error('No current page found');
  }
  if (scope === 'page') {
    return { page, targets: getLayoutTargets(engine, page) };
  }
  // A spread layout covers the whole spread, so its photos may cross the fold.
  const spread: BookPage = {
    page,
    pageSlice: null,
    rect: {
      x: 0,
      y: 0,
      width: engine.block.getWidth(page),
      height: engine.block.getHeight(page)
    }
  };
  return { page, targets: takesLayout(engine, page) ? [spread] : [] };
}

/**
 * Applies a layout asset to the current spread, or to its selected page.
 * Creates one undo step.
 *
 * @param found - The pages to replace, when the caller found them already
 */
export async function applyLayoutToPage(
  engine: CreativeEngine,
  asset: AssetResult,
  stash: PhotoStash,
  scope: 'page' | 'spread' = 'page',
  found: { page: number; targets: BookPage[] } = findLayoutTargets(
    engine,
    scope
  )
): Promise<number> {
  const { page, targets } = found;
  const selection = engine.block.findAllSelected();

  const layoutURI = asset.meta?.uri;
  if (typeof layoutURI !== 'string') {
    throw new Error('The layout asset carries no URI');
  }

  selection.forEach((block) => engine.block.setSelected(block, false));

  const destroyBefore = engine.editor.getGlobalScope('lifecycle/destroy');
  engine.editor.setGlobalScope('lifecycle/destroy', 'Allow');
  let applied = false;
  try {
    for (const target of targets) {
      if (await applyLayoutToBookPage(engine, layoutURI, target, stash)) {
        applied = true;
      }
    }
  } finally {
    // The elevated scopes must not survive a failure.
    engine.editor.setGlobalScope('lifecycle/destroy', destroyBefore);
  }

  // Keeping the selection keeps the current page, so applying several
  // layouts in a row replaces the same page.
  selection
    .filter((block) => engine.block.isValid(block))
    .forEach((block) => engine.block.setSelected(block, true));

  // A spread deleted while the layout loaded changed nothing to undo.
  if (applied) engine.editor.addUndoStep();
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

  private format: LayoutFormat;

  private assetsBaseURL: string;

  /**
   * @param format - Which layout set to offer. Layouts are authored per page
   *   format, so a square book must not be offered portrait layouts.
   * @param assetsBaseURL - Where the layout scenes and thumbnails load from,
   *   without a trailing slash. The host app resolves this, so this plugin
   *   reads no bundler environment.
   */
  constructor(format: LayoutFormat, assetsBaseURL: string) {
    this.format = format;
    this.assetsBaseURL = assetsBaseURL;
  }

  async initialize({ cesdk }: EditorPluginContext): Promise<void> {
    if (!cesdk) return;

    // The engine replaces {{base_url}} in the asset list with the base URL
    // below.
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
    // The spread layouts are a second source, offered as the panel's "2 pages" set.
    const spreadsResponse = await fetch(
      layoutsURL(this.assetsBaseURL, `/${this.format}/spreads/content.json`)
    );
    if (!spreadsResponse.ok) {
      throw new Error(
        `Loading the spread layouts failed: ${spreadsResponse.status}`
      );
    }
    await cesdk.engine.asset.addLocalAssetSourceFromJSONString(
      JSON.stringify({
        ...(await spreadsResponse.json()),
        id: SPREAD_LAYOUTS_SOURCE_ID
      }),
      layoutsURL(this.assetsBaseURL, '')
    );

    this.stash.attach(cesdk.engine);

    this.unsubscribeMiddleware = cesdk.engine.asset.registerApplyMiddleware(
      async (sourceId, assetResult, apply) => {
        if (
          sourceId !== LAYOUTS_SOURCE_ID &&
          sourceId !== SPREAD_LAYOUTS_SOURCE_ID
        ) {
          return apply(sourceId, assetResult);
        }
        const scope = sourceId === LAYOUTS_SOURCE_ID ? 'page' : 'spread';
        const { page, targets } = findLayoutTargets(cesdk.engine, scope);
        if (targets.length === 0) {
          cesdk.ui.showNotification({
            type: 'info',
            message: 'photobook.layouts.locked'
          });
          return page;
        }
        return applyLayoutToPage(cesdk.engine, assetResult, this.stash, scope, {
          page,
          targets
        });
      }
    );

    for (const id of [LAYOUTS_SOURCE_ID, SPREAD_LAYOUTS_SOURCE_ID]) {
      cesdk.ui.addAssetLibraryEntry({
        id,
        sourceIds: [id],
        // The layouts are grouped by photo-slot count, so the panel opens on
        // an overview of the groups rather than every thumbnail at once.
        showGroupOverview: true,
        previewLength: 3,
        gridColumns: 2,
        // A spread's thumbnail is twice as wide as a page's.
        gridItemHeight: id === SPREAD_LAYOUTS_SOURCE_ID ? 'auto' : 'square',
        previewBackgroundType: 'contain',
        gridBackgroundType: 'contain'
      });
    }

    // One panel offers both sets: a single page's layouts and the spread's.
    cesdk.ui.registerPanel(LAYOUTS_PANEL_ID, ({ builder, state }) => {
      const set = state<'page' | 'spread'>('photobook.layouts.set', 'page');
      builder.Section('photobook-layouts-set-section', {
        children: () => {
          builder.ButtonGroup('photobook-layouts-set', {
            children: () => {
              builder.Button('photobook-layouts-single', {
                label: 'photobook.layouts.single',
                isActive: set.value === 'page',
                onClick: () => set.setValue('page')
              });
              builder.Button('photobook-layouts-spread', {
                label: 'photobook.layouts.spread',
                isActive: set.value === 'spread',
                onClick: () => set.setValue('spread')
              });
            }
          });
        }
      });
      builder.Library(`photobook-layouts-library-${set.value}`, {
        entries: [
          set.value === 'page' ? LAYOUTS_SOURCE_ID : SPREAD_LAYOUTS_SOURCE_ID
        ]
      });
    });
  }

  dispose(): void {
    this.unsubscribeMiddleware?.();
    this.stash.dispose();
  }
}
