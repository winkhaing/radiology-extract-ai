
export interface RadiologyFinding {
  organ: string;
  finding_label: string;
  finding_description: string;
  present: boolean;
  is_abnormal: boolean;
  details?: string;
}

export interface ExtractionResult {
  is_medical_report?: boolean;
  patient_summary?: string;
  findings: RadiologyFinding[];
  impression?: string;
}

export interface SessionReport {
  id: string;
  keyId: string;
  orderId: string;
  timestamp: string;
  rawText: string;
  extraction: ExtractionResult;
}

export enum Status {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  BATCH_PROCESSING = 'BATCH_PROCESSING'
}

export type AppView = 'LANDING' | 'INPUT' | 'REVIEW' | 'SUMMARY';
export type ExtractionMethod = 'MANUAL' | 'UPLOAD';
