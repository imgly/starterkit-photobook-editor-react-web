/**
 * CE.SDK Photobook Editor - Start Screen Component
 *
 */

import React from 'react';
import classNames from 'classnames';

import {
  PHOTO_DISTRIBUTION_OPTIONS,
  SIZE_OPTIONS,
  STYLE_OPTIONS,
  type PhotoDistributionId,
  type SizeOption,
  type StyleOption
} from '../photobook-options';

import styles from './StartScreen.module.css';

interface StartScreenProps {
  selectedSize: SizeOption;
  selectedStyle: StyleOption;
  selectedDistribution: PhotoDistributionId;
  onSizeChange: (size: SizeOption) => void;
  onStyleChange: (style: StyleOption) => void;
  onDistributionChange: (distribution: PhotoDistributionId) => void;
  onUploadPhotos: () => void;
  onUseExamples: () => void;
}
export default function StartScreen({
  selectedSize,
  selectedStyle,
  selectedDistribution,
  onSizeChange,
  onStyleChange,
  onDistributionChange,
  onUploadPhotos,
  onUseExamples
}: StartScreenProps) {
  const selectedDistributionOption = PHOTO_DISTRIBUTION_OPTIONS.find(
    (option) => option.id === selectedDistribution
  );

  return (
    <div className={styles.selectionWrapper}>
      <div className={styles.selectionPage}>
        <div className={styles.card}>
          <div className={styles.section}>
            <h2 className={styles.cardTitle}>1. Select a Size</h2>
            <div className={styles.presetGrid}>
              {SIZE_OPTIONS.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  aria-pressed={size.id === selectedSize.id}
                  className={classNames(styles.presetOption, {
                    [styles.selected]: size.id === selectedSize.id
                  })}
                  onClick={() => onSizeChange(size)}
                >
                  <img
                    className={classNames(styles.optionImage, styles.sizeImage)}
                    src={size.icon}
                    alt=""
                  />
                  <span className={styles.presetLabel}>
                    {size.label}
                    <br />
                    {size.dimensionsLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.cardTitle}>2. Select a Style</h2>
            <div className={styles.presetGrid}>
              {STYLE_OPTIONS.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  aria-pressed={style.id === selectedStyle.id}
                  className={classNames(styles.presetOption, {
                    [styles.selected]: style.id === selectedStyle.id
                  })}
                  onClick={() => onStyleChange(style)}
                >
                  <img
                    className={styles.optionImage}
                    src={style.thumb}
                    alt=""
                  />
                  <span className={styles.presetLabel}>{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.cardTitle}>3. Photo Distribution</h2>
            <div className={styles.modeSelector}>
              <div className={styles.modeTabs}>
                {PHOTO_DISTRIBUTION_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={option.id === selectedDistribution}
                    className={classNames(styles.modeTab, {
                      [styles.selected]: option.id === selectedDistribution
                    })}
                    onClick={() => onDistributionChange(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className={styles.modeDescription}>
                {selectedDistributionOption?.description}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.buttons}>
          <button
            className={styles.openButton}
            onClick={onUploadPhotos}
            data-cy="uploadPhotosButton"
          >
            Upload Photos
          </button>
          <button
            className={styles.secondaryButton}
            onClick={onUseExamples}
            data-cy="useExamplesButton"
          >
            Use examples
          </button>
        </div>
      </div>
    </div>
  );
}
