/**
 * CE.SDK Photobook Editor - Adding a Spread
 *
 * The reader adds pages to the book a spread at a time. A new spread takes
 * the reader's permissions from the spreads and pages the book already has,
 * so the style scene decides them, not this code.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';
import type { Scope } from '@cesdk/engine';

import { PAGE_KIND } from './constants';
import { isBlank, isJacket } from './spreads';

type CreativeEngine = CreativeEditorSDK['engine'];

/** The scopes a block has enabled. */
type Scopes = Scope[];

/**
 * The permissions the style scene gives each part of the book. A spread
 * that holds the blank inside of the back cover closes the book and may keep
 * other permissions than the spreads before it.
 */
interface BookScopes {
  spread: Scopes;
  closingSpread: Scopes;
  page: Scopes;
  blank: Scopes;
}

function enabledScopes(engine: CreativeEngine, block: number): Scopes {
  return engine.editor
    .findAllScopes()
    .filter((scope) => engine.block.isScopeEnabled(block, scope));
}

function applyScopes(
  engine: CreativeEngine,
  block: number,
  scopes: Scopes
): void {
  engine.editor.findAllScopes().forEach((scope) => {
    engine.block.setScopeEnabled(block, scope, scopes.includes(scope));
  });
}

/**
 * Reads the permissions of the book's inside spreads and pages, or null when
 * the book has no inside spread to read them from.
 */
function readBookScopes(engine: CreativeEngine): BookScopes | null {
  const inside = engine.scene
    .getPages()
    .filter((page) => !isJacket(engine, page));
  const closes = (spread: number) =>
    engine.block.getPageSlices(spread).some((slice) => isBlank(engine, slice));
  const slices = inside.flatMap((spread) => engine.block.getPageSlices(spread));
  const spread = inside.find((page) => !closes(page));
  const closingSpread = inside.find(closes);
  const page = slices.find((slice) => !isBlank(engine, slice));
  const blank = slices.find((slice) => isBlank(engine, slice));
  const scopeSpread = spread ?? closingSpread;
  if (page == null || scopeSpread == null) return null;
  const spreadScopes = enabledScopes(engine, scopeSpread);
  return {
    spread: spreadScopes,
    closingSpread:
      closingSpread == null
        ? spreadScopes
        : enabledScopes(engine, closingSpread),
    page: enabledScopes(engine, page),
    blank: blank == null ? [] : enabledScopes(engine, blank)
  };
}

/**
 * The permissions are read once per scene, when the book opens. The reader
 * can delete inside spreads later, and a new spread still gets the
 * permissions the style scene gave.
 */
const bookScopes = new WeakMap<
  CreativeEngine,
  { scene: number; scopes: BookScopes | null }
>();

/**
 * Reads and keeps the permissions of the loaded book for the spreads the
 * reader adds later. Call it once the book has loaded.
 */
export function rememberBookScopes(engine: CreativeEngine): BookScopes | null {
  const scene = engine.scene.get();
  const remembered = bookScopes.get(engine);
  if (remembered != null && remembered.scene === scene) {
    return remembered.scopes;
  }
  const scopes = readBookScopes(engine);
  if (scene != null) bookScopes.set(engine, { scene, scopes });
  return scopes;
}

/**
 * Makes a page slice the inside of a cover. It is hidden, so it shows nothing
 * and stays out of the print, and it keeps its place in the spread.
 */
function makeBlank(engine: CreativeEngine, pageSlice: number): void {
  engine.block.setKind(pageSlice, PAGE_KIND.blank);
  engine.block.setVisible(pageSlice, false);
}

/** The blank that closes the book, with its spread, or null. */
function findClosingBlank(
  engine: CreativeEngine
): { spread: number; blank: number } | null {
  const spread = engine.scene.getPages().at(-1);
  if (spread == null || isJacket(engine, spread)) return null;
  const blank = engine.block.getPageSlices(spread).at(-1);
  if (blank == null || !isBlank(engine, blank)) return null;
  return { spread, blank };
}

/**
 * Adds an inside spread of two pages at the end of the book. When the book
 * closes on the blank inside of the back cover, that blank becomes a page,
 * and the new spread holds a page and the blank, so it closes the book. The
 * new spread and its pages take the permissions of the book's own. The
 * whole add is one undo step.
 *
 * @param addSpread - Adds a spread of two empty pages at the end of the book
 *   and returns it, as the editor's `page.addSpread` action does. The editor
 *   records the undo step for it.
 * @returns The new spread
 */
export async function addBookSpread(
  engine: CreativeEngine,
  addSpread: () => Promise<number>
): Promise<number> {
  const scopes = rememberBookScopes(engine);
  // A book of single pages has no spread to copy, so the new one keeps the
  // permissions the editor gives it.
  if (scopes == null) return addSpread();
  const closing = findClosingBlank(engine);
  if (closing != null) {
    engine.block.setKind(closing.blank, '');
    engine.block.setVisible(closing.blank, true);
    applyScopes(engine, closing.blank, scopes.page);
    applyScopes(engine, closing.spread, scopes.spread);
  }

  const spread = await addSpread();
  const pages = engine.block.getPageSlices(spread);
  applyScopes(
    engine,
    spread,
    closing != null ? scopes.closingSpread : scopes.spread
  );
  pages.forEach((page) => applyScopes(engine, page, scopes.page));
  if (closing != null) {
    const blank = pages[pages.length - 1];
    makeBlank(engine, blank);
    applyScopes(engine, blank, scopes.blank);
  }
  return spread;
}
