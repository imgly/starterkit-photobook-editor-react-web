/**
 * The export job API's wire types, shared by the client and the server.
 */

export type ExportJobStatus = 'pending' | 'done' | 'error';

/** The stage a pending export is in; null before the job started running. */
export type ExportJobPhase = 'exporting' | 'converting' | null;

export interface ExportJobStatusResponse {
  status: ExportJobStatus;
  phase: ExportJobPhase;
  error: string | null;
}
