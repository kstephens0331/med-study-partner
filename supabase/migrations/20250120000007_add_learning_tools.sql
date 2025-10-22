-- Learning Tools System
-- Supports Jeopardy game, note-taking, and future study tools

-- 1. Jeopardy Questions Table
create table if not exists jeopardy_questions (
  id uuid primary key default gen_random_uuid(),

  -- Question details
  category text not null, -- e.g., "Cardiology", "Pharmacology", "Pathology"
  subcategory text, -- e.g., "Heart Failure", "Antibiotics"
  system text, -- Medical system (cards, neuro, gi, etc.)
  point_value integer not null check (point_value in (100, 200, 300, 400, 500)),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),

  -- Question content
  question text not null, -- The clue/question shown to student
  answer text not null, -- The correct answer
  explanation text, -- Why this is the answer

  -- Source tracking
  source text, -- e.g., "USMLE Step 1", "Internal Medicine"
  source_type text default 'ai' check (source_type in ('ai', 'material')), -- AI-generated or from uploaded materials
  material_id uuid references materials(id) on delete cascade, -- Link to specific material if source_type='material'
  tags text[], -- Array of tags for filtering

  -- Metadata
  created_by uuid references auth.users(id) on delete set null, -- Who created/generated this question
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_jeopardy_category on jeopardy_questions(category);
create index idx_jeopardy_system on jeopardy_questions(system);
create index idx_jeopardy_difficulty on jeopardy_questions(difficulty);
create index idx_jeopardy_points on jeopardy_questions(point_value);

-- 2. Jeopardy Game Sessions (track student progress)
create table if not exists jeopardy_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,

  -- Game state
  selected_categories text[], -- Array of 5 categories for this game
  num_players integer default 1 check (num_players between 1 and 8), -- Number of players in this game
  question_source text default 'ai' check (question_source in ('ai', 'material')), -- Where questions come from
  material_id uuid references materials(id) on delete set null, -- If source=material, which material
  total_score integer default 0,
  questions_answered integer default 0,
  questions_correct integer default 0,

  -- Timing
  started_at timestamptz default now(),
  completed_at timestamptz,
  time_elapsed_seconds integer
);

create index idx_jeopardy_sessions_user on jeopardy_sessions(user_id);

-- 3. Jeopardy Players (for multiplayer games)
create table if not exists jeopardy_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references jeopardy_sessions(id) on delete cascade,

  -- Player info
  player_name text not null, -- e.g., "Player 1", "Sarah", "Team A"
  player_number integer not null check (player_number between 1 and 8),

  -- Score tracking
  score integer default 0,
  questions_answered integer default 0,
  questions_correct integer default 0,

  -- Metadata
  created_at timestamptz default now()
);

create index idx_jeopardy_players_session on jeopardy_players(session_id);

-- 4. Jeopardy Answers (student responses)
create table if not exists jeopardy_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references jeopardy_sessions(id) on delete cascade,
  question_id uuid references jeopardy_questions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  player_id uuid references jeopardy_players(id) on delete cascade, -- Which player in multiplayer game

  -- Response
  student_answer text,
  is_correct boolean,
  points_earned integer,

  -- Timing
  answered_at timestamptz default now(),
  time_to_answer_seconds integer
);

create index idx_jeopardy_answers_session on jeopardy_answers(session_id);
create index idx_jeopardy_answers_user on jeopardy_answers(user_id);

-- 4. Study Notes Table (Neebo-style)
create table if not exists study_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,

  -- Note details
  title text not null,
  content text not null, -- Rich text content

  -- Organization
  folder text default 'General', -- Folder/category
  tags text[], -- Array of tags
  system text, -- Medical system
  color text default '#3b82f6', -- Color coding

  -- Metadata
  is_favorite boolean default false,
  is_pinned boolean default false,
  word_count integer default 0,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_viewed_at timestamptz
);

create index idx_study_notes_user on study_notes(user_id);
create index idx_study_notes_folder on study_notes(folder);
create index idx_study_notes_system on study_notes(system);
create index idx_study_notes_updated on study_notes(updated_at desc);

-- 5. Note Sharing (optional - for collaborative study)
create table if not exists shared_notes (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references study_notes(id) on delete cascade,
  shared_by uuid references auth.users(id) on delete cascade,
  shared_with uuid references auth.users(id) on delete cascade,

  -- Permissions
  can_edit boolean default false,
  can_reshare boolean default false,

  -- Metadata
  shared_at timestamptz default now()
);

create index idx_shared_notes_note on shared_notes(note_id);
create index idx_shared_notes_recipient on shared_notes(shared_with);

-- Row Level Security Policies

-- Jeopardy Questions (public read, service role insert)
alter table jeopardy_questions enable row level security;

create policy "Anyone can view jeopardy questions" on jeopardy_questions
  for select using (true);

create policy "Service role can insert jeopardy questions" on jeopardy_questions
  for insert with check (true);

-- Jeopardy Sessions (users can only see their own)
alter table jeopardy_sessions enable row level security;

create policy "Users can view own jeopardy sessions" on jeopardy_sessions
  for select using (auth.uid() = user_id);

create policy "Users can create own jeopardy sessions" on jeopardy_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own jeopardy sessions" on jeopardy_sessions
  for update using (auth.uid() = user_id);

-- Jeopardy Players (users can view players in their sessions)
alter table jeopardy_players enable row level security;

create policy "Users can view players in their sessions" on jeopardy_players
  for select using (
    exists (
      select 1 from jeopardy_sessions
      where jeopardy_sessions.id = jeopardy_players.session_id
      and jeopardy_sessions.user_id = auth.uid()
    )
  );

create policy "Users can create players in their sessions" on jeopardy_players
  for insert with check (
    exists (
      select 1 from jeopardy_sessions
      where jeopardy_sessions.id = session_id
      and jeopardy_sessions.user_id = auth.uid()
    )
  );

create policy "Users can update players in their sessions" on jeopardy_players
  for update using (
    exists (
      select 1 from jeopardy_sessions
      where jeopardy_sessions.id = jeopardy_players.session_id
      and jeopardy_sessions.user_id = auth.uid()
    )
  );

-- Jeopardy Answers (users can only see their own)
alter table jeopardy_answers enable row level security;

create policy "Users can view own jeopardy answers" on jeopardy_answers
  for select using (auth.uid() = user_id);

create policy "Users can create own jeopardy answers" on jeopardy_answers
  for insert with check (auth.uid() = user_id);

-- Study Notes (users can only see their own + shared notes)
alter table study_notes enable row level security;

create policy "Users can view own notes" on study_notes
  for select using (auth.uid() = user_id);

create policy "Users can view shared notes" on study_notes
  for select using (
    exists (
      select 1 from shared_notes
      where shared_notes.note_id = study_notes.id
      and shared_notes.shared_with = auth.uid()
    )
  );

create policy "Users can create own notes" on study_notes
  for insert with check (auth.uid() = user_id);

create policy "Users can update own notes" on study_notes
  for update using (auth.uid() = user_id);

create policy "Users can delete own notes" on study_notes
  for delete using (auth.uid() = user_id);

-- Shared Notes (users can view shares they created or received)
alter table shared_notes enable row level security;

create policy "Users can view shares they created" on shared_notes
  for select using (auth.uid() = shared_by);

create policy "Users can view shares they received" on shared_notes
  for select using (auth.uid() = shared_with);

create policy "Users can create shares for their own notes" on shared_notes
  for insert with check (
    exists (
      select 1 from study_notes
      where study_notes.id = shared_notes.note_id
      and study_notes.user_id = auth.uid()
    )
  );

-- Comments
comment on table jeopardy_questions is 'Medical jeopardy questions organized by category and difficulty';
comment on table jeopardy_sessions is 'Student jeopardy game sessions with scoring and progress tracking';
comment on table jeopardy_answers is 'Student responses to jeopardy questions';
comment on table study_notes is 'Student study notes with rich text, tagging, and organization';
comment on table shared_notes is 'Note sharing between students for collaborative study';
