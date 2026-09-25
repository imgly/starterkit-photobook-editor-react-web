/**
 * Where this kit's demo assets (layout scenes, style scenes, example photos)
 * are loaded from. Set `VITE_DEMO_ASSETS_BASE_URL` in `.env` to serve them
 * from your own CDN or server. Without it the kit reads them from its own
 * URL. No trailing slash.
 */

// The engine resolves a relative URI against its own asset base, not the page,
// so the URL has to be absolute.
const configured: string =
  import.meta.env.VITE_DEMO_ASSETS_BASE_URL ??
  'https://staticimgly.com/imgly/cesdk-web-examples-data/1.83.0-rc.2/starterkit-photobook-editor';

export const DEMO_ASSETS_BASE_URL: string = (
  typeof location === 'undefined'
    ? configured
    : new URL(configured, location.href).href
).replace(/\/$/, '');

/** Root the kit's demo asset tree hangs off, mirroring the CDN layout. */
export const DEMO_ASSETS_URL = `${DEMO_ASSETS_BASE_URL}/assets`;
