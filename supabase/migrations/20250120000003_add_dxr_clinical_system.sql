-- DxR Clinician-Style Virtual Patient System
-- Interactive clinical case simulations with AI-powered evaluation

-- DxR Cases Table (1,500 virtual patient cases)
create table if not exists dxr_cases (
  id uuid primary key default gen_random_uuid(),

  -- Case metadata
  case_number integer unique not null,
  title text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced', 'expert')),
  complexity_score integer check (complexity_score between 1 and 10),

  -- Patient demographics
  patient_age integer not null,
  patient_sex text not null check (patient_sex in ('M', 'F', 'Other')),
  patient_name text,

  -- Chief complaint
  chief_complaint text not null,

  -- Case classification
  system text, -- heme, renal, cards, neuro, pulm, endo, gi, micro, pharm, genetics, obgyn, psych, peds
  specialty text, -- primary-care, emergency, internal-medicine, surgery, pediatrics, etc.
  setting text not null check (setting in ('outpatient', 'emergency', 'inpatient', 'icu', 'clinic')),

  -- Case type
  is_common boolean default false, -- Common PCP presentation
  is_rare boolean default false, -- Rare disease
  is_emergency boolean default false, -- Time-sensitive

  -- Clinical data (stored as JSONB for flexibility)
  history_items jsonb not null, -- Available history questions and responses
  physical_exam_findings jsonb not null, -- Exam findings by system
  available_labs jsonb, -- Labs that can be ordered
  available_imaging jsonb, -- Imaging that can be ordered
  available_procedures jsonb, -- Procedures/special tests that can be ordered

  -- Correct diagnosis and reasoning
  correct_diagnosis text not null,
  diagnosis_icd10 text, -- ICD-10 code for diagnosis
  correct_differential jsonb not null, -- Array of {diagnosis, rank, reasoning}
  key_findings jsonb, -- Must-find items for good performance
  red_flags jsonb, -- Critical findings that should be identified

  -- Learning objectives
  learning_objectives text[],
  key_concepts text[],
  clinical_pearls text,
  common_pitfalls text[], -- Common errors students make on this case

  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Student Case Attempts Table (track student work)
create table if not exists dxr_case_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  case_id uuid references dxr_cases(id) on delete cascade not null,

  -- Attempt metadata
  attempt_number integer not null, -- Students can retry cases
  started_at timestamp with time zone default now(),
  submitted_at timestamp with time zone,
  time_spent_seconds integer,

  -- Student's work (stored as JSONB)
  history_taken jsonb, -- Questions asked
  exam_performed jsonb, -- Exam components done
  labs_ordered jsonb, -- Labs ordered
  imaging_ordered jsonb, -- Imaging ordered
  procedures_ordered jsonb, -- Procedures/special tests ordered

  -- Differential diagnosis (student's ranking)
  differential_diagnosis jsonb, -- Array of {diagnosis, rank, justification}

  -- SOAP note
  soap_subjective text,
  soap_objective text,
  soap_assessment text,
  soap_plan text,

  -- AI Evaluation scores
  history_score integer check (history_score between 0 and 100),
  exam_score integer check (exam_score between 0 and 100),
  diagnostic_workup_score integer check (diagnostic_workup_score between 0 and 100),
  differential_score integer check (differential_score between 0 and 100),
  soap_note_score integer check (soap_note_score between 0 and 100),
  overall_score integer check (overall_score between 0 and 100),

  -- AI Feedback
  ai_feedback jsonb, -- Detailed feedback by section
  strengths text[],
  areas_for_improvement text[],
  missed_critical_findings text[],

  -- Status
  is_complete boolean default false,

  unique(user_id, case_id, attempt_number)
);

-- Case Progress Tracking
create table if not exists dxr_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Overall statistics
  cases_attempted integer default 0,
  cases_completed integer default 0,
  average_score numeric(5,2),

  -- Performance by difficulty
  beginner_avg numeric(5,2),
  intermediate_avg numeric(5,2),
  advanced_avg numeric(5,2),
  expert_avg numeric(5,2),

  -- Performance by category
  history_avg numeric(5,2),
  exam_avg numeric(5,2),
  diagnostic_avg numeric(5,2),
  differential_avg numeric(5,2),
  soap_avg numeric(5,2),

  -- Timestamps
  last_case_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  unique(user_id)
);

-- Indexes for performance
create index if not exists idx_dxr_cases_difficulty on dxr_cases(difficulty);
create index if not exists idx_dxr_cases_system on dxr_cases(system);
create index if not exists idx_dxr_cases_specialty on dxr_cases(specialty);
create index if not exists idx_dxr_cases_common on dxr_cases(is_common);
create index if not exists idx_dxr_cases_rare on dxr_cases(is_rare);

create index if not exists idx_dxr_attempts_user on dxr_case_attempts(user_id);
create index if not exists idx_dxr_attempts_case on dxr_case_attempts(case_id);
create index if not exists idx_dxr_attempts_submitted on dxr_case_attempts(submitted_at);

create index if not exists idx_dxr_progress_user on dxr_progress(user_id);

-- RLS Policies
alter table dxr_cases enable row level security;
alter table dxr_case_attempts enable row level security;
alter table dxr_progress enable row level security;

-- DxR Cases: Public access - everyone can view all cases (no authentication required)
create policy "Anyone can view dxr cases" on dxr_cases
  for select using (true);

-- Service role can insert cases (for generation scripts)
create policy "Service role can insert dxr cases" on dxr_cases
  for insert with check (true);

-- Case Attempts: Users can only see and manage their own
create policy "Users can view their own case attempts" on dxr_case_attempts
  for select using (auth.uid() = user_id);

create policy "Users can insert their own case attempts" on dxr_case_attempts
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own case attempts" on dxr_case_attempts
  for update using (auth.uid() = user_id);

-- Progress: Users can only see and manage their own
create policy "Users can view their own progress" on dxr_progress
  for select using (auth.uid() = user_id);

create policy "Users can insert their own progress" on dxr_progress
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own progress" on dxr_progress
  for update using (auth.uid() = user_id);

-- Updated_at triggers
do $$ begin
  if exists (select 1 from pg_proc where proname = 'update_updated_at_column') then
    if not exists (select 1 from pg_trigger where tgname = 'update_dxr_cases_updated_at') then
      create trigger update_dxr_cases_updated_at before update on dxr_cases
        for each row execute function update_updated_at_column();
    end if;

    if not exists (select 1 from pg_trigger where tgname = 'update_dxr_progress_updated_at') then
      create trigger update_dxr_progress_updated_at before update on dxr_progress
        for each row execute function update_updated_at_column();
    end if;
  end if;
end $$;

-- Statistics views
create or replace view dxr_case_stats as
select
  difficulty,
  count(*) as total_cases,
  count(*) filter (where is_common) as common_cases,
  count(*) filter (where is_rare) as rare_cases,
  count(*) filter (where is_emergency) as emergency_cases
from dxr_cases
group by difficulty
order by
  case difficulty
    when 'beginner' then 1
    when 'intermediate' then 2
    when 'advanced' then 3
    when 'expert' then 4
  end;

create or replace view dxr_user_performance as
select
  u.id as user_id,
  u.email,
  p.cases_completed,
  p.average_score,
  count(distinct a.case_id) as unique_cases_attempted,
  avg(a.overall_score) as recent_avg_score
from auth.users u
left join dxr_progress p on p.user_id = u.id
left join dxr_case_attempts a on a.user_id = u.id and a.submitted_at > now() - interval '30 days'
group by u.id, u.email, p.cases_completed, p.average_score;
