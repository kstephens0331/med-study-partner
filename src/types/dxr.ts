// DxR Clinician-Style Virtual Patient System Types

export type DxRDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type DxRSetting = 'outpatient' | 'emergency' | 'inpatient' | 'icu' | 'clinic';
export type PatientSex = 'M' | 'F' | 'Other';

// History & Physical Exam
export interface HistoryItem {
  category: string; // 'HPI', 'PMH', 'FH', 'SH', 'ROS', etc.
  question: string;
  response: string;
  isKeyFinding?: boolean;
}

export interface PhysicalExamFinding {
  system: string; // 'General', 'HEENT', 'Cardiovascular', 'Respiratory', etc.
  finding: string;
  value?: string;
  isAbnormal?: boolean;
  isKeyFinding?: boolean;
}

// Diagnostic tests
export interface LabTest {
  name: string;
  category: string; // 'CBC', 'CMP', 'Cardiac', 'Liver', etc.
  cost?: number;
  turnaround_time?: string; // '1 hour', '24 hours', etc.
  clinical_indication?: string; // Why this test is appropriate
  results?: {
    test: string;
    value: string;
    unit: string;
    referenceRange: string;
    isAbnormal?: boolean;
  }[];
}

export interface ImagingStudy {
  name: string;
  modality: string; // 'X-ray', 'CT', 'MRI', 'Ultrasound', etc.
  body_part: string;
  cost?: number;
  turnaround_time?: string;
  radiation?: boolean;
  radiation_dose?: string; // e.g., '0.1 mSv'
  clinical_indication?: string; // Why this imaging is appropriate
  findings?: string;
  impression?: string; // Radiologist's impression/conclusion
  images_url?: string;
}

export interface ProcedureTest {
  name: string;
  category: string; // 'Invasive Diagnostic', 'Non-invasive', etc.
  cost?: number;
  turnaround_time?: string;
  risks?: string;
  contraindications?: string;
  findings?: string;
}

// Differential Diagnosis
export interface DifferentialItem {
  diagnosis: string;
  rank: number; // 1 = most likely
  likelihood?: string; // 'High', 'Medium', 'Low'
  justification: string;
  supporting_findings?: string[];
  contradicting_findings?: string[];
  next_steps?: string; // Confirmatory test or treatment
}

// DxR Case
export interface DxRCase {
  id: string;
  case_number: number;
  title: string;
  difficulty: DxRDifficulty;
  complexity_score: number;

  // Patient info
  patient_age: number;
  patient_sex: PatientSex;
  patient_name?: string;

  // Presentation
  chief_complaint: string;

  // Classification
  system?: string;
  specialty?: string;
  setting: DxRSetting;

  // Case flags
  is_common: boolean;
  is_rare: boolean;
  is_emergency: boolean;

  // Clinical data
  history_items: HistoryItem[];
  physical_exam_findings: PhysicalExamFinding[];
  available_labs?: LabTest[];
  available_imaging?: ImagingStudy[];
  available_procedures?: ProcedureTest[];

  // Answer key
  correct_diagnosis: string;
  diagnosis_icd10?: string; // ICD-10 code
  correct_differential: DifferentialItem[];
  key_findings?: string[];
  red_flags?: string[];

  // Learning
  learning_objectives?: string[];
  key_concepts?: string[];
  clinical_pearls?: string;
  common_pitfalls?: string[]; // Common errors students make

  created_at: string;
  updated_at: string;
}

// Student's Case Attempt
export interface DxRCaseAttempt {
  id: string;
  user_id: string;
  case_id: string;
  attempt_number: number;

  started_at: string;
  submitted_at?: string;
  time_spent_seconds?: number;

  // Student's work
  history_taken?: HistoryItem[];
  exam_performed?: PhysicalExamFinding[];
  labs_ordered?: LabTest[];
  imaging_ordered?: ImagingStudy[];
  procedures_ordered?: ProcedureTest[];

  differential_diagnosis?: DifferentialItem[];

  // SOAP note
  soap_subjective?: string;
  soap_objective?: string;
  soap_assessment?: string;
  soap_plan?: string;

  // Scores (0-100)
  history_score?: number;
  exam_score?: number;
  diagnostic_workup_score?: number;
  differential_score?: number;
  soap_note_score?: number;
  overall_score?: number;

  // AI Feedback
  ai_feedback?: {
    history?: string;
    exam?: string;
    diagnostic_workup?: string;
    differential?: string;
    soap_note?: string;
  };
  strengths?: string[];
  areas_for_improvement?: string[];
  missed_critical_findings?: string[];

  is_complete: boolean;
}

// User Progress
export interface DxRProgress {
  id: string;
  user_id: string;

  cases_attempted: number;
  cases_completed: number;
  average_score?: number;

  // By difficulty
  beginner_avg?: number;
  intermediate_avg?: number;
  advanced_avg?: number;
  expert_avg?: number;

  // By category
  history_avg?: number;
  exam_avg?: number;
  diagnostic_avg?: number;
  differential_avg?: number;
  soap_avg?: number;

  last_case_at?: string;
  created_at: string;
  updated_at: string;
}

// Case with student's attempt
export interface DxRCaseWithAttempt extends DxRCase {
  attempt?: DxRCaseAttempt;
}

// Filter options
export interface DxRFilterOptions {
  difficulty?: DxRDifficulty;
  system?: string;
  specialty?: string;
  setting?: DxRSetting;
  commonOnly?: boolean;
  rareOnly?: boolean;
  emergencyOnly?: boolean;
  notAttempted?: boolean;
}
