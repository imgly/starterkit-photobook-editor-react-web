/**
 * UploadZone - Drag & drop photo upload component
 *
 * Accepts multiple image files and validates them on both the drop and
 * picker paths.
 */
import classNames from 'classnames';
import { useId, useState } from 'react';
import classes from './UploadZone.module.css';

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  accept?: string[];
  filetypeNotice?: string;
  children: React.ReactNode;
}

/**
 * Splits picked files into the ones the editor can place and the rest.
 *
 * `File.type` comes from the extension, so this catches mistakes rather
 * than hostile input. The engine still rejects bytes it cannot decode.
 */
export function partitionAccepted(
  files: File[],
  accept: string[]
): { accepted: File[]; rejected: File[] } {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of files) {
    (accept.includes(file.type) ? accepted : rejected).push(file);
  }
  return { accepted, rejected };
}

export function UploadZone({
  children,
  onUpload,
  accept = ['image/jpeg', 'image/png', 'image/webp'],
  filetypeNotice = 'Supported formats: JPEG, PNG, WebP'
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  // The id is unique per instance, so several zones can be on one page.
  const inputId = useId();

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Leaving for a child element still fires here, so the highlight only
    // clears once the pointer is outside the zone itself.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    handlePicked(Array.from(e.dataTransfer.files));
  };

  /** Reports what was rejected, then hands the rest on. */
  const handlePicked = (picked: File[]) => {
    const { accepted, rejected: skipped } = partitionAccepted(picked, accept);
    setRejected(skipped.map((file) => file.name));
    if (accepted.length > 0) onUpload(accepted);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    handlePicked(picked);
  };

  return (
    <label
      htmlFor={inputId}
      className={classNames(classes.uploadZone, {
        [classes.dragging]: isDragging
      })}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <svg
        className={classes.uploadIcon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 15V3" />
        <path d="m7 8 5-5 5 5" />
        <path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" />
      </svg>
      {children}
      <input
        className={classes.hidden}
        type="file"
        id={inputId}
        multiple
        onChange={handleFileChange}
        accept={accept.join(',')}
      />
      <small className={classes.filetypeNotice}>{filetypeNotice}</small>
      {rejected.length > 0 && (
        <small className={classes.rejectedNotice} role="alert">
          {rejected.length === 1
            ? `${rejected[0]} is not a supported image`
            : `${rejected.length} files were not supported images`}
        </small>
      )}
    </label>
  );
}
