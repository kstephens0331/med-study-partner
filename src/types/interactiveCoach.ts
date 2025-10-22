// TypeScript types for Interactive Coach System

// ============================================================================
// SKILL SYSTEM
// ============================================================================

export type SkillCategory =
  | 'heme'
  | 'cards'
  | 'pulm'
  | 'neuro'
  | 'renal'
  | 'endo'
  | 'gi'
  | 'micro'
  | 'psych'
  | 'peds'
  | 'pharm'
  | 'genetics';

export interface SkillTaxonomy {
  id: string;
  skill_id: string;
  category: SkillCategory;
  subcategory?: string;
  display_name: string;
  description?: string;
  difficulty_level: 1 | 2 | 3 | 4 | 5;
  created_at: string;
}

export interface UserSkillLevel {
  id: string;
  user_id: string;
  skill_id: string;
  level: 1 | 2 | 3 | 4 | 5;
  confidence_score: number; // 0-1
  total_attempts: number;
  correct_attempts: number;
  last_practiced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SkillProgress {
  skill: SkillTaxonomy;
  userLevel: UserSkillLevel;
  recentAttempts: number;
  trend: 'improving' | 'stable' | 'declining';
}

// ============================================================================
// GAMIFICATION SYSTEM
// ============================================================================

export interface UserGamification {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  xp_to_next_level: number;
  coins: number;
  study_streak_days: number;
  longest_streak_days: number;
  last_study_date?: string;
  created_at: string;
  updated_at: string;
}

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type BadgeCategory = 'skill_mastery' | 'streak' | 'challenge' | 'achievement';

export interface BadgeDefinition {
  id: string;
  badge_id: string;
  name: string;
  description?: string;
  icon?: string;
  category: BadgeCategory;
  requirement_type: string;
  requirement_value: Record<string, any>;
  xp_reward: number;
  rarity: BadgeRarity;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: BadgeDefinition;
}

export interface XPTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  related_skill_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface LevelUpResult {
  leveled_up: boolean;
  new_level: number;
  total_xp: number;
  xp_to_next?: number;
}

export interface StreakUpdateResult {
  streak: number;
  longest_streak: number;
  is_new_record: boolean;
}

// ============================================================================
// COACH SESSIONS & INTERACTIONS
// ============================================================================

export type SessionType =
  | 'standard'
  | 'speed_round'
  | 'boss_battle'
  | 'daily_challenge'
  | 'peer_study';

export type CoachPersona = 'socratic' | 'attending' | 'peer' | 'examiner' | 'mentor';

export interface CoachSession {
  id: string;
  user_id: string;
  session_type: SessionType;
  coach_persona: CoachPersona;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  total_questions: number;
  total_correct: number;
  skills_practiced: string[];
  xp_earned: number;
  created_at: string;
}

export type QuestionType =
  | 'probe'
  | 'micro_case'
  | 'teach_back'
  | 'multiple_choice'
  | 'fill_blank'
  | 'image_based'
  | 'audio_based';

export interface CoachInteraction {
  id: string;
  session_id: string;
  user_id: string;
  interaction_number: number;
  question_type: QuestionType;
  skill_id?: string;
  coach_question: string;
  user_response?: string;
  response_time_seconds?: number;
  quality_score?: number; // 0-1
  was_correct?: boolean;
  hints_used: number;
  xp_awarded: number;
  created_at: string;
}

// ============================================================================
// CHALLENGE SYSTEM
// ============================================================================

export interface DailyChallenge {
  id: string;
  challenge_date: string;
  theme: string;
  description?: string;
  target_skills: string[];
  xp_reward: number;
  badge_reward?: string;
  created_at: string;
}

export type ChallengeType = 'daily' | 'speed_round' | 'boss_battle';

export interface UserChallengeAttempt {
  id: string;
  user_id: string;
  challenge_id: string;
  challenge_type: ChallengeType;
  started_at: string;
  completed_at?: string;
  score?: number;
  max_score?: number;
  time_seconds?: number;
  was_successful?: boolean;
  xp_earned: number;
}

export interface SpeedRoundTemplate {
  id: string;
  name: string;
  description?: string;
  target_skills: string[];
  question_count: number;
  time_limit_seconds: number;
  difficulty_level: 1 | 2 | 3 | 4 | 5;
  created_at: string;
}

export interface BossBattleTemplate {
  id: string;
  name: string;
  description?: string;
  required_skills: string[];
  difficulty_level: 1 | 2 | 3 | 4 | 5;
  estimated_duration_minutes: number;
  xp_reward: number;
  badge_reward?: string;
  unlock_requirement?: Record<string, any>;
  created_at: string;
}

// ============================================================================
// MULTI-MODAL QUESTIONS
// ============================================================================

export type MultimodalQuestionType = 'image' | 'audio' | 'video' | 'diagram';

export interface MultimodalQuestion {
  id: string;
  question_type: MultimodalQuestionType;
  skill_id?: string;
  difficulty_level: 1 | 2 | 3 | 4 | 5;
  media_url?: string;
  media_type?: string;
  question_text: string;
  correct_answer: string;
  explanation?: string;
  distractors?: Record<string, any>;
  tags: string[];
  usage_count: number;
  avg_success_rate?: number;
  created_at: string;
}

// ============================================================================
// ANALYTICS & VISUALIZATION
// ============================================================================

export interface StudySession {
  id: string;
  user_id: string;
  session_date: string;
  duration_minutes: number;
  questions_answered: number;
  skills_practiced: string[];
  xp_earned: number;
  created_at: string;
}

export interface ConceptMapNode {
  id: string;
  user_id: string;
  skill_id: string;
  mastery_level: number; // 0-1
  connections_discovered: number;
  last_reviewed_at?: string;
  created_at: string;
}

export type ErrorType = 'conceptual' | 'calculation' | 'recall' | 'application';

export interface MistakePattern {
  id: string;
  user_id: string;
  error_type: ErrorType;
  skill_id?: string;
  frequency: number;
  last_occurred_at: string;
  resolved: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  anonymous_name?: string;
  total_xp: number;
  current_level: number;
  badges_earned: number;
  study_streak: number;
  rank?: number;
  last_updated_at: string;
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export type InteractionSpeed = 'slow' | 'normal' | 'fast';
export type DifficultyPreference = 'easy' | 'medium' | 'hard' | 'adaptive';
export type VisualFeedbackLevel = 'minimal' | 'normal' | 'full';

export interface UserCoachPreferences {
  id: string;
  user_id: string;
  preferred_persona: CoachPersona;
  interaction_speed: InteractionSpeed;
  difficulty_preference: DifficultyPreference;
  enable_hints: boolean;
  enable_teach_backs: boolean;
  enable_interruptions: boolean;
  visual_feedback_level: VisualFeedbackLevel;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DASHBOARD & UI COMPONENTS
// ============================================================================

export interface SkillDashboardData {
  skills: SkillProgress[];
  weakestSkills: SkillProgress[];
  recentActivity: StudySession[];
  streakInfo: {
    current: number;
    longest: number;
    lastStudyDate?: string;
  };
  levelInfo: {
    currentLevel: number;
    totalXP: number;
    xpToNext: number;
    progress: number; // percentage
  };
}

export interface ChallengeCardData {
  challenge: DailyChallenge | SpeedRoundTemplate | BossBattleTemplate;
  type: ChallengeType;
  isCompleted: boolean;
  userAttempt?: UserChallengeAttempt;
  isUnlocked: boolean;
}

export interface BadgeShowcase {
  recentBadges: UserBadge[];
  totalBadges: number;
  badgesByRarity: Record<BadgeRarity, number>;
  nextBadge?: BadgeDefinition;
  progressToNext?: number;
}

export interface SessionStats {
  duration: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  xpEarned: number;
  skillsPracticed: string[];
  streakUpdated: boolean;
  leveledUp: boolean;
  newLevel?: number;
  badgesEarned: BadgeDefinition[];
}

// ============================================================================
// INTERACTIVE QUESTION FORMATS
// ============================================================================

export interface MultipleChoiceQuestion {
  id: string;
  question: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
  skill_id?: string;
  explanation: string;
  media_url?: string;
}

export interface FillInBlankQuestion {
  id: string;
  question: string;
  blanks: {
    position: number;
    correctAnswers: string[]; // allow multiple correct answers
    caseSensitive: boolean;
  }[];
  skill_id?: string;
  explanation: string;
}

export interface MatchingQuestion {
  id: string;
  question: string;
  leftColumn: {
    id: string;
    text: string;
  }[];
  rightColumn: {
    id: string;
    text: string;
  }[];
  correctMatches: Record<string, string>; // leftId -> rightId
  skill_id?: string;
  explanation: string;
}

export interface DiagramQuestion {
  id: string;
  question: string;
  diagram_url: string;
  labelPoints: {
    id: string;
    x: number; // percentage
    y: number; // percentage
    correctLabel: string;
  }[];
  skill_id?: string;
  explanation: string;
}

export type InteractiveQuestion =
  | { type: 'multiple_choice'; data: MultipleChoiceQuestion }
  | { type: 'fill_blank'; data: FillInBlankQuestion }
  | { type: 'matching'; data: MatchingQuestion }
  | { type: 'diagram'; data: DiagramQuestion };

// ============================================================================
// REAL-TIME FEEDBACK
// ============================================================================

export interface LiveFeedback {
  skillId: string;
  skillName: string;
  beforeLevel: number;
  afterLevel: number;
  beforeConfidence: number;
  afterConfidence: number;
  xpAwarded: number;
  message: string;
  animation: 'level_up' | 'skill_improved' | 'badge_earned' | 'streak_updated';
}

export interface HeatMapData {
  date: string;
  value: number; // minutes studied or XP earned
  level: 0 | 1 | 2 | 3 | 4; // intensity level for color coding
}

export interface SkillRadarData {
  category: SkillCategory;
  categoryName: string;
  avgLevel: number;
  skillCount: number;
  masteredCount: number;
}
