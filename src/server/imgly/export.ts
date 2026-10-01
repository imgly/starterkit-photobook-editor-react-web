/**
 * CE.SDK Photobook Server - Export Pipeline
 *
 * Renders an uploaded scene archive to PDF with the `@cesdk/node-native`
 * engine. The client converts that PDF to PDF/X-4. Exports run one at a time per process: the
 * engine holds a single scene, so requests queue on a promise chain. A
 * bounded timeout keeps one wedged export from blocking the chain forever.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type CreativeEngineNative from '@cesdk/node-native';

import { PREVIEW_BLANK_PAGE_NAME } from '../../client/src/imgly/constants.ts';
import { type ExportJobPhase } from '../../shared/export-api.ts';

type CreativeEngine = Awaited<ReturnType<typeof CreativeEngineNative.init>>;

/** Hard wall-clock bound per export, conversion included. */
const EXPORT_TIMEOUT_MS = 10 * 60 * 1000;

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

let engine: CreativeEngine | null = null;
let chain: Promise<unknown> = Promise.resolve();
let wedgedExports = 0;

/** True once an export timed out; the engine may be unusable. */
export function isExportWedged(): boolean {
  return wedgedExports > 0;
}

/** The engine is initialized on the first export and then kept warm. */
async function getEngine(): Promise<CreativeEngine> {
  if (engine != null) return engine;
  const { default: CreativeEngine } = await import('@cesdk/node-native');
  engine = await CreativeEngine.init({
    license: process.env.CESDK_LICENSE ?? ''
  });
  // Click-through decodes every image to build its hit test; a headless
  // exporter takes no clicks, so that is pure export time.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  (engine.editor.setSettingBool as (key: string, value: boolean) => void)(
    'features/transparentClickThroughEnabled',
    false
  );
  return engine;
}

/**
 * Renders a scene archive to PDF, one export at a time.
 *
 * @param getArchive - Returns the uploaded archive, or null once the job
 *   was cancelled and released its buffer
 * @param signal - Aborts an export that is queued or still preparing. A render
 *   already handed to the engine runs to completion, because
 *   `@cesdk/node-native` takes no abort signal; the timeout bounds it instead.
 * @returns The finished PDF
 */
export function exportArchive(
  getArchive: () => Buffer | null,
  signal: AbortSignal,
  onPhase: (phase: ExportJobPhase) => void
): Promise<Buffer> {
  // A previous export's failure belongs to its own caller, not this one.
  const raced = chain
    .catch(() => {})
    .then(() => withTimeout(runExport(getArchive, signal, onPhase)));
  // The timed-out run keeps going on its abandoned engine, so the queue
  // follows the raced promise rather than waiting for it.
  chain = raced.catch(() => {});
  return raced;
}

/**
 * Answers the caller once the export takes too long. The engine call keeps
 * running, so the engine is dropped and rebuilt before the next export.
 */
function withTimeout(run: Promise<Buffer>): Promise<Buffer> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((unused, reject) => {
    timer = setTimeout(() => {
      wedgedExports += 1;
      const abandoned = engine;
      engine = null;
      run
        .finally(() => {
          abandoned?.dispose();
          wedgedExports -= 1;
        })
        .catch(() => {});
      reject(new Error('The export timed out'));
    }, EXPORT_TIMEOUT_MS);
  });
  return Promise.race([run, timeout]).finally(() => clearTimeout(timer));
}

/** The engine renders a denied resource as a gap, so the export must fail. */
function failOnBlocked(blockedURIs: string[]): void {
  if (blockedURIs.length === 0) return;
  throw new Error(
    `Blocked a resource outside the archive: ${blockedURIs.join(', ')}`
  );
}

async function runExport(
  getArchive: () => Buffer | null,
  signal: AbortSignal,
  onPhase: (phase: ExportJobPhase) => void
): Promise<Buffer> {
  signal.throwIfAborted();
  const archive = getArchive();
  if (archive == null) throw new Error('The export was cancelled');

  const jobEngine = await getEngine();
  try {
    // The archive load only takes a URL, so the upload passes through a
    // temporary file.
    const tempDir = await mkdtemp(join(tmpdir(), 'photobook-export-'));
    const archivePath = join(tempDir, 'photobook.imgly');
    const blockedURIs: string[] = [];
    try {
      await writeFile(archivePath, archive);
      const archiveRoot = resolve(tempDir);
      const blocked = pathToFileURL(
        join(tempDir, '.blocked-by-policy')
      ).toString();
      // A thrown error is not a deny: the binding catches it and falls back to
      // the input URI, so denial has to be a URI that resolves to nothing.
      jobEngine.editor.setURIResolver((uri) => {
        const resolved = jobEngine.editor.defaultURIResolver(uri);

        // A local path does not have to carry a scheme.
        let path: string | null = null;
        if (resolved.startsWith('file:')) {
          try {
            path = fileURLToPath(resolved);
          } catch {
            blockedURIs.push(uri);
            return blocked;
          }
        } else if (resolved.startsWith('/')) {
          path = resolved;
        }
        if (path === null) return resolved;

        // resolve() collapses '..'; the trailing separator stops a sibling
        // directory that shares the prefix from matching.
        const absolute = resolve(path);
        if (
          absolute === archiveRoot ||
          (absolute + sep).startsWith(archiveRoot + sep)
        ) {
          return resolved;
        }
        blockedURIs.push(uri);
        return blocked;
      });
      await jobEngine.scene.loadFromArchiveURL(
        pathToFileURL(archivePath).toString()
      );
      failOnBlocked(blockedURIs);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
    signal.throwIfAborted();
    const scene = jobEngine.scene.get();
    if (scene == null) throw new Error('The archive contains no scene');

    // The archive may come from the editor's preview, where only the
    // current spread is visible — a hidden page is left out of the PDF.
    // The bleed is off while editing and belongs in the print file.
    jobEngine.scene.getPages().forEach((page) => {
      // An archive uploaded from preview carries its blank stand-in pages,
      // which belong to no book.
      if (jobEngine.block.getName(page) === PREVIEW_BLANK_PAGE_NAME) {
        jobEngine.block.destroy(page);
        return;
      }
      jobEngine.block.setVisible(page, true);
      jobEngine.block.setBool(page, 'page/marginEnabled', true);
    });

    onPhase('exporting');
    // `@cesdk/node-native` cannot cancel a running export, so the render is
    // bounded by the timeout above rather than by the request's signal. The
    // crop and registration marks reach the PDF from 1.83.0 on; 1.82.0 drops
    // them, so the options pass through a cast until the pin moves.
    // High compatibility rasterizes every photo at scene DPI; off, baseline
    // JPEGs are embedded as-is, so the PDF stays small enough for the
    // PDF/X conversion.
    const PROGRESS_LOG_STEP_PERCENT = 25;
    let lastLoggedPercent = 0;
    const exportOptions = {
      mimeType: 'application/pdf',
      exportPdfWithHighCompatibility: false,
      exportPdfWithCropMarks: true,
      exportPdfWithRegistrationMarks: true,
      onProgress: (exportedPages: number, totalPages: number) => {
        const percent = Math.round((exportedPages / totalPages) * 100);
        if (percent < lastLoggedPercent + PROGRESS_LOG_STEP_PERCENT) return;
        lastLoggedPercent = percent;
        console.log(
          `  rendering ${exportedPages}/${totalPages} pages (${percent}%)`
        );
      }
    } as unknown as Parameters<typeof jobEngine.block.export>[1];
    const exportStart = Date.now();
    const pdf = await jobEngine.block.export(scene, exportOptions);
    failOnBlocked(blockedURIs);
    const seconds = ((Date.now() - exportStart) / 1000).toFixed(1);
    console.log(`  rendered in ${seconds}s (${formatSize(pdf.size)})`);

    return Buffer.from(await pdf.arrayBuffer());
  } finally {
    // The uploaded scene must not survive into the next request, aborted
    // and failed exports included.
    try {
      jobEngine.scene.create();
    } catch (error) {
      console.error('  the engine scene could not be reset:', error);
    }
  }
}

/**
 * Rejects bodies the engine cannot load as a scene archive.
 *
 * @returns An error message, or null when the body looks like an archive
 */
export function validateSceneArchive(archive: Buffer): string | null {
  // A scene archive is a zip, so non-zip bytes are rejected up front.
  if (archive[0] !== 0x50 || archive[1] !== 0x4b) {
    return 'The body is not a scene archive';
  }
  return null;
}
