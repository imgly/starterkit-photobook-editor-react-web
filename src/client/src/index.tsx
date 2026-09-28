/**
 * CE.SDK Photobook Editor Starterkit - React Entry Point
 *
 * Demonstrates how to build a photobook editor with CE.SDK: a start screen for
 * size and style, page management with layouts, design validation, and
 * print-ready PDF export.
 *
 * @see https://img.ly/docs/cesdk/js/get-started/overview-e18f40/
 */

import type { Configuration } from '@cesdk/cesdk-js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './app/App';

const config: Configuration = {
  userId: 'starterkit-photobook-editor-user',


  ui: {
    elements: {
      libraries: {
        insert: { autoClose: false },
        replace: { autoClose: false }
      }
    }
  }
};

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

const root = createRoot(container);
root.render(
  <StrictMode>
    <App config={config} />
  </StrictMode>
);
