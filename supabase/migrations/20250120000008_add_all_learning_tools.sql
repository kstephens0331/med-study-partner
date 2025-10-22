-- Comprehensive Learning Tools Database Schema
-- Supports all 12 interactive learning games

-- ============================================================================
-- UNIVERSAL SESSION TRACKING
-- ============================================================================

create table if not exists learning_tool_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,

  -- Tool identification
  tool_type text not null check (tool_type in (
    'trivia', 'detective', 'memory', 'prescriber', 'anatomy',
    'taboo', 'battle_royale', 'clinical_connect', 'micro_lab',
    'ecg_rhythm', 'drug_interaction', 'pathology_casino'
  )),

  -- Performance metrics
  score integer default 0,
  questions_answered integer default 0,
  questions_correct integer default 0,
  accuracy_percentage integer,

  -- Timing
  started_at timestamptz default now(),
  completed_at timestamptz,
  total_time_seconds integer,

  -- Configuration
  difficulty text check (difficulty in ('easy', 'medium', 'hard', 'mixed')),
  settings jsonb, -- Tool-specific settings

  -- Results
  performance_data jsonb -- Detailed performance breakdown
);

create index idx_learning_sessions_user on learning_tool_sessions(user_id);
create index idx_learning_sessions_tool on learning_tool_sessions(tool_type);
create index idx_learning_sessions_date on learning_tool_sessions(started_at desc);

-- ============================================================================
-- TRIVIA RACE
-- ============================================================================

create table if not exists trivia_questions (
  id uuid primary key default gen_random_uuid(),

  -- Question content
  question text not null,
  options text[] not null, -- Array of 4-5 options
  correct_answer text not null,
  explanation text not null,

  -- Classification
  category text not null, -- e.g., "Cardiology", "Pharmacology"
  subcategory text, -- e.g., "Heart Failure", "Beta Blockers"
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  system text, -- Medical system

  -- Source
  source_type text default 'ai' check (source_type in ('ai', 'material', 'manual')),
  material_id uuid references materials(id) on delete set null,

  -- Usage tracking
  times_shown integer default 0,
  times_correct integer default 0,
  avg_time_seconds numeric(5,2),

  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_trivia_category on trivia_questions(category);
create index idx_trivia_difficulty on trivia_questions(difficulty);
create index idx_trivia_system on trivia_questions(system);

-- ============================================================================
-- DIAGNOSIS DETECTIVE
-- ============================================================================

create table if not exists detective_cases (
  id uuid primary key default gen_random_uuid(),

  -- Patient presentation
  title text not null,
  patient_age integer,
  patient_sex text check (patient_sex in ('M', 'F')),
  chief_complaint text not null,

  -- Clues (revealed progressively)
  clues jsonb not null, -- Array of {type, content, cost, is_key_finding}

  -- Diagnosis
  correct_diagnosis text not null,
  alternative_diagnoses text[], -- Reasonable differentials
  explanation text not null,

  -- Classification
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  system text not null,

  -- Budget
  starting_budget integer default 500,

  -- Metadata
  created_at timestamptz default now()
);

create index idx_detective_difficulty on detective_cases(difficulty);
create index idx_detective_system on detective_cases(system);

-- ============================================================================
-- MEMORY MATCH
-- ============================================================================

create table if not exists memory_pairs (
  id uuid primary key default gen_random_uuid(),

  -- Pair content
  term1 text not null,
  term2 text not null,
  relationship text not null, -- 'drug_mechanism', 'disease_pathogen', 'symptom_diagnosis'

  -- Classification
  category text not null, -- 'pharmacology', 'microbiology', 'pathology', 'anatomy'
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),

  -- Explanation
  explanation text,

  -- Metadata
  created_at timestamptz default now()
);

create index idx_memory_category on memory_pairs(category);
create index idx_memory_difficulty on memory_pairs(difficulty);
create index idx_memory_relationship on memory_pairs(relationship);

-- ============================================================================
-- PHARMACY PRESCRIBER
-- ============================================================================

create table if not exists prescriber_cases (
  id uuid primary key default gen_random_uuid(),

  -- Patient scenario
  scenario text not null, -- Clinical presentation
  patient_age integer,
  patient_sex text check (patient_sex in ('M', 'F')),
  patient_weight_kg numeric(5,2),

  -- Patient factors
  allergies text[],
  current_medications text[],
  comorbidities text[],
  renal_function text, -- 'normal', 'mild_impairment', 'moderate_impairment', 'severe_impairment'

  -- Correct prescription
  correct_drug text not null,
  correct_dose text not null,
  correct_route text not null,
  correct_frequency text not null,
  correct_duration text not null,

  -- Alternatives
  alternative_drugs text[], -- Also acceptable

  -- Warnings
  contraindicated_drugs text[],
  interaction_warnings jsonb,

  -- Explanation
  explanation text not null,

  -- Classification
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  category text not null, -- 'antibiotics', 'cardiovascular', 'pain', etc.

  -- Metadata
  created_at timestamptz default now()
);

create index idx_prescriber_difficulty on prescriber_cases(difficulty);
create index idx_prescriber_category on prescriber_cases(category);

-- ============================================================================
-- MEDICAL TABOO
-- ============================================================================

create table if not exists taboo_terms (
  id uuid primary key default gen_random_uuid(),

  -- The term to describe
  term text not null,

  -- Forbidden words
  forbidden_words text[] not null,

  -- Classification
  category text not null, -- 'disease', 'drug', 'procedure', 'anatomy', 'pathophysiology'
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),

  -- Hints
  acceptable_hints text[], -- Examples of good descriptions

  -- Metadata
  created_at timestamptz default now()
);

create index idx_taboo_category on taboo_terms(category);
create index idx_taboo_difficulty on taboo_terms(difficulty);

-- ============================================================================
-- MICRO ID LAB
-- ============================================================================

create table if not exists micro_cases (
  id uuid primary key default gen_random_uuid(),

  -- Clinical scenario
  scenario text not null,

  -- Organism to identify
  organism text not null,
  gram_stain text, -- 'gram_positive_cocci', 'gram_negative_rods', etc.

  -- Available tests
  available_tests jsonb not null, -- {test_name, cost, result, turnaround_time}

  -- Critical tests (minimum needed)
  critical_tests text[], -- Tests needed for definitive ID

  -- Treatment
  recommended_antibiotic text,
  antibiotic_class text,

  -- Explanation
  explanation text not null,

  -- Classification
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  organism_type text, -- 'bacteria', 'virus', 'fungus', 'parasite'

  -- Budget
  test_budget integer default 300,

  -- Metadata
  created_at timestamptz default now()
);

create index idx_micro_difficulty on micro_cases(difficulty);
create index idx_micro_organism_type on micro_cases(organism_type);

-- ============================================================================
-- ECG RHYTHM MASTER
-- ============================================================================

create table if not exists ecg_rhythms (
  id uuid primary key default gen_random_uuid(),

  -- Rhythm details
  rhythm_name text not null,
  rhythm_description text not null, -- Detailed findings

  -- Image (if available)
  image_url text, -- URL to ECG strip image

  -- Key findings
  rate integer,
  rhythm_type text, -- 'regular', 'irregularly_irregular', 'regularly_irregular'
  p_wave_present boolean,
  qrs_duration integer, -- milliseconds
  key_findings text[], -- e.g., 'delta wave', 'ST elevation', 'wide QRS'

  -- Clinical significance
  requires_treatment boolean,
  acls_algorithm text, -- If applicable
  immediate_intervention text, -- e.g., 'synchronized cardioversion'

  -- Classification
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  category text, -- 'brady', 'tachy', 'atrial', 'ventricular', 'heart_block'

  -- Explanation
  explanation text not null,

  -- Metadata
  created_at timestamptz default now()
);

create index idx_ecg_difficulty on ecg_rhythms(difficulty);
create index idx_ecg_category on ecg_rhythms(category);

-- ============================================================================
-- DRUG INTERACTION SIMULATOR
-- ============================================================================

create table if not exists drug_interaction_cases (
  id uuid primary key default gen_random_uuid(),

  -- Patient scenario
  scenario text not null,
  patient_age integer,
  patient_sex text check (patient_sex in ('M', 'F')),

  -- Medical conditions
  conditions text[] not null, -- e.g., ['atrial_fibrillation', 'heart_failure', 'diabetes']

  -- Required medications (for conditions)
  required_medications jsonb not null, -- {condition, drug_options[]}

  -- Drug database (interactions, QTc effects, renal adjustments)
  drug_database jsonb not null,

  -- Optimal regimen
  optimal_regimen text[] not null,
  acceptable_alternatives text[][],

  -- Dangerous combinations
  dangerous_interactions jsonb, -- {drug1, drug2, interaction_type, severity}

  -- Renal function
  renal_function text default 'normal',

  -- Explanation
  explanation text not null,

  -- Classification
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),

  -- Metadata
  created_at timestamptz default now()
);

create index idx_drug_interaction_difficulty on drug_interaction_cases(difficulty);

-- ============================================================================
-- CLINICAL CONNECT (Knowledge Graph)
-- ============================================================================

create table if not exists clinical_concepts (
  id uuid primary key default gen_random_uuid(),

  -- Concept details
  concept_name text not null unique,
  concept_type text not null, -- 'disease', 'drug', 'symptom', 'pathophysiology', 'anatomy'

  -- Description
  description text,

  -- Related concepts (for validation)
  related_concepts jsonb, -- {concept_name, relationship_type, strength}

  -- Metadata
  created_at timestamptz default now()
);

create table if not exists clinical_connections (
  id uuid primary key default gen_random_uuid(),

  -- Connection
  concept1_id uuid references clinical_concepts(id),
  concept2_id uuid references clinical_concepts(id),

  -- Relationship
  relationship_type text not null, -- 'causes', 'treats', 'symptom_of', 'risk_factor_for', etc.
  strength integer check (strength between 1 and 5), -- How strong the connection

  -- Validation
  is_valid boolean default true,
  explanation text,

  -- Discovery
  is_hidden boolean default false, -- Bonus points for discovering

  -- Metadata
  created_at timestamptz default now(),

  unique(concept1_id, concept2_id, relationship_type)
);

create index idx_connections_concept1 on clinical_connections(concept1_id);
create index idx_connections_concept2 on clinical_connections(concept2_id);

-- ============================================================================
-- PATHOLOGY CASINO
-- ============================================================================

create table if not exists pathology_slides (
  id uuid primary key default gen_random_uuid(),

  -- Slide details
  slide_title text not null,
  diagnosis text not null,

  -- Image
  image_url text, -- URL to histology image
  magnification text, -- '10x', '40x', '100x'
  stain text, -- 'H&E', 'PAS', 'Trichrome', etc.

  -- Key findings
  key_findings text[] not null,

  -- Differential diagnosis
  ddx_options text[] not null, -- Include correct + plausible alternatives

  -- Explanation
  explanation text not null,

  -- Classification
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  organ_system text not null,
  pathology_type text, -- 'neoplasm', 'inflammation', 'infectious', 'metabolic'

  -- Metadata
  created_at timestamptz default now()
);

create index idx_pathology_difficulty on pathology_slides(difficulty);
create index idx_pathology_organ on pathology_slides(organ_system);

-- ============================================================================
-- BATTLE ROYALE
-- ============================================================================

create table if not exists battle_royale_tournaments (
  id uuid primary key default gen_random_uuid(),

  -- Tournament details
  title text not null,
  start_time timestamptz not null,
  status text default 'pending' check (status in ('pending', 'active', 'completed')),

  -- Participants
  max_participants integer default 100,
  current_participants integer default 0,

  -- Questions
  total_questions integer default 20,
  time_per_question integer default 15, -- seconds

  -- Results
  winner_id uuid references auth.users(id),
  final_survivor_count integer,

  -- Metadata
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists battle_royale_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references battle_royale_tournaments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,

  -- Status
  is_alive boolean default true,
  elimination_question integer, -- Question number where eliminated
  final_rank integer,

  -- Performance
  questions_answered integer default 0,
  questions_correct integer default 0,

  -- Metadata
  joined_at timestamptz default now(),
  eliminated_at timestamptz
);

create index idx_battle_tournament on battle_royale_participants(tournament_id);
create index idx_battle_user on battle_royale_participants(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Learning tool sessions
alter table learning_tool_sessions enable row level security;

create policy "Users can view own sessions" on learning_tool_sessions
  for select using (auth.uid() = user_id);

create policy "Users can create own sessions" on learning_tool_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own sessions" on learning_tool_sessions
  for update using (auth.uid() = user_id);

-- All question/case tables (public read)
alter table trivia_questions enable row level security;
alter table detective_cases enable row level security;
alter table memory_pairs enable row level security;
alter table prescriber_cases enable row level security;
alter table taboo_terms enable row level security;
alter table micro_cases enable row level security;
alter table ecg_rhythms enable row level security;
alter table drug_interaction_cases enable row level security;
alter table clinical_concepts enable row level security;
alter table clinical_connections enable row level security;
alter table pathology_slides enable row level security;

create policy "Anyone can view questions" on trivia_questions for select using (true);
create policy "Anyone can view detective cases" on detective_cases for select using (true);
create policy "Anyone can view memory pairs" on memory_pairs for select using (true);
create policy "Anyone can view prescriber cases" on prescriber_cases for select using (true);
create policy "Anyone can view taboo terms" on taboo_terms for select using (true);
create policy "Anyone can view micro cases" on micro_cases for select using (true);
create policy "Anyone can view ecg rhythms" on ecg_rhythms for select using (true);
create policy "Anyone can view drug interaction cases" on drug_interaction_cases for select using (true);
create policy "Anyone can view clinical concepts" on clinical_concepts for select using (true);
create policy "Anyone can view clinical connections" on clinical_connections for select using (true);
create policy "Anyone can view pathology slides" on pathology_slides for select using (true);

-- Battle Royale
alter table battle_royale_tournaments enable row level security;
alter table battle_royale_participants enable row level security;

create policy "Anyone can view tournaments" on battle_royale_tournaments for select using (true);
create policy "Anyone can view participants" on battle_royale_participants for select using (true);
create policy "Users can join tournaments" on battle_royale_participants
  for insert with check (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table learning_tool_sessions is 'Universal session tracking for all learning tools';
comment on table trivia_questions is 'Rapid-fire MCQ questions for Trivia Race';
comment on table detective_cases is 'Mystery diagnostic cases for Diagnosis Detective';
comment on table memory_pairs is 'Medical concept pairs for Memory Match game';
comment on table prescriber_cases is 'Prescription writing scenarios for Pharmacy Prescriber';
comment on table taboo_terms is 'Medical terms with forbidden words for Medical Taboo';
comment on table micro_cases is 'Microbiology identification cases for Micro ID Lab';
comment on table ecg_rhythms is 'ECG rhythm strips for ECG Rhythm Master';
comment on table drug_interaction_cases is 'Polypharmacy scenarios for Drug Interaction Simulator';
comment on table clinical_concepts is 'Medical concepts for Clinical Connect knowledge graph';
comment on table clinical_connections is 'Valid connections between medical concepts';
comment on table pathology_slides is 'Histology slides for Pathology Casino';
comment on table battle_royale_tournaments is 'Elimination quiz tournaments';
comment on table battle_royale_participants is 'Participants in Battle Royale tournaments';
