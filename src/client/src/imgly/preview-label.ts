/**
 * CE.SDK Photobook Editor - Preview Label
 *
 * The label under the preview names the spread in view.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { isBlank } from './spreads';

type CreativeEngine = CreativeEditorSDK['engine'];

/**
 * The label of the spread in view. A spread with a name, such as the
 * jacket's "Cover", shows its name. Any other shows the numbers of its pages,
 * counted through the book as the editor counts them, out of the last.
 */
export function getPreviewLabel(
  cesdk: CreativeEditorSDK,
  engine: CreativeEngine
): string {
  const spreads = engine.scene.getPages();
  const visible = spreads.find((spread) => engine.block.isVisible(spread));
  if (visible == null) return '';
  const name = engine.block.getName(visible);
  if (name !== '') return name;

  let number = 0;
  const pages: number[] = [];
  let total = 0;
  spreads.forEach((spread) => {
    const slices = engine.block.getPageSlices(spread);
    (slices.length === 0 ? [spread] : slices).forEach((page) => {
      number += 1;
      if (page !== spread && isBlank(engine, page)) return;
      total = number;
      if (spread === visible) pages.push(number);
    });
  });
  return cesdk.i18n.translate('photobook.preview.pageLabel', {
    pages: pages.join(' & '),
    total
  });
}
