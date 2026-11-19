/**
 * Feature Configuration - What the preview offers
 *
 * The preview shows the book and nothing to edit it with. Every built-in
 * feature is listed: only the canvas bar, which carries the preview's own
 * buttons, and the notifications are switched on.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/customization/disable-or-enable-f058e2/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

/**
 * Configure which features are enabled in the preview.
 *
 * @param cesdk - The CreativeEditorSDK instance to configure
 */
export function setupFeatures(cesdk: CreativeEditorSDK): void {
  cesdk.features.configure({
    // 'ly.img.adjustment': { enabled: true },
    // 'ly.img.animations': { enabled: true },
    // 'ly.img.blendMode': { enabled: true },
    // 'ly.img.blur': { enabled: true },
    'ly.img.canvas.bar': { enabled: true },
    // 'ly.img.canvas.menu': { enabled: true },
    // 'ly.img.combine': { enabled: true },
    // 'ly.img.crop': { enabled: true },
    // 'ly.img.cutout': { enabled: true },
    // 'ly.img.delete': { enabled: true },
    // 'ly.img.dock': { enabled: true },
    // 'ly.img.documentSettings': { enabled: true },
    // 'ly.img.duplicate': { enabled: true },
    // 'ly.img.effect': { enabled: true },
    // 'ly.img.exclusionArea': { enabled: true },
    // 'ly.img.fill': { enabled: true },
    // 'ly.img.filter': { enabled: true },
    // 'ly.img.group': { enabled: true },
    // 'ly.img.inspector': { enabled: true },
    // 'ly.img.inspector.bar': { enabled: true },
    // 'ly.img.keyboard.shortcuts': { enabled: true },
    // 'ly.img.layerList': { enabled: true },
    // 'ly.img.library': { enabled: true },
    // 'ly.img.navigation.bar': { enabled: true },
    'ly.img.notifications': { enabled: true }
    // 'ly.img.opacity': { enabled: true },
    // 'ly.img.page': { enabled: true },
    // 'ly.img.placeholder': { enabled: true },
    // 'ly.img.playbackSpeed': { enabled: true },
    // 'ly.img.position': { enabled: true },
    // 'ly.img.preview': { enabled: true },
    // 'ly.img.replace': { enabled: true },
    // 'ly.img.rulers': { enabled: true },
    // 'ly.img.settings': { enabled: true },
    // 'ly.img.shadow': { enabled: true },
    // 'ly.img.shape': { enabled: true },
    // 'ly.img.stroke': { enabled: true },
    // 'ly.img.text': { enabled: true },
    // 'ly.img.timing': { enabled: true },
    // 'ly.img.transform': { enabled: true },
    // 'ly.img.transitions': { enabled: true },
    // 'ly.img.trim': { enabled: true },
    // 'ly.img.vectorEdit': { enabled: true },
    // 'ly.img.video.caption': { enabled: true },
    // 'ly.img.video.timeline': { enabled: true },
    // 'ly.img.volume': { enabled: true },
  });
}
