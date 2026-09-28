/**
 * CE.SDK Photobook Editor - Preview Mode
 *
 * Turns the editor into a live page-spread preview: the scene switches to a
 * horizontal stack with touching pages, only the current spread is visible,
 * and the canvas bar carries the navigation. All editor chrome hides while
 * the mode is active and is restored on exit. Preview writes go into a
 * scratch history, so the mode leaves no undo steps behind.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { PREVIEW_BLANK_PAGE_NAME } from './constants';
import { getPreviewPageOrder, getPreviewSpreads } from './photobook';

/**
 * Without custom spreads the book convention applies: the cover stands
 * alone, then consecutive page pairs.
 */
export function getSpreadPages(
  pages: number[],
  spreadIndex: number,
  spreads?: number[][]
): number[] {
  if (spreads != null) {
    return (spreads[spreadIndex] ?? [])
      .map((index) => pages[index])
      .filter((page): page is number => page != null);
  }
  if (spreadIndex === 0) {
    return pages.slice(0, 1);
  }
  const leftIndex = spreadIndex * 2 - 1;
  return pages.slice(leftIndex, leftIndex + 2);
}

export function getSpreadCount(
  pageCount: number,
  spreads?: number[][]
): number {
  if (spreads != null) return Math.max(1, spreads.length);
  return Math.max(1, 1 + Math.ceil((pageCount - 1) / 2));
}
interface ActivePreview {
  goToPrevious: () => void;
  goToNext: () => void;
  back: () => void;
  exportPDF: () => void;
  getSpreadIndex: () => number;
  getSpreadCount: () => number;
}

// The registered canvas bar components dispatch into their own editor's
// active preview, so several editor instances do not share state.
const activePreviews = new WeakMap<CreativeEditorSDK, ActivePreview>();
// Registration is per editor instance: a remounted editor starts without
// the components even though this module keeps its state.
const registeredEditors = new WeakSet<CreativeEditorSDK>();

function registerPreviewComponents(cesdk: CreativeEditorSDK): void {
  if (registeredEditors.has(cesdk)) return;
  registeredEditors.add(cesdk);

  cesdk.ui.registerComponent(
    'photobook.preview.back.canvasBar',
    ({ builder }) => {
      builder.Button('photobook-preview-back', {
        label: 'photobook.preview.back',
        variant: 'regular',
        onClick: () => activePreviews.get(cesdk)?.back()
      });
    }
  );

  cesdk.ui.registerComponent(
    'photobook.preview.navigation.canvasBar',
    ({ builder, engine }) => {
      const preview = activePreviews.get(cesdk);
      const pages = engine.scene.getPages();
      const visiblePages = pages.filter((page) => engine.block.isVisible(page));
      const pageNumbers = visiblePages
        .map((page) => pages.indexOf(page) + 1)
        .join(' & ');
      const spreadIndex = preview?.getSpreadIndex() ?? 0;
      const spreadCount = preview?.getSpreadCount() ?? 1;

      builder.Button('photobook-preview-previous', {
        label: '←',
        isDisabled: spreadIndex === 0,
        onClick: () => preview?.goToPrevious()
      });
      // A disabled button renders the label; the builder has no text component.
      builder.Button('photobook-preview-label', {
        label: cesdk.i18n.translate('photobook.preview.pageLabel', {
          pages: pageNumbers,
          total: pages.length
        }),
        variant: 'plain',
        isDisabled: true
      });
      builder.Button('photobook-preview-next', {
        label: '→',
        isDisabled: spreadIndex >= spreadCount - 1,
        onClick: () => preview?.goToNext()
      });
    }
  );

  cesdk.ui.registerComponent(
    'photobook.preview.export.canvasBar',
    ({ builder }) => {
      builder.Button('photobook-preview-export', {
        label: 'photobook.preview.export',
        color: 'accent',
        variant: 'regular',
        trailingIcon: '@imgly/ArrowUpRight',
        onClick: () => activePreviews.get(cesdk)?.exportPDF()
      });
    }
  );
}
export interface PreviewModeOptions {
  /** Called when the user leaves the preview via the back control. */
  onBack: () => void;
  /**
   * Runs the export behind the preview's export button. The signal aborts
   * when the preview exits while the export still runs.
   */
  onExport?: (signal: AbortSignal) => Promise<void>;
}

/**
 * Enters the page-spread preview mode.
 *
 * @param cesdk - The editor to switch into preview
 * @param options - The back and export callbacks
 * @returns A function that exits the preview and restores the editor
 */
export function enterPreviewMode(
  cesdk: CreativeEditorSDK,
  options: PreviewModeOptions
): VoidFunction {
  const engine = cesdk.engine;
  const scene = engine.scene.get();
  if (scene == null) return () => {};

  registerPreviewComponents(cesdk);

  const previousLayout = engine.block.getEnum(scene, 'scene/layout');
  const previousPage = engine.scene.getCurrentPage();
  const previousZoomLevel = engine.scene.getZoomLevel();
  const previousRole = engine.editor.getRole();
  const previousScroll = engine.editor.getSettingBool('mouse/enableScroll');
  const previousZoom = engine.editor.getSettingBool('mouse/enableZoom');
  const previousTitleShow = engine.editor.getSettingBool('page/title/show');
  const previousHistory = engine.editor.getActiveHistory();
  const previousNavigationBar = cesdk.ui.getComponentOrder({
    in: 'ly.img.navigation.bar'
  });
  const previousDock = cesdk.ui.getComponentOrder({ in: 'ly.img.dock' });
  const previousCanvasBar = cesdk.ui.getComponentOrder({
    in: 'ly.img.canvas.bar',
    at: 'bottom'
  });

  // Preview writes (layout, visibility) go into a scratch history, so the
  // user's undo stack stays untouched.
  const scratchHistory = engine.editor.createHistory();
  engine.editor.setActiveHistory(scratchHistory);

  engine.block
    .findAllSelected()
    .forEach((block) => engine.block.setSelected(block, false));

  const stack = engine.block.findByType('//ly.img.ubq/stack')[0];
  const previousSpacing =
    stack != null ? engine.block.getFloat(stack, 'stack/spacing') : 0;

  const pageOrderBeforePreview = engine.scene.getPages();

  const previewBlanks: number[] = [];
  const makeBlank = () => {
    const template = pageOrderBeforePreview[1];
    const blank = engine.block.create('page');
    engine.block.setName(blank, PREVIEW_BLANK_PAGE_NAME);
    engine.block.setWidth(blank, engine.block.getWidth(template));
    engine.block.setHeight(blank, engine.block.getHeight(template));
    if (stack != null) engine.block.appendChild(stack, blank);
    previewBlanks.push(blank);
    return blank;
  };

  let previewOrder: number[] = [];
  let spreads: number[][] | undefined;

  engine.editor.setSettingBool('page/title/show', false);
  engine.editor.setSettingBool('mouse/enableScroll', false);
  engine.editor.setSettingBool('mouse/enableZoom', false);
  // Preview is read-only. Denying selection at the engine also empties every
  // surface that a selection drives: the canvas menu, the inspector bar and
  // the text controls.
  // Read the scopes before setRole, otherwise it has already reset them and the
  // restore hands back the role's defaults, not the integrator's.
  const previousSelect = engine.editor.getGlobalScope('editor/select');
  const previousTextEdit = engine.editor.getGlobalScope('text/edit');
  engine.editor.setRole('Adopter');
  engine.editor.setGlobalScope('editor/select', 'Deny');
  engine.editor.setGlobalScope('text/edit', 'Deny');

  cesdk.ui.closePanel('*');
  cesdk.feature.disable('ly.img.navigation.bar');
  cesdk.ui.setComponentOrder({ in: 'ly.img.navigation.bar' }, []);
  cesdk.ui.setComponentOrder({ in: 'ly.img.dock' }, []);
  cesdk.ui.setComponentOrder({ in: 'ly.img.canvas.bar', at: 'bottom' }, [
    'photobook.preview.back.canvasBar',
    'ly.img.spacer',
    'photobook.preview.navigation.canvasBar',
    'ly.img.spacer',
    'photobook.preview.export.canvasBar'
  ]);

  let spreadIndex = 0;
  let applyGeneration = 0;
  let activeExport: AbortController | null = null;

  const PREVIEW_PADDING = 48;

  const applySpread = async () => {
    const generation = ++applyGeneration;
    const pages = engine.scene.getPages();
    const spreadPages = getSpreadPages(pages, spreadIndex, spreads);

    pages.forEach((page) => {
      engine.block.setVisible(page, spreadPages.includes(page));
    });

    await engine.scene.zoomToBlock(scene, {
      padding: PREVIEW_PADDING,
      animate: false
    });

    if (generation !== applyGeneration) return;
  };

  const setSpread = (index: number) => {
    const spreadCount = getSpreadCount(engine.scene.getPages().length, spreads);
    spreadIndex = Math.max(0, Math.min(spreadCount - 1, index));
    void applySpread();
  };

  const showAllPages = () => {
    engine.scene
      .getPages()
      .forEach((page) => engine.block.setVisible(page, true));
  };

  let exited = false;
  const restoreChrome = () => {
    cesdk.feature.enable('ly.img.navigation.bar');
    cesdk.ui.setComponentOrder(
      { in: 'ly.img.navigation.bar' },
      previousNavigationBar
    );
    cesdk.ui.setComponentOrder({ in: 'ly.img.dock' }, previousDock);
    cesdk.ui.setComponentOrder(
      { in: 'ly.img.canvas.bar', at: 'bottom' },
      previousCanvasBar
    );
  };

  const exit = () => {
    if (exited) return;
    exited = true;
    activePreviews.delete(cesdk);
    activeExport?.abort();

    try {
      showAllPages();
      if (previousLayout !== 'Free') {
        engine.scene.setLayout(previousLayout);
      }
      if (stack != null) {
        previewBlanks.forEach((blank) => {
          if (engine.block.isValid(blank)) engine.block.destroy(blank);
        });
        pageOrderBeforePreview.forEach((page, index) => {
          if (engine.block.isValid(page)) {
            engine.block.insertChild(stack, page, index);
          }
        });
        engine.block.setFloat(stack, 'stack/spacing', previousSpacing);
      }
      engine.editor.setSettingBool('page/title/show', previousTitleShow);
      engine.editor.setSettingBool('mouse/enableScroll', previousScroll);
      engine.editor.setSettingBool('mouse/enableZoom', previousZoom);
      engine.editor.setRole(previousRole);
    } finally {
      engine.editor.setGlobalScope('text/edit', previousTextEdit);
      engine.editor.setGlobalScope('editor/select', previousSelect);
      engine.editor.setActiveHistory(previousHistory);
      engine.editor.destroyHistory(scratchHistory);
      restoreChrome();
    }

    if (previousPage != null && engine.block.isValid(previousPage)) {
      const page = previousPage;
      requestAnimationFrame(() => {
        if (!engine.block.isValid(page)) return;
        void engine.scene
          .zoomToBlock(page, { padding: 40, animate: false })
          .then(() =>
            cesdk.actions.run('zoom.toLevel', previousZoomLevel, {
              animate: false
            })
          );
      });
    }
  };

  activePreviews.set(cesdk, {
    goToPrevious: () => setSpread(spreadIndex - 1),
    goToNext: () => setSpread(spreadIndex + 1),
    back: () => options.onBack(),
    getSpreadIndex: () => spreadIndex,
    getSpreadCount: () =>
      getSpreadCount(engine.scene.getPages().length, spreads),
    exportPDF: async () => {
      if (options.onExport == null || activeExport != null) return;
      const aborter = new AbortController();
      activeExport = aborter;
      try {
        await options.onExport(aborter.signal);
      } finally {
        if (activeExport === aborter) activeExport = null;
      }
    }
  });

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') setSpread(spreadIndex - 1);
    if (event.key === 'ArrowRight') setSpread(spreadIndex + 1);
    if (event.key === 'Escape') options.onBack();
  };
  window.addEventListener('keydown', handleKeyDown);
  const exitAndCleanup = () => {
    window.removeEventListener('keydown', handleKeyDown);
    exit();
  };

  requestAnimationFrame(() => {
    if (exited || stack == null) return;
    engine.scene.setLayout('HorizontalStack');
    engine.block.setFloat(stack, 'stack/spacing', 0);

    previewOrder = getPreviewPageOrder(
      pageOrderBeforePreview.filter((page) => engine.block.isValid(page)),
      makeBlank,
      engine
    );
    spreads = getPreviewSpreads(previewOrder.length);
    previewOrder.forEach((page, index) =>
      engine.block.insertChild(stack, page, index)
    );

    setSpread(0);
  });

  return exitAndCleanup;
}
