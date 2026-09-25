# Photobook Editor Starter Kit

A complete photobook editor built with [CE.SDK](https://img.ly/products/creative-sdk): a start screen for size, style, and photo distribution, an editor with a layouts library, auto-fill, and live design validation, an in-canvas page-spread preview, and export to print-ready PDF/X-4 in the browser or on an optional Node server.

## Getting Started

### 1. Clone and install

```bash
npm install
```

### 2. Configure your license

```bash
cp .env.example .env
```

Set `VITE_CESDK_LICENSE` in `.env`. Get a free trial license at [img.ly/forms/free-trial](https://img.ly/forms/free-trial). The export server reads `CESDK_LICENSE`, which stays server-only.

### 3. Run

```bash
npm run dev
```

This starts the web app on [http://localhost:5173](http://localhost:5173), and everything including PDF export runs in the browser.

To run the kit end to end with its export server, use `npm run dev:server` instead. That starts the web app and the export server together (port 8080, proxied at `/api`) and sets `VITE_USE_SERVER=true` for you. Plain `npm run dev` never calls the server, so an export that fails says so instead of silently rendering somewhere else.

## Architecture

```
src/
├── client/           The web app (Vite + React)
│   ├── index.html
│   └── src/
│       ├── app/      Application shell: StartScreen, UploadModal,
│       │             ValidationSidebar, export client, App state machine
│       └── imgly/    Reusable editor logic: config/ skeleton, layouts
│                     plugin, preview mode, autofill, photos, validation
├── server/           The export server (Express + @cesdk/node-native)
│   ├── index.ts      Wires the generic server to the imgly exporter
│   ├── imgly/        Engine lifecycle, export pipeline, export timeout
│   ├── jobs/         Job store, rate windows, expiry
│   └── http/         Routes, admission middleware, error handling
└── shared/           Wire types shared by the app and the server
```

The app is a `start | editor | preview` state machine (`src/client/src/app/App.tsx`). The editor stays mounted across `editor` and `preview`: the preview is a _mode_ of the editor (`src/client/src/imgly/preview-mode.ts`) that switches the scene into page spreads and swaps the chrome, not a separate screen.

## The Export Server

"Export as PDF" renders in the browser, or on the export server when `VITE_USE_SERVER=true`. Either way the PDF is converted to PDF/X-4 (FOGRA39) in the browser with `@imgly/plugin-print-ready-pdfs-web`.

With the server, the client uploads the scene archive to `POST /api/export`, polls `GET /api/export/:id`, and downloads the rendered PDF from `GET /api/export/:id/file`. The server renders with the GPU-accelerated `@cesdk/node-native` engine, which keeps a large book off the browser's main thread.

Built-in limits (all server-side, see `src/server/http/routes.ts` and `src/server/jobs/store.ts`): a 256 MB body cap, three active jobs globally, one per client, ten exports per client per ten minutes, and a five-minute pickup TTL. The server demonstrates these hardening patterns but ships without TLS or authentication — put a real gateway in front before exposing it.

The exported PDF has no bleed yet.

`@cesdk/node-native` must track the same version as the CE.SDK packages the client uses. It is a native binary: macOS (ARM/x64), Linux x64 with glibc ≥ 2.39, or Windows x64.

## Configuration

- **Sizes, styles, distribution** — `src/client/src/app/photobook-options.ts` (labels are cm, scene values are mm)
- **Layouts** — the plugin in `src/client/src/imgly/plugins/layouts/`; excess photos from a smaller layout wait in a per-page stash and flow back when a larger layout returns
- **Validation checks** — detectors in `src/client/src/imgly/validation.ts`, names and descriptions in `src/client/src/app/validation-config.ts`
- **Editor configuration** — the `src/client/src/imgly/config/` skeleton (dock, navigation bar, canvas menu, features, settings)

## Adapting This Kit

- `userId` in `src/client/src/index.tsx` — set your own analytics identifier
- `VITE_DEMO_ASSETS_BASE_URL` in `.env` — host the demo assets yourself (default in `src/client/src/imgly/demo-assets.ts`)
- The export server port (8080) appears in `src/server/index.ts` and the vite proxy in `vite.config.ts`
- `src/client/src/app/example-photos.ts` — the photos behind "Use examples"
- Node ≥ 22 is required (`engines` in package.json); the server runs TypeScript through [tsx](https://tsx.is)

## Troubleshooting

- **Blank editor** — missing or invalid `VITE_CESDK_LICENSE`
- **Export is slow or freezes the tab** — the PDF/X conversion runs in the browser and dominates a large export; `VITE_USE_SERVER=true` with `npm run dev:server` moves only the rendering onto the export server
- **"The export server is busy"** — the rate limits answered 429; retry in a moment
- **Uploads silently skipped** — only JPEG, PNG, and WebP files are accepted

## License

See [LICENSE](./LICENSE).
