/**
 * Internationalization Configuration - Customize Labels and Translations
 *
 * This file configures custom translations for the design editor UI.
 * You can override any built-in label or add translations for new languages.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/localization-508e20/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

/**
 * Configure translations for the design editor.
 *
 * Translations allow you to:
 * - Customize button labels and UI text
 * - Support multiple languages
 * - Match your brand voice
 * - Provide context-specific terminology
 *
 * @param cesdk - The CreativeEditorSDK instance to configure
 *
 * @example Changing the locale
 * ```typescript
 * cesdk.i18n.setLocale('de');
 * ```
 */
export function setupTranslations(cesdk: CreativeEditorSDK): void {
  cesdk.i18n.setTranslations({
    en: {
      'libraries.ly.img.layouts.label': 'Layouts',
      'libraries.ly.img.layouts.Titles.label': 'Titles',
      'libraries.ly.img.layouts.1 Image.label': '1 Image',
      'libraries.ly.img.layouts.2 Images.label': '2 Images',
      'libraries.ly.img.layouts.3 Images.label': '3 Images',
      'libraries.ly.img.layouts.4 Images.label': '4 Images',
      'libraries.ly.img.layouts.5 Images.label': '5 Images',
      'libraries.ly.img.layouts.6 Images.label': '6 Images',
      'libraries.ly.img.layouts.7 Images.label': '7 Images',
      'libraries.ly.img.layouts.8 Images.label': '8 Images',
      'libraries.ly.img.layouts.9 Images.label': '9 Images',
      'photobook.dock.pages.label': 'Pages',
      'photobook.dock.photos.label': 'Photos',
      'photobook.photos.dragToPlace':
        'Photos cannot be added. Drag a photo to an empty slot or replace an existing one.',
      // The panel lists pages only, so its generic "Layers" title is wrong.
      'component.layerList': 'Pages',
      'photobook.navigationBar.preview': 'Preview',
      'photobook.preview.back': 'Back to Edit',
      'photobook.preview.pageLabel': 'Page {{pages}} / {{total}}',
      'photobook.preview.export': 'Export as PDF',
      'photobook.export.title': 'Exporting photobook',
      'photobook.export.preparing': 'Preparing photobook',
      'photobook.export.progress': 'Exporting {{pages}} pages',
      'photobook.export.converting': 'Converting to PDF/X-4',
      'photobook.export.doneTitle': 'Export finished',
      'photobook.export.done': 'Exported {{pages}} pages in {{seconds}}s',
      'photobook.export.failedTitle': 'Export failed',
      'photobook.export.error.busy':
        'The export server is busy, try again in a moment',
      'photobook.export.error.status': 'The export server answered {{status}}',
      'photobook.export.error.unexpected':
        'Unexpected export response, restart the export server',
      'photobook.export.error.timeout':
        'The export took too long and was given up on',
      'photobook.export.error.lost': 'The export was lost ({{status}})',
      'photobook.export.error.unknownState':
        'The export server sent an unknown job state',
      'photobook.export.error.download':
        'Downloading the PDF failed ({{status}})',
      'photobook.export.error.generic': 'The export failed'
    },
    de: {
      'libraries.ly.img.layouts.label': 'Layouts',
      'libraries.ly.img.layouts.Titles.label': 'Titel',
      'libraries.ly.img.layouts.1 Image.label': '1 Bild',
      'libraries.ly.img.layouts.2 Images.label': '2 Bilder',
      'libraries.ly.img.layouts.3 Images.label': '3 Bilder',
      'libraries.ly.img.layouts.4 Images.label': '4 Bilder',
      'libraries.ly.img.layouts.5 Images.label': '5 Bilder',
      'libraries.ly.img.layouts.6 Images.label': '6 Bilder',
      'libraries.ly.img.layouts.7 Images.label': '7 Bilder',
      'libraries.ly.img.layouts.8 Images.label': '8 Bilder',
      'libraries.ly.img.layouts.9 Images.label': '9 Bilder',
      'photobook.dock.photos.label': 'Fotos',
      'photobook.photos.dragToPlace':
        'Fotos können nicht hinzugefügt werden. Ziehen Sie ein Foto auf einen leeren Platzhalter oder ersetzen Sie ein vorhandenes.',
      'photobook.navigationBar.preview': 'Vorschau',
      'photobook.preview.back': 'Zurück zum Bearbeiten',
      'photobook.preview.pageLabel': 'Seite {{pages}} / {{total}}',
      'photobook.preview.export': 'Als PDF exportieren',
      'photobook.export.title': 'Fotobuch wird exportiert',
      'photobook.export.preparing': 'Fotobuch wird vorbereitet',
      'photobook.export.progress': '{{pages}} Seiten werden exportiert',
      'photobook.export.converting': 'Konvertierung in PDF/X-4',
      'photobook.export.doneTitle': 'Export abgeschlossen',
      'photobook.export.done': '{{pages}} Seiten in {{seconds}}s exportiert',
      'photobook.export.failedTitle': 'Export fehlgeschlagen',
      'photobook.export.error.busy':
        'Der Export-Server ist ausgelastet, bitte gleich noch einmal versuchen',
      'photobook.export.error.status':
        'Der Export-Server antwortete mit {{status}}',
      'photobook.export.error.unexpected':
        'Unerwartete Export-Antwort, bitte den Export-Server neu starten',
      'photobook.export.error.timeout':
        'Der Export dauerte zu lange und wurde abgebrochen',
      'photobook.export.error.lost': 'Der Export ging verloren ({{status}})',
      'photobook.export.error.unknownState':
        'Der Export-Server meldete einen unbekannten Auftragsstatus',
      'photobook.export.error.download':
        'Das PDF konnte nicht heruntergeladen werden ({{status}})',
      'photobook.export.error.generic': 'Der Export ist fehlgeschlagen'
    }
  });
}
