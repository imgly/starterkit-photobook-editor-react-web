/**
 * Validation Result Item Component
 *
 * Displays a single validation result with status indicator and select button.
 */

import type { ValidationResult } from '../ValidationSidebar/ValidationSidebar';
import imageIcon from '../icons/image.svg';
import shapeIcon from '../icons/shape.svg';
import stickerIcon from '../icons/sticker.svg';
import textIcon from '../icons/text.svg';

import classes from './ResultItem.module.css';

const ICONS: Record<string, string> = {
  text: textIcon,
  image: imageIcon,
  sticker: stickerIcon,
  default: shapeIcon
};

interface ResultItemProps {
  result: ValidationResult;
  blockDisplayName: string;
  onSelect: (blockId: number) => void;
}

export function ResultItem({
  result,
  blockDisplayName,
  onSelect
}: ResultItemProps) {
  const iconPath = ICONS[result.blockType] ?? ICONS.default;

  return (
    <div className={classes.item} title={result.validationDescription}>
      <div className={classes.itemHeader}>
        <span className={classes.nameWrapper}>
          <span className={`${classes.dot} ${classes[result.state]}`} />
          <span className={classes.name}>{result.validationName}</span>
        </span>
        <button
          className={classes.selectBtn}
          aria-label={`Select ${blockDisplayName}: ${result.validationName}`}
          onClick={() => onSelect(result.blockId)}
        >
          Select
        </button>
      </div>
      <div className={classes.blockLabel}>
        <img
          src={iconPath}
          alt=""
          className={classes.blockIcon}
          width={16}
          height={16}
        />
        <span>{blockDisplayName}</span>
      </div>
    </div>
  );
}
