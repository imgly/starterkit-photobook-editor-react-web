/**
 * Feature Configuration - What the editor offers
 *
 * `cesdk.features.configure` switches features and their options on or off and sets what they offer. Every built-in
 * feature is listed: switched on where this editor uses it, commented out where it does not. Options inside a
 * feature start on; switch off the ones this editor does not offer.
 *
 * - `cesdk.features.list()` returns every feature with its options and settings.
 * - `cesdk.features.explain(id, { blockId })` says why something does not show.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/customization/disable-or-enable-f058e2/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';
import type { FeatureRuleContext } from '@cesdk/cesdk-js';

/**
 * Configure which features are enabled in the design editor.
 *
 * Uncomment or add features as needed for your use case.
 *
 * @param cesdk - The CreativeEditorSDK instance to configure
 */
export function setupFeatures(cesdk: CreativeEditorSDK): void {
  const isSingleTextBlock = ({ engine, selection }: FeatureRuleContext) =>
    selection.length === 1 &&
    engine.block.getType(selection[0]) === '//ly.img.ubq/text';

  cesdk.features.configure({
    'ly.img.adjustment': { enabled: true },
    // 'ly.img.animations': { enabled: true },
    'ly.img.blendMode': { enabled: true },
    'ly.img.blur': { enabled: true },
    'ly.img.canvas.bar': { enabled: true },
    'ly.img.canvas.menu': { enabled: true },
    'ly.img.combine': { enabled: true },
    'ly.img.crop': { enabled: true },
    'ly.img.cutout': { enabled: true },
    'ly.img.delete': { enabled: true },
    'ly.img.dock': { enabled: true },
    'ly.img.documentSettings': { enabled: true },
    'ly.img.duplicate': { enabled: true },
    'ly.img.effect': { enabled: true },
    // 'ly.img.exclusionArea': { enabled: true },
    'ly.img.fill': {
      enabled: true,
      when: { narrow: isSingleTextBlock },
      options: {
        image: { enabled: false },
        video: { enabled: false },
        // Color mode of each color picker: 'RGB', 'CMYK', or 'Any' for both
        color: { options: { picker: { colorMode: 'Any' } } }
      }
    },
    'ly.img.filter': { enabled: true },
    'ly.img.group': { enabled: true },
    'ly.img.inspector': {
      enabled: true,
      options: { toggle: { enabled: false } }
    },
    'ly.img.inspector.bar': { enabled: true },
    'ly.img.keyboard.shortcuts': { enabled: true },
    'ly.img.layerList': {
      enabled: true,
      thumbnails: true,
      options: {
        // Each spread is a row of page pictures. The page numbers name the
        // spread, so its title is left out, and a page shows its own name.
        // A strip draws pages as pictures, so pages take no icons.
        pages: {
          layout: 'strip',
          labels: 'pages',
          pageTitle: 'name',
          rowSize: 120
        },
        // The layers list is off. Turned on, its rows show their type icons.
        layers: { enabled: false, icons: true },
        visibility: { enabled: false },
        // The cover is locked to keep it first, so readers get no padlock.
        lock: { enabled: false }
      }
    },
    'ly.img.library': { enabled: true },
    'ly.img.navigation.bar': { enabled: true },
    'ly.img.notifications': { enabled: true },
    'ly.img.opacity': { enabled: true },
    'ly.img.page': {
      enabled: true,
      options: {
        move: { enabled: false },
        add: { enabled: false },
        resize: { enabled: false },
        // Readers don't change clipping: a spread clips at its outer edges, and a
        // photo can cross the fold between its pages.
        clipContent: { enabled: false },
        bleedMargin: { options: { color: { enabled: false } } },
        printMarks: {
          enabled: false,
          options: {
            crop: { enabled: false },
            registration: { enabled: false }
          }
        },
        safetyMargin: {
          enabled: false,
          options: { color: { enabled: false } }
        },
        fontSizeUnit: { enabled: false }
      }
    },
    // 'ly.img.placeholder': { enabled: true },
    // 'ly.img.playbackSpeed': { enabled: true },
    'ly.img.position': { enabled: true },
    // 'ly.img.preview': { enabled: true },
    'ly.img.replace': { enabled: true },
    // 'ly.img.rulers': { enabled: true },
    // 'ly.img.settings': { enabled: true },
    // 'ly.img.shadow': { enabled: true },
    'ly.img.shape': {
      enabled: true,
      options: { lineWidth: { enabled: true }, edit: { enabled: false } }
    },
    // 'ly.img.stroke': { enabled: true },
    'ly.img.text': {
      enabled: true,
      options: {
        decoration: { enabled: false },
        list: { enabled: false, styles: [] },
        path: {
          enabled: false,
          options: {
            curve: { enabled: false },
            position: { enabled: false },
            direction: { enabled: false },
            offset: { enabled: false },
            edit: { enabled: false }
          }
        },
        background: {
          enabled: false,
          options: {
            picker: { enabled: false },
            opacity: { enabled: false },
            library: { enabled: false }
          }
        },
        color: {
          when: { narrow: isSingleTextBlock },
          options: { picker: { colorMode: 'Any' } }
        },
        styles: { enabled: false }
      }
    },
    // 'ly.img.timing': { enabled: true },
    'ly.img.transform': { enabled: true },
    // 'ly.img.transitions': { enabled: true },
    'ly.img.trim': { enabled: true }
    // 'ly.img.vectorEdit': { enabled: true },
    // 'ly.img.video.caption': { enabled: true },
    // 'ly.img.video.timeline': { enabled: true },
    // 'ly.img.volume': { enabled: true },
  });
}
