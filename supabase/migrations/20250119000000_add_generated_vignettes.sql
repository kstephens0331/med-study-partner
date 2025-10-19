-- Generated Vignettes Table
-- Stores AI-generated USMLE-style vignettes from uploaded materials

create table if not exists generated_vignettes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  block_id uuid references blocks(id) on delete cascade,
  material_id uuid references materials(id) on delete set null,
  lecture_id uuid references lectures(id) on delete set null,

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
  system text, -- heme, renal, cards, neuro, pulm, endo, gi, micro, pharm, genetics, obgyn, psych, peds
  topic text, -- Specific topic within system
  difficulty text check (difficulty in ('easy', 'moderate', 'hard')),

  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes for performance
create index idx_generated_vignettes_user on generated_vignettes(user_id);
create index idx_generated_vignettes_user_block on generated_vignettes(user_id, block_id);
create index idx_generated_vignettes_material on generated_vignettes(material_id);
create index idx_generated_vignettes_lecture on generated_vignettes(lecture_id);
create index idx_generated_vignettes_system on generated_vignettes(system);
create index idx_generated_vignettes_difficulty on generated_vignettes(difficulty);

-- Enable RLS
alter table generated_vignettes enable row level security;

-- RLS Policy
create policy "Users can access own generated_vignettes" on generated_vignettes
  for all using (auth.uid() = user_id);

-- Updated_at trigger
create trigger update_generated_vignettes_updated_at before update on generated_vignettes
  for each row execute function update_updated_at_column();
