
export interface RadiologyFinding {
  organ: string;
  finding_label: string;
  finding_description: string;
  present: boolean;
  is_abnormal: boolean;
  details?: string;
}

export interface ExtractionResult {
  patient_summary?: string;
  findings: RadiologyFinding[];
  impression?: string;
}

export interface SessionReport {
  id: string;
  keyId: string; // New variable for tracking specific reports
  timestamp: string;
  rawText: string;
  extraction: ExtractionResult;
}

export enum Status {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type AppView = 'INPUT' | 'REVIEW' | 'SUMMARY';
