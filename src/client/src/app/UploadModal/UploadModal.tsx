/**
 * UploadModal - Fullscreen photo upload dialog
 *
 * Shows the UploadZone in a modal over a dimmed backdrop. The user can drop
 * or pick photos, skip the upload, or cancel (Escape / backdrop click).
 */
import { useEffect, useRef } from 'react';

import { PHOTO_LIMIT } from '../photobook-options';
import { UploadZone } from '../UploadZone/UploadZone';
import classes from './UploadModal.module.css';

interface UploadModalProps {
  /** Called with the accepted photos, capped at PHOTO_LIMIT. */
  onUpload: (files: File[]) => void;
  /** Called when the user skips the upload and continues without photos. */
  onSkip: () => void;
  /** Called when the user cancels (Escape or backdrop click). */
  onClose: () => void;
}

export function UploadModal({ onUpload, onSkip, onClose }: UploadModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    // Focus moves into the dialog and Tab stays inside it, so the page
    // behind the modal cannot be reached with the keyboard.
    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((element) => !element.hasAttribute('disabled'));

    focusable()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      opener?.focus();
    };
  }, [onClose]);

  const handleUpload = (files: File[]) => {
    if (files.length > PHOTO_LIMIT) {
      window.alert(
        `A photobook holds ${PHOTO_LIMIT} photos, so the first ${PHOTO_LIMIT} of your ${files.length} are used.`
      );
    }
    onUpload(files.slice(0, PHOTO_LIMIT));
  };

  return (
    <div className={classes.backdrop} onClick={onClose}>
      {/* Skip sits beside the drop zone, so both are inside the dialog:
          anything outside it is inert while the modal is open. */}
      <div
        ref={dialogRef}
        className={classes.container}
        role="dialog"
        aria-modal="true"
        aria-label="Add photos"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={classes.dialog}>
          <UploadZone onUpload={handleUpload}>
            <span className={classes.title}>Drag photos here</span>
            <span className={classes.divider}>or</span>
            <span className={classes.chooseButton}>Choose from computer</span>
          </UploadZone>
        </div>
        <button
          className={classes.skipButton}
          onClick={onSkip}
          data-cy="skipUploadButton"
        >
          Skip <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
