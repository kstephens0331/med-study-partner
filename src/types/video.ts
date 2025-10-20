// Video Review System Types

export type VideoSourceType = 'lecture' | 'powerpoint' | 'recording' | 'screencapture' | 'other';
export type VideoDifficulty = 'easy' | 'moderate' | 'hard' | 'mixed';
export type MedicalSystem = 'heme' | 'renal' | 'cards' | 'neuro' | 'pulm' | 'endo' | 'gi' | 'micro' | 'pharm' | 'genetics' | 'obgyn' | 'psych' | 'peds';

export interface VideoSource {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  original_filename: string;
  video_url: string;
  thumbnail_url?: string;
  duration_seconds: number;
  file_size_bytes?: number;
  system?: MedicalSystem;
  topics?: string[];
  difficulty?: VideoDifficulty;
  source_type: VideoSourceType;
  is_processed: boolean;
  is_segmented: boolean;
  created_at: string;
  updated_at: string;
}

export interface VideoSegment {
  id: string;
  video_source_id: string;
  title: string;
  description?: string;
  segment_number: number;
  start_time_seconds: number;
  end_time_seconds: number;
  duration_seconds: number;
  system?: MedicalSystem;
  topics?: string[];
  difficulty?: VideoDifficulty;
  keywords?: string[];
  summary?: string;
  key_concepts?: string[];
  playback_url?: string;
  created_at: string;
  updated_at: string;
}

export interface VideoWatchProgress {
  id: string;
  user_id: string;
  video_segment_id: string;
  last_position_seconds: number;
  is_completed: boolean;
  watch_count: number;
  first_watched_at: string;
  last_watched_at: string;
  completed_at?: string;
}

export interface VideoSegmentWithProgress extends VideoSegment {
  progress?: VideoWatchProgress;
  source?: VideoSource;
}

export interface VideoFilterOptions {
  system?: MedicalSystem;
  topics?: string[];
  difficulty?: VideoDifficulty;
  keywords?: string;
  onlyCompleted?: boolean;
  onlyIncomplete?: boolean;
}
