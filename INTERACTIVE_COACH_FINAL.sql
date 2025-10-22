-- Interactive Coach System: Gamification, Skills Tracking, and Engagement
-- FINAL VERSION: Handles existing table conflicts by renaming conflicting tables

-- ============================================================================
-- 1. SKILL TRACKING SYSTEM
-- ============================================================================

create table if not exists skill_taxonomy (
  id uuid primary key default gen_random_uuid(),
  skill_id text unique not null,
  category text not null,
  subcategory text,
  display_name text not null,
  description text,
  difficulty_level integer default 1 check (difficulty_level between 1 and 5),
  created_at timestamptz default now()
);

create table if not exists user_skill_levels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  skill_id text references skill_taxonomy(skill_id) on delete cascade,
  level integer default 1 check (level between 1 and 5),
  confidence_score decimal(3,2) default 0.50 check (confidence_score between 0 and 1),
  total_attempts integer default 0,
  correct_attempts integer default 0,
  last_practiced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, skill_id)
);

create index if not exists idx_user_skills_user on user_skill_levels(user_id);
create index if not exists idx_user_skills_level on user_skill_levels(user_id, level);

-- ============================================================================
-- 2. GAMIFICATION SYSTEM
-- ============================================================================

create table if not exists user_gamification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  total_xp integer default 0,
  current_level integer default 1,
  xp_to_next_level integer default 100,
  coins integer default 0,
  study_streak_days integer default 0,
  longest_streak_days integer default 0,
  last_study_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists badge_definitions (
  id uuid primary key default gen_random_uuid(),
  badge_id text unique not null,
  name text not null,
  description text,
  icon text,
  category text,
  requirement_type text,
  requirement_value jsonb,
  xp_reward integer default 0,
  rarity text default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary')),
  created_at timestamptz default now()
);

create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  badge_id text references badge_definitions(badge_id) on delete cascade,
  earned_at timestamptz default now(),
  unique(user_id, badge_id)
);

create table if not exists xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  related_skill_id text references skill_taxonomy(skill_id) on delete set null,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_xp_transactions_user on xp_transactions(user_id, created_at desc);

-- ============================================================================
-- 3. INTERACTIVE SESSIONS & CONVERSATION TRACKING
-- ============================================================================

create table if not exists coach_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_type text default 'standard' check (session_type in ('standard', 'speed_round', 'boss_battle', 'daily_challenge', 'peer_study')),
  coach_persona text default 'socratic' check (coach_persona in ('socratic', 'attending', 'peer', 'examiner', 'mentor')),
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_seconds integer,
  total_questions integer default 0,
  total_correct integer default 0,
  skills_practiced text[],
  xp_earned integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_coach_sessions_user on coach_sessions(user_id, started_at desc);

create table if not exists coach_interactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references coach_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  interaction_number integer not null,
  question_type text default 'probe' check (question_type in ('probe', 'micro_case', 'teach_back', 'multiple_choice', 'fill_blank', 'image_based', 'audio_based')),
  skill_id text references skill_taxonomy(skill_id) on delete set null,
  coach_question text not null,
  user_response text,
  response_time_seconds integer,
  quality_score decimal(3,2) check (quality_score between 0 and 1),
  was_correct boolean,
  hints_used integer default 0,
  xp_awarded integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_coach_interactions_session on coach_interactions(session_id, interaction_number);
create index if not exists idx_coach_interactions_user on coach_interactions(user_id, created_at desc);

-- ============================================================================
-- 4. CHALLENGE SYSTEM
-- ============================================================================

create table if not exists daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date unique not null,
  theme text not null,
  description text,
  target_skills text[],
  xp_reward integer default 50,
  badge_reward text references badge_definitions(badge_id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists user_challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  challenge_id uuid references daily_challenges(id) on delete cascade,
  challenge_type text not null check (challenge_type in ('daily', 'speed_round', 'boss_battle')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  score integer,
  max_score integer,
  time_seconds integer,
  was_successful boolean,
  xp_earned integer default 0,
  unique(user_id, challenge_id)
);

create index if not exists idx_challenge_attempts_user on user_challenge_attempts(user_id, started_at desc);

create table if not exists speed_round_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  target_skills text[],
  question_count integer default 10,
  time_limit_seconds integer default 60,
  difficulty_level integer default 3 check (difficulty_level between 1 and 5),
  created_at timestamptz default now()
);

create table if not exists boss_battle_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  required_skills text[],
  difficulty_level integer default 5 check (difficulty_level between 1 and 5),
  estimated_duration_minutes integer default 30,
  xp_reward integer default 500,
  badge_reward text references badge_definitions(badge_id) on delete set null,
  unlock_requirement jsonb,
  created_at timestamptz default now()
);

-- ============================================================================
-- 5. MULTI-MODAL CONTENT
-- ============================================================================

create table if not exists multimodal_questions (
  id uuid primary key default gen_random_uuid(),
  question_type text not null check (question_type in ('image', 'audio', 'video', 'diagram')),
  skill_id text references skill_taxonomy(skill_id) on delete set null,
  difficulty_level integer default 3 check (difficulty_level between 1 and 5),
  media_url text,
  media_type text,
  question_text text not null,
  correct_answer text not null,
  explanation text,
  distractors jsonb,
  tags text[],
  usage_count integer default 0,
  avg_success_rate decimal(3,2),
  created_at timestamptz default now()
);

create index if not exists idx_multimodal_questions_skill on multimodal_questions(skill_id, difficulty_level);

-- ============================================================================
-- 6. STUDY ANALYTICS & VISUALIZATION
-- ============================================================================

-- RENAMED to avoid conflict with existing table
create table if not exists coach_study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_date date not null,
  duration_minutes integer default 0,
  questions_answered integer default 0,
  skills_practiced text[],
  xp_earned integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_coach_study_sessions_user_date on coach_study_sessions(user_id, session_date desc);

create table if not exists concept_map_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  skill_id text references skill_taxonomy(skill_id) on delete cascade,
  mastery_level decimal(3,2) default 0 check (mastery_level between 0 and 1),
  connections_discovered integer default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, skill_id)
);

create table if not exists mistake_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  error_type text not null,
  skill_id text references skill_taxonomy(skill_id) on delete set null,
  frequency integer default 1,
  last_occurred_at timestamptz default now(),
  resolved boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_mistake_patterns_user on mistake_patterns(user_id, resolved, frequency desc);

-- ============================================================================
-- 7. LEADERBOARD SYSTEM
-- ============================================================================

create table if not exists leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_name text,
  total_xp integer default 0,
  current_level integer default 1,
  badges_earned integer default 0,
  study_streak integer default 0,
  rank integer,
  last_updated_at timestamptz default now(),
  unique(user_id)
);

create index if not exists idx_leaderboard_rank on leaderboard_entries(rank);
create index if not exists idx_leaderboard_xp on leaderboard_entries(total_xp desc);

-- ============================================================================
-- 8. COACH PERSONALITY & PREFERENCES
-- ============================================================================

create table if not exists user_coach_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  preferred_persona text default 'socratic' check (preferred_persona in ('socratic', 'attending', 'peer', 'examiner', 'mentor')),
  interaction_speed text default 'normal' check (interaction_speed in ('slow', 'normal', 'fast')),
  difficulty_preference text default 'adaptive' check (difficulty_preference in ('easy', 'medium', 'hard', 'adaptive')),
  enable_hints boolean default true,
  enable_teach_backs boolean default true,
  enable_interruptions boolean default true,
  visual_feedback_level text default 'full' check (visual_feedback_level in ('minimal', 'normal', 'full')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- 9. RLS POLICIES
-- ============================================================================

alter table skill_taxonomy enable row level security;
alter table user_skill_levels enable row level security;
alter table user_gamification enable row level security;
alter table badge_definitions enable row level security;
alter table user_badges enable row level security;
alter table xp_transactions enable row level security;
alter table coach_sessions enable row level security;
alter table coach_interactions enable row level security;
alter table daily_challenges enable row level security;
alter table user_challenge_attempts enable row level security;
alter table speed_round_templates enable row level security;
alter table boss_battle_templates enable row level security;
alter table multimodal_questions enable row level security;
alter table coach_study_sessions enable row level security;
alter table concept_map_nodes enable row level security;
alter table mistake_patterns enable row level security;
alter table leaderboard_entries enable row level security;
alter table user_coach_preferences enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'skill_taxonomy' and policyname = 'Skill taxonomy is publicly readable') then
    create policy "Skill taxonomy is publicly readable" on skill_taxonomy for select using (true);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'user_skill_levels' and policyname = 'Users can view own skill levels') then
    create policy "Users can view own skill levels" on user_skill_levels for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_skill_levels' and policyname = 'Users can insert own skill levels') then
    create policy "Users can insert own skill levels" on user_skill_levels for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_skill_levels' and policyname = 'Users can update own skill levels') then
    create policy "Users can update own skill levels" on user_skill_levels for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'user_gamification' and policyname = 'Users can view own gamification') then
    create policy "Users can view own gamification" on user_gamification for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_gamification' and policyname = 'Users can insert own gamification') then
    create policy "Users can insert own gamification" on user_gamification for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_gamification' and policyname = 'Users can update own gamification') then
    create policy "Users can update own gamification" on user_gamification for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'badge_definitions' and policyname = 'Badge definitions are publicly readable') then
    create policy "Badge definitions are publicly readable" on badge_definitions for select using (true);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'user_badges' and policyname = 'Users can view own badges') then
    create policy "Users can view own badges" on user_badges for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_badges' and policyname = 'Users can insert own badges') then
    create policy "Users can insert own badges" on user_badges for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'xp_transactions' and policyname = 'Users can view own xp transactions') then
    create policy "Users can view own xp transactions" on xp_transactions for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'xp_transactions' and policyname = 'Users can insert own xp transactions') then
    create policy "Users can insert own xp transactions" on xp_transactions for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'coach_sessions' and policyname = 'Users can view own coach sessions') then
    create policy "Users can view own coach sessions" on coach_sessions for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'coach_sessions' and policyname = 'Users can insert own coach sessions') then
    create policy "Users can insert own coach sessions" on coach_sessions for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'coach_sessions' and policyname = 'Users can update own coach sessions') then
    create policy "Users can update own coach sessions" on coach_sessions for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'coach_interactions' and policyname = 'Users can view own coach interactions') then
    create policy "Users can view own coach interactions" on coach_interactions for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'coach_interactions' and policyname = 'Users can insert own coach interactions') then
    create policy "Users can insert own coach interactions" on coach_interactions for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'daily_challenges' and policyname = 'Daily challenges are publicly readable') then
    create policy "Daily challenges are publicly readable" on daily_challenges for select using (true);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'user_challenge_attempts' and policyname = 'Users can view own challenge attempts') then
    create policy "Users can view own challenge attempts" on user_challenge_attempts for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_challenge_attempts' and policyname = 'Users can insert own challenge attempts') then
    create policy "Users can insert own challenge attempts" on user_challenge_attempts for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_challenge_attempts' and policyname = 'Users can update own challenge attempts') then
    create policy "Users can update own challenge attempts" on user_challenge_attempts for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'speed_round_templates' and policyname = 'Speed round templates are publicly readable') then
    create policy "Speed round templates are publicly readable" on speed_round_templates for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'boss_battle_templates' and policyname = 'Boss battle templates are publicly readable') then
    create policy "Boss battle templates are publicly readable" on boss_battle_templates for select using (true);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'multimodal_questions' and policyname = 'Multimodal questions are publicly readable') then
    create policy "Multimodal questions are publicly readable" on multimodal_questions for select using (true);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'coach_study_sessions' and policyname = 'Users can view own coach study sessions') then
    create policy "Users can view own coach study sessions" on coach_study_sessions for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'coach_study_sessions' and policyname = 'Users can insert own coach study sessions') then
    create policy "Users can insert own coach study sessions" on coach_study_sessions for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'coach_study_sessions' and policyname = 'Users can update own coach study sessions') then
    create policy "Users can update own coach study sessions" on coach_study_sessions for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'concept_map_nodes' and policyname = 'Users can view own concept map') then
    create policy "Users can view own concept map" on concept_map_nodes for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'concept_map_nodes' and policyname = 'Users can insert own concept map') then
    create policy "Users can insert own concept map" on concept_map_nodes for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'concept_map_nodes' and policyname = 'Users can update own concept map') then
    create policy "Users can update own concept map" on concept_map_nodes for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'mistake_patterns' and policyname = 'Users can view own mistake patterns') then
    create policy "Users can view own mistake patterns" on mistake_patterns for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'mistake_patterns' and policyname = 'Users can insert own mistake patterns') then
    create policy "Users can insert own mistake patterns" on mistake_patterns for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'mistake_patterns' and policyname = 'Users can update own mistake patterns') then
    create policy "Users can update own mistake patterns" on mistake_patterns for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'leaderboard_entries' and policyname = 'Leaderboard is publicly readable') then
    create policy "Leaderboard is publicly readable" on leaderboard_entries for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'leaderboard_entries' and policyname = 'Users can update own leaderboard entry') then
    create policy "Users can update own leaderboard entry" on leaderboard_entries for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'leaderboard_entries' and policyname = 'Users can insert own leaderboard entry') then
    create policy "Users can insert own leaderboard entry" on leaderboard_entries for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'user_coach_preferences' and policyname = 'Users can view own coach preferences') then
    create policy "Users can view own coach preferences" on user_coach_preferences for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_coach_preferences' and policyname = 'Users can insert own coach preferences') then
    create policy "Users can insert own coach preferences" on user_coach_preferences for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_coach_preferences' and policyname = 'Users can update own coach preferences') then
    create policy "Users can update own coach preferences" on user_coach_preferences for update using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================================
-- 10. HELPER FUNCTIONS
-- ============================================================================

create or replace function update_skill_level(
  p_user_id uuid,
  p_skill_id text,
  p_was_correct boolean,
  p_response_quality decimal
)
returns void
language plpgsql
security definer
as $$
declare
  v_current_level integer;
  v_new_level integer;
  v_total_attempts integer;
  v_correct_attempts integer;
  v_new_confidence decimal;
begin
  select level, total_attempts, correct_attempts
  into v_current_level, v_total_attempts, v_correct_attempts
  from user_skill_levels
  where user_id = p_user_id and skill_id = p_skill_id;

  if not found then
    insert into user_skill_levels (user_id, skill_id, level, total_attempts, correct_attempts, confidence_score, last_practiced_at)
    values (p_user_id, p_skill_id, 1, 1, case when p_was_correct then 1 else 0 end, p_response_quality, now());
    return;
  end if;

  v_total_attempts := v_total_attempts + 1;
  if p_was_correct then
    v_correct_attempts := v_correct_attempts + 1;
  end if;

  v_new_confidence := (v_correct_attempts::decimal / v_total_attempts::decimal) * 0.7 + p_response_quality * 0.3;

  if v_new_confidence >= 0.9 and v_total_attempts >= 10 then
    v_new_level := 5;
  elsif v_new_confidence >= 0.8 and v_total_attempts >= 8 then
    v_new_level := 4;
  elsif v_new_confidence >= 0.7 and v_total_attempts >= 5 then
    v_new_level := 3;
  elsif v_new_confidence >= 0.6 and v_total_attempts >= 3 then
    v_new_level := 2;
  else
    v_new_level := 1;
  end if;

  update user_skill_levels
  set
    level = v_new_level,
    confidence_score = v_new_confidence,
    total_attempts = v_total_attempts,
    correct_attempts = v_correct_attempts,
    last_practiced_at = now(),
    updated_at = now()
  where user_id = p_user_id and skill_id = p_skill_id;
end;
$$;

create or replace function award_xp(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_skill_id text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_new_total_xp integer;
  v_current_level integer;
  v_xp_to_next integer;
  v_new_level integer;
  v_leveled_up boolean := false;
begin
  select total_xp, current_level, xp_to_next_level
  into v_new_total_xp, v_current_level, v_xp_to_next
  from user_gamification
  where user_id = p_user_id;

  if not found then
    insert into user_gamification (user_id, total_xp, current_level, xp_to_next_level)
    values (p_user_id, p_amount, 1, 100);

    insert into xp_transactions (user_id, amount, reason, related_skill_id)
    values (p_user_id, p_amount, p_reason, p_skill_id);

    return jsonb_build_object('leveled_up', false, 'new_level', 1, 'total_xp', p_amount);
  end if;

  v_new_total_xp := v_new_total_xp + p_amount;
  v_new_level := v_current_level;

  while v_new_total_xp >= v_xp_to_next loop
    v_new_level := v_new_level + 1;
    v_leveled_up := true;
    v_xp_to_next := v_xp_to_next + (v_new_level * 100);
  end loop;

  update user_gamification
  set
    total_xp = v_new_total_xp,
    current_level = v_new_level,
    xp_to_next_level = v_xp_to_next,
    updated_at = now()
  where user_id = p_user_id;

  insert into xp_transactions (user_id, amount, reason, related_skill_id)
  values (p_user_id, p_amount, p_reason, p_skill_id);

  return jsonb_build_object(
    'leveled_up', v_leveled_up,
    'new_level', v_new_level,
    'total_xp', v_new_total_xp,
    'xp_to_next', v_xp_to_next
  );
end;
$$;

create or replace function update_study_streak(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_last_study_date date;
  v_current_streak integer;
  v_longest_streak integer;
  v_new_streak integer;
begin
  select last_study_date, study_streak_days, longest_streak_days
  into v_last_study_date, v_current_streak, v_longest_streak
  from user_gamification
  where user_id = p_user_id;

  if not found then
    insert into user_gamification (user_id, study_streak_days, longest_streak_days, last_study_date)
    values (p_user_id, 1, 1, current_date);
    return jsonb_build_object('streak', 1, 'is_new_record', true);
  end if;

  if v_last_study_date = current_date then
    v_new_streak := v_current_streak;
  elsif v_last_study_date = current_date - interval '1 day' then
    v_new_streak := v_current_streak + 1;
  else
    v_new_streak := 1;
  end if;

  if v_new_streak > v_longest_streak then
    v_longest_streak := v_new_streak;
  end if;

  update user_gamification
  set
    study_streak_days = v_new_streak,
    longest_streak_days = v_longest_streak,
    last_study_date = current_date,
    updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object(
    'streak', v_new_streak,
    'longest_streak', v_longest_streak,
    'is_new_record', v_new_streak = v_longest_streak and v_new_streak > 1
  );
end;
$$;

-- ============================================================================
-- 11. SEED DATA
-- ============================================================================

insert into skill_taxonomy (skill_id, category, subcategory, display_name, description, difficulty_level) values
('heme.coag_cascade', 'heme', 'coagulation', 'Coagulation Cascade', 'Understanding the intrinsic, extrinsic, and common pathways', 3),
('heme.anemia_workup', 'heme', 'anemia', 'Anemia Workup', 'Differential diagnosis and lab interpretation for anemia', 2),
('heme.transfusion_medicine', 'heme', 'transfusion', 'Transfusion Medicine', 'Blood products, compatibility, reactions', 3),
('renal.acid_base', 'renal', 'acid-base', 'Acid-Base Disorders', 'Metabolic and respiratory acid-base balance', 4),
('renal.electrolytes', 'renal', 'electrolytes', 'Electrolyte Disorders', 'Sodium, potassium, calcium, magnesium disorders', 3),
('renal.aki_ckd', 'renal', 'kidney_disease', 'AKI and CKD', 'Acute and chronic kidney injury pathophysiology', 3),
('cards.ecg_interpretation', 'cards', 'diagnostics', 'ECG Interpretation', 'Reading and interpreting 12-lead ECGs', 4),
('cards.heart_failure', 'cards', 'pathophysiology', 'Heart Failure', 'Systolic vs diastolic, acute vs chronic HF', 3),
('cards.arrhythmias', 'cards', 'pathophysiology', 'Cardiac Arrhythmias', 'Atrial and ventricular arrhythmias', 4),
('pulm.abg_interpretation', 'pulm', 'diagnostics', 'ABG Interpretation', 'Arterial blood gas analysis', 3),
('pulm.obstructive_disease', 'pulm', 'pathophysiology', 'Obstructive Lung Disease', 'COPD, asthma pathophysiology', 2),
('pulm.restrictive_disease', 'pulm', 'pathophysiology', 'Restrictive Lung Disease', 'ILD and chest wall disorders', 3),
('neuro.stroke', 'neuro', 'pathophysiology', 'Stroke Syndromes', 'Ischemic and hemorrhagic stroke', 3),
('neuro.seizures', 'neuro', 'pathophysiology', 'Seizure Disorders', 'Classification and management of seizures', 3),
('neuro.cranial_nerves', 'neuro', 'anatomy', 'Cranial Nerve Exam', 'Testing and interpreting CN findings', 2),
('endo.diabetes', 'endo', 'pathophysiology', 'Diabetes Mellitus', 'Type 1, Type 2, and DKA/HHS', 2),
('endo.thyroid', 'endo', 'pathophysiology', 'Thyroid Disorders', 'Hyper and hypothyroidism', 2),
('endo.adrenal', 'endo', 'pathophysiology', 'Adrenal Disorders', 'Cushings, Addisons, pheochromocytoma', 3),
('gi.liver_disease', 'gi', 'pathophysiology', 'Liver Disease', 'Cirrhosis, hepatitis, liver failure', 3)
on conflict (skill_id) do nothing;

insert into badge_definitions (badge_id, name, description, icon, category, requirement_type, requirement_value, xp_reward, rarity) values
('heme_master', 'Hematology Master', 'Master all hematology skills at level 5', '🩸', 'skill_mastery', 'skill_category', '{"category": "heme", "min_level": 5}', 500, 'epic'),
('cardio_master', 'Cardiology Master', 'Master all cardiology skills at level 5', '❤️', 'skill_mastery', 'skill_category', '{"category": "cards", "min_level": 5}', 500, 'epic'),
('renal_master', 'Renal Master', 'Master all renal skills at level 5', '🫘', 'skill_mastery', 'skill_category', '{"category": "renal", "min_level": 5}', 500, 'epic'),
('week_warrior', 'Week Warrior', 'Study for 7 days straight', '🔥', 'streak', 'streak_days', '{"days": 7}', 100, 'common'),
('month_master', 'Month Master', 'Study for 30 days straight', '🔥🔥', 'streak', 'streak_days', '{"days": 30}', 500, 'rare'),
('year_legend', 'Year Legend', 'Study for 365 days straight', '🔥🔥🔥', 'streak', 'streak_days', '{"days": 365}', 5000, 'legendary'),
('speed_demon', 'Speed Demon', 'Complete 10 speed rounds', '⚡', 'challenge', 'challenges_completed', '{"type": "speed_round", "count": 10}', 200, 'rare'),
('boss_slayer', 'Boss Slayer', 'Complete 5 boss battles', '⚔️', 'challenge', 'challenges_completed', '{"type": "boss_battle", "count": 5}', 300, 'epic'),
('first_steps', 'First Steps', 'Complete your first study session', '👣', 'achievement', 'sessions_completed', '{"count": 1}', 50, 'common')
on conflict (badge_id) do nothing;
