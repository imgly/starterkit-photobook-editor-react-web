/**
 * Validation Sidebar Component
 *
 * Displays validation results and allows selecting blocks with issues.
 * Auto-updates when the design changes via history listener.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { type BlockValidationResult } from '../../imgly/validation-types';
import { VALIDATION_CHECKS } from '../../imgly/validation';
import { getParentPage } from '../../imgly/block-utils';
import checkCompleteIcon from '../icons/check-complete.svg';
import { VALIDATION_PRESENTATION } from '../validation-config';
import { ResultItem } from '../ResultItem/ResultItem';

import classes from './ValidationSidebar.module.css';

export interface ValidationResult extends BlockValidationResult {
  validationName: string;
  validationDescription: string;
}
type CreativeEngine = CreativeEditorSDK['engine'];

const REVALIDATE_DEBOUNCE_MS = 300;

async function runValidationChecks(
  engine: CreativeEngine
): Promise<ValidationResult[]> {
  const resultsPerCheck = await Promise.all(
    VALIDATION_CHECKS.map(async (check) => {
      const presentation = VALIDATION_PRESENTATION[check.id];
      const checkResults = await check.validate(engine);
      return checkResults.map((result) => ({
        ...result,
        validationName: presentation.name,
        validationDescription: presentation.description
      }));
    })
  );
  return resultsPerCheck.flat();
}
interface ValidationSidebarProps {
  cesdk: CreativeEditorSDK | null;
}

function getBlockDisplayName(
  cesdk: CreativeEditorSDK,
  blockId: number,
  kind: string
): string {
  if (!cesdk.engine.block.isValid(blockId)) return '';
  const layerName = cesdk.engine.block.getName(blockId);
  if (layerName && !['Text'].includes(layerName)) {
    return layerName;
  }
  switch (kind) {
    case 'text': {
      const textContent = cesdk.engine.block.getString(blockId, 'text/text');
      const truncated =
        textContent.length > 25
          ? textContent.substring(0, 22) + '...'
          : textContent;
      return truncated || 'Text';
    }
    case 'image':
      return 'Image';
    case 'page':
      return 'Page';
    case 'sticker':
      return 'Sticker';
    case 'shapes':
      return 'Shape';
    default:
      return kind || 'Unknown';
  }
}
export function ValidationSidebar({ cesdk }: ValidationSidebarProps) {
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [isReady, setIsReady] = useState(false);
  const runIdRef = useRef(0);

  const unsuccessfulResults = results.filter((r) => r.state !== 'success');

  const runValidation = useCallback(async () => {
    if (!cesdk) return;
    const runId = ++runIdRef.current;
    try {
      const newResults = await runValidationChecks(cesdk.engine);
      if (runId !== runIdRef.current) return;
      setResults(newResults);
    } catch (error) {
      console.warn('Validation run failed:', error);
    } finally {
      if (runId === runIdRef.current) setIsReady(true);
    }
  }, [cesdk]);

  useEffect(() => {
    if (!cesdk) return;
    let disposed = false;

    const validateLoadedScene = () => {
      const scene = cesdk.engine.scene.get();
      if (scene == null) return;
      cesdk.engine.block
        .forceLoadResources([scene])
        .catch((error) => {
          console.warn('Preloading scene resources failed:', error);
        })
        .then(() => {
          requestAnimationFrame(() => {
            if (!disposed) runValidation();
          });
        });
    };

    validateLoadedScene();
    const unsubscribeScene =
      cesdk.engine.scene.onActiveChanged(validateLoadedScene);

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribeHistory = cesdk.engine.editor.onHistoryUpdatedWithKind(
      () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          requestAnimationFrame(() => {
            if (!disposed) runValidation();
          });
        }, REVALIDATE_DEBOUNCE_MS);
      }
    );

    return () => {
      disposed = true;
      runIdRef.current += 1;
      clearTimeout(debounceTimer);
      unsubscribeHistory();
      unsubscribeScene();
    };
  }, [cesdk, runValidation]);

  const handleSelectBlock = useCallback(
    (blockId: number) => {
      if (!cesdk) return;
      const engine = cesdk.engine;
      if (!engine.block.isValid(blockId)) return;
      if (!engine.block.isAllowedByScope(blockId, 'editor/select')) return;

      engine.block
        .findAllSelected()
        .forEach((block) => engine.block.setSelected(block, false));
      engine.block.setSelected(blockId, true);

      const page = getParentPage(engine, blockId);
      engine.scene.zoomToBlock(page ?? blockId, { padding: 40 });
    },
    [cesdk]
  );

  return (
    <aside className={classes.sidebar} aria-label="Design check">
      <div className={classes.header} aria-live="polite">
        <span className={classes.headerTitle}>
          <span>
            {!isReady
              ? 'Check pending'
              : unsuccessfulResults.length === 0
                ? 'Check successful'
                : 'Issues found'}
          </span>
          {isReady && unsuccessfulResults.length === 0 && (
            <img
              src={checkCompleteIcon}
              alt=""
              className={classes.checkIcon}
              width={16}
              height={16}
            />
          )}
        </span>
        <span className={classes.headerInfo}>
          {unsuccessfulResults.length === 1
            ? '1 issue'
            : `${unsuccessfulResults.length} issues`}
        </span>
      </div>
      <div className={classes.list}>
        {!isReady ? (
          <div className={classes.statusText}>Loading...</div>
        ) : unsuccessfulResults.length === 0 ? (
          <div className={classes.statusText}>
            <span>No design errors found.</span>
            <span>Move elements around to see a different result.</span>
          </div>
        ) : (
          unsuccessfulResults.map((result) => (
            <ResultItem
              key={`${result.blockId}-${result.validationName}`}
              result={result}
              blockDisplayName={
                cesdk
                  ? getBlockDisplayName(cesdk, result.blockId, result.blockType)
                  : ''
              }
              onSelect={handleSelectBlock}
            />
          ))
        )}
      </div>
    </aside>
  );
}
