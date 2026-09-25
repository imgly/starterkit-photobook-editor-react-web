/**
 * Design Validation Types
 */

export type ValidationState = 'success' | 'warning' | 'failed';

export interface BlockValidationResult {
  blockId: number;
  state: ValidationState;
  blockType: string;
}

export type BoundingBox = [number, number, number, number];
