/**
 * CE.SDK Photobook Editor - Main Application Component
 *
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { CreativeEditor } from '@cesdk/cesdk-js/react';
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import type { Configuration } from '@cesdk/cesdk-js';

import StartScreen from './StartScreen/StartScreen';
import { UploadModal } from './UploadModal/UploadModal';
import { ValidationSidebar } from './ValidationSidebar/ValidationSidebar';
import {
  addPhotosToUploadSource,
  autoFillPhotobook,
  autoFillPhotobookTexts,
  enterPreviewMode,
  getLayoutFormat,
  getStyleSceneURL,
  initPhotobookEditor,
  revokeUploadedPhotoURLs
} from '../imgly';
import { exportPhotobook } from './export';
import { EXAMPLE_PHOTOS } from './example-photos';
import { EXAMPLE_TEXTS } from './example-texts';
import { DEMO_ASSETS_URL } from '../imgly/demo-assets';
import {
  SIZE_OPTIONS,
  STYLE_OPTIONS,
  type PhotoDistributionId,
  type SizeOption,
  type StyleOption
} from './photobook-options';

import styles from './App.module.css';


interface AppProps {
  config: Partial<Configuration>;
}

/** The screen currently shown. The editor stays mounted for both 'editor' and 'preview'. */
type Screen = 'start' | 'editor' | 'preview';
export default function App({ config }: AppProps) {
  const [screen, setScreen] = useState<Screen>('start');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  const [useExamplePhotos, setUseExamplePhotos] = useState(false);
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const [cesdk, setCesdk] = useState<CreativeEditorSDK | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<SizeOption>(SIZE_OPTIONS[0]);
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>(
    STYLE_OPTIONS[0]
  );
  const [selectedDistribution, setSelectedDistribution] =
    useState<PhotoDistributionId>('autoFill');

  const isEditorOpen = screen !== 'start';

  // The init callback reads the options through a ref: a changing
  // callback identity disposes and recreates a live editor.
  const initOptionsRef = useRef({
    selectedSize,
    selectedStyle,
    selectedDistribution,
    uploadedPhotos,
    useExamplePhotos
  });
  initOptionsRef.current = {
    selectedSize,
    selectedStyle,
    selectedDistribution,
    uploadedPhotos,
    useExamplePhotos
  };

  // Bumped when the editor closes; an initialization still awaiting must
  // not act on the disposed instance.
  const editorGenerationRef = useRef(0);

  // Defer the editor mount one frame after the editor opens so the container
  // paints first and the editor's progressive paint happens inside an
  // already-laid-out parent (no perceived layout glitch).
  useEffect(() => {
    if (!isEditorOpen) {
      setIsEditorMounted(false);
      editorGenerationRef.current += 1;
      revokeUploadedPhotoURLs();
      return;
    }
    const id = requestAnimationFrame(() => setIsEditorMounted(true));
    return () => cancelAnimationFrame(id);
  }, [isEditorOpen]);

  const handleUploadPhotos = () => {
    setIsUploadOpen(true);
  };

  const handleUploadFinished = (files: File[]) => {
    setUploadedPhotos(files);
    setUseExamplePhotos(false);
    setIsUploadOpen(false);
    setScreen('editor');
  };

  const handleUploadSkipped = () => {
    setUploadedPhotos([]);
    setUseExamplePhotos(false);
    setIsUploadOpen(false);
    setScreen('editor');
  };

  const handleUseExamples = () => {
    setUploadedPhotos([]);
    setUseExamplePhotos(true);
    setScreen('editor');
  };

  const handleClose = () => {
    // The book only lives in the editor, so leaving discards it.
    const discard = window.confirm(
      'Discard your photobook? Everything you changed is lost.'
    );
    if (!discard) return;
    setCesdk(null);
    setEditorError(null);
    setScreen('start');
  };

  /** Adds the app's back and preview buttons to the navigation bar. */
  const insertNavigationButtons = useCallback((cesdk: CreativeEditorSDK) => {
    cesdk.ui.insertOrderComponent(
      { in: 'ly.img.navigation.bar', position: 'start' },
      {
        id: 'ly.img.back.navigationBar',
        onClick: () => handleClose()
      }
    );

    cesdk.ui.insertOrderComponent(
      { in: 'ly.img.navigation.bar', position: 'end' },
      {
        id: 'ly.img.action.navigationBar',
        key: 'photobook-preview',
        label: 'photobook.navigationBar.preview',
        icon: '@imgly/EyeOpen',
        color: 'accent',
        onClick: () => setScreen('preview')
      }
    );
  }, []);

  /**
   * Initialize the editor with the configuration chosen on the start
   * screen. A failure is shown in place of the editor.
   */
  const handleEditorInit = useCallback(
    async (cesdk: CreativeEditorSDK) => {
      const generation = editorGenerationRef.current;
      const options = initOptionsRef.current;

      try {
        const sceneURL = getStyleSceneURL(
          DEMO_ASSETS_URL,
          getLayoutFormat(options.selectedSize),
          options.selectedStyle.id
        );
        await initPhotobookEditor(cesdk, sceneURL, options.selectedSize);

        const photos = await addPhotosToUploadSource(
          cesdk.engine,
          options.useExamplePhotos ? EXAMPLE_PHOTOS : [],
          options.uploadedPhotos
        );

        if (options.selectedDistribution === 'autoFill' && photos.length > 0) {
          const texts = options.useExamplePhotos
            ? EXAMPLE_TEXTS[options.selectedStyle.id]
            : undefined;
          autoFillPhotobook(cesdk.engine, photos, {
            addUndoStep: texts == null
          });
          if (texts != null) {
            autoFillPhotobookTexts(cesdk.engine, texts);
          }
        }
      } catch (error) {
        // The editor may have been closed while initialization awaited.
        if (generation !== editorGenerationRef.current) return;
        console.error('Editor initialization failed:', error);
        setEditorError(
          'The editor could not be initialized. Check your license key and network, then try again.'
        );
        return;
      }
      if (generation !== editorGenerationRef.current) return;

      insertNavigationButtons(cesdk);
      setCesdk(cesdk);
    },
    [insertNavigationButtons]
  );

  // The preview is a mode of the editor itself: entering switches the scene
  // into page spreads and swaps the chrome; leaving restores everything.
  useEffect(() => {
    if (screen !== 'preview' || cesdk == null) return;
    const exitPreview = enterPreviewMode(cesdk, {
      onBack: () => setScreen('editor'),
      onExport: (signal) => exportPhotobook(cesdk, signal)
    });
    return () => exitPreview();
  }, [screen, cesdk]);

  return (
    <>
      {screen === 'start' && (
        <StartScreen
          selectedSize={selectedSize}
          selectedStyle={selectedStyle}
          selectedDistribution={selectedDistribution}
          onSizeChange={setSelectedSize}
          onStyleChange={setSelectedStyle}
          onDistributionChange={setSelectedDistribution}
          onUploadPhotos={handleUploadPhotos}
          onUseExamples={handleUseExamples}
        />
      )}
      {isUploadOpen && (
        <UploadModal
          onUpload={handleUploadFinished}
          onSkip={handleUploadSkipped}
          onClose={() => setIsUploadOpen(false)}
        />
      )}
      {isEditorOpen && (
        <div
          className={classNames(styles.editorContainer, {
            [styles.fullBleed]: screen === 'preview'
          })}
        >
          <div className={styles.editorWrapper}>
            {editorError != null ? (
              <div className={styles.editorError} role="alert">
                <p>{editorError}</p>
                <button
                  className={styles.editorErrorButton}
                  onClick={handleClose}
                >
                  Back to start
                </button>
              </div>
            ) : (
              isEditorMounted && (
                <CreativeEditor config={config} init={handleEditorInit} />
              )
            )}
          </div>
          {screen === 'editor' && <ValidationSidebar cesdk={cesdk} />}
        </div>
      )}
    </>
  );
}
