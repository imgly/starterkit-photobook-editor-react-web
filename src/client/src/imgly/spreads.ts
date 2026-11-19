/**
 * CE.SDK Photobook Editor - Page Spreads
 *
 * The book is a list of spreads, as the style scenes are saved. The jacket is
 * one spread of three pages: the back cover, the spine and the front cover.
 * Every inside spread holds two facing pages. A page of a spread is a page
 * slice: the spread lays its page slices out side by side, and the engine
 * gives each block to the page slice that holds its centre.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { PAGE_KIND, PAGE_SLICE_TYPE } from './constants';

type CreativeEngine = CreativeEditorSDK['engine'];

/** A rectangle in the coordinates of its page, in design units. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * One page of the book: a page slice of a spread, or a page without page
 * slices. `rect` is where it sits on its page.
 */
export interface BookPage {
  page: number;
  pageSlice: number | null;
  rect: Rect;
}

/** The pages of one spread, or the page itself when it has no page slices. */
export function getBookPagesOf(
  engine: CreativeEngine,
  page: number
): BookPage[] {
  const pageSlices = engine.block.getPageSlices(page);
  if (pageSlices.length === 0) {
    return [
      {
        page,
        pageSlice: null,
        rect: {
          x: 0,
          y: 0,
          width: engine.block.getWidth(page),
          height: engine.block.getHeight(page)
        }
      }
    ];
  }
  return pageSlices.map((pageSlice) => ({
    page,
    pageSlice,
    rect: {
      x: engine.block.getPositionX(pageSlice),
      y: engine.block.getPositionY(pageSlice),
      width: engine.block.getWidth(pageSlice),
      height: engine.block.getHeight(pageSlice)
    }
  }));
}

/** Every page of the book in reading order, without the blank inside of a cover. */
export function getBookPages(engine: CreativeEngine): BookPage[] {
  return engine.scene
    .getPages()
    .flatMap((page) => getBookPagesOf(engine, page))
    .filter(
      (bookPage) =>
        bookPage.pageSlice == null || !isBlank(engine, bookPage.pageSlice)
    );
}

/** The top-level blocks of a page of the book, by the page slice the engine gives them to. */
export function getBookPageBlocks(
  engine: CreativeEngine,
  bookPage: BookPage
): number[] {
  const { page, pageSlice } = bookPage;
  const content = engine.block
    .getChildren(page)
    .filter((child) => engine.block.getType(child) !== PAGE_SLICE_TYPE);
  if (pageSlice == null) return content;
  return content.filter(
    (block) => engine.block.getOwningPageSlice(block) === pageSlice
  );
}

/**
 * Whether a layout may replace the content of a page of the book or of a
 * spread. A layout adds its blocks there, so the block must allow adding
 * content. The style scenes deny it on the jacket and on a blank page.
 */
export function takesLayout(engine: CreativeEngine, block: number): boolean {
  return engine.block.isAllowedByScope(block, 'editor/add');
}

/** The blocks of a page of the book and all their descendants. */
export function getBookPageTree(
  engine: CreativeEngine,
  bookPage: BookPage
): number[] {
  const descendants = (block: number): number[] =>
    engine.block
      .getChildren(block)
      .flatMap((child) => [child, ...descendants(child)]);
  return getBookPageBlocks(engine, bookPage).flatMap((block) => [
    block,
    ...descendants(block)
  ]);
}

/** Whether a page slice is the inside of a cover, which the book leaves blank. */
export function isBlank(engine: CreativeEngine, pageSlice: number): boolean {
  return engine.block.getKind(pageSlice) === PAGE_KIND.blank;
}

/** Whether a page is the jacket: the spread that holds the spine. */
export function isJacket(engine: CreativeEngine, page: number): boolean {
  return engine.block
    .getPageSlices(page)
    .some((pageSlice) => engine.block.getKind(pageSlice) === PAGE_KIND.spine);
}
