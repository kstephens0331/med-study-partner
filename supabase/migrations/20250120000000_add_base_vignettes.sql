-- Base Vignettes Table (Global Question Bank)
-- Shared across ALL students - 4,000-4,500 pre-generated USMLE questions

create table if not exists base_vignettes (
  id uuid primary key default gen_random_uuid(),

  -- Vignette content (matches MicroCase type structure)
  prompt text not null,
  labs jsonb default '[]'::jsonb, -- Array of {test, result, referenceRange}
  vitals jsonb default '{}'::jsonb, -- Object with BP, HR, Temp, RR, etc.
  choices jsonb not null, -- Array of {label, text}
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D', 'E')),
  explanation text not null,
  comparison_table jsonb, -- Optional {title, headers, rows}

  -- Metadata
  tags jsonb default '[]'::jsonb,
  system text not null, -- heme, renal, cards, neuro, pulm, endo, gi, micro, pharm, genetics, obgyn, psych, peds
  topic text not null, -- Specific topic within system (e.g., 'iron-deficiency-anemia')
  difficulty text not null check (difficulty in ('easy', 'moderate', 'hard')),

  -- Variant tracking
  variant_number integer, -- 1-350 for each topic
  seed_vignette_id uuid references base_vignettes(id), -- If this is a variant, link to seed

  -- Quality control
  is_reviewed boolean default false,
  quality_score integer check (quality_score between 1 and 5),

  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists idx_base_vignettes_system on base_vignettes(system);
create index if not exists idx_base_vignettes_topic on base_vignettes(topic);
create index if not exists idx_base_vignettes_difficulty on base_vignettes(difficulty);
create index if not exists idx_base_vignettes_system_difficulty on base_vignettes(system, difficulty);
create index if not exists idx_base_vignettes_reviewed on base_vignettes(is_reviewed);

-- Grant permissions to service_role and authenticated users
grant all on base_vignettes to service_role;
grant select on base_vignettes to authenticated;
grant select on base_vignettes to anon;

-- RLS: Public read, service role write
alter table base_vignettes enable row level security;

-- Anyone can read base vignettes
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'base_vignettes'
    and policyname = 'Anyone can read base_vignettes'
  ) then
    create policy "Anyone can read base_vignettes" on base_vignettes
      for select using (true);
  end if;
end $$;

-- Service role can insert/update/delete (scripts will use service role key)
-- No user-initiated writes allowed - this is read-only for students

-- Updated_at trigger
do $$ begin
  if exists (select 1 from pg_proc where proname = 'update_updated_at_column') then
    if not exists (select 1 from pg_trigger where tgname = 'update_base_vignettes_updated_at') then
      create trigger update_base_vignettes_updated_at before update on base_vignettes
        for each row execute function update_updated_at_column();
    end if;
  end if;
end $$;

-- Create statistics view for monitoring
create or replace view base_vignettes_stats as
select
  system,
  difficulty,
  count(*) as vignette_count,
  count(*) filter (where is_reviewed = true) as reviewed_count,
  avg(quality_score) as avg_quality_score
from base_vignettes
group by system, difficulty
order by system, difficulty;
