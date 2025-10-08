-- Med Study Partner Database Schema
-- Enable UUID extension
create extension if not exists "uuid-ossp" schema extensions;

-- Blocks table (study blocks/rotations)
create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, name)
);

-- Lectures table
create table if not exists lectures (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  block_id uuid references blocks(id) on delete cascade,
  title text not null,
  duration_sec integer default 0,
  transcript jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Lecture packs (AI-generated content)
create table if not exists lecture_packs (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid references lectures(id) on delete cascade,
  abstract text,
  outline jsonb default '[]'::jsonb,
  pearls jsonb default '[]'::jsonb,
  cloze jsonb default '[]'::jsonb,
  quiz jsonb default '[]'::jsonb,
  vignettes jsonb default '[]'::jsonb,
  directqs jsonb default '[]'::jsonb,
  tags jsonb default '[]'::jsonb,
  report jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Materials table (uploaded study materials)
create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  block_id uuid references blocks(id) on delete cascade,
  title text not null,
  file_type text,
  content_text text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Material packs (AI-generated content from materials)
create table if not exists material_packs (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references materials(id) on delete cascade,
  abstract text,
  outline jsonb default '[]'::jsonb,
  pearls jsonb default '[]'::jsonb,
  cloze jsonb default '[]'::jsonb,
  quiz jsonb default '[]'::jsonb,
  vignettes jsonb default '[]'::jsonb,
  directqs jsonb default '[]'::jsonb,
  tags jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- SRS Cards
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  block_id uuid references blocks(id) on delete cascade,
  lecture_id uuid references lectures(id) on delete set null,
  material_id uuid references materials(id) on delete set null,
  source_kind text check (source_kind in ('cloze', 'direct', 'vignette')),
  front text not null,
  back text not null,
  created_at timestamp with time zone default now(),
  unique(user_id, block_id, front)
);

-- Reviews (SRS review history)
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  card_id uuid references cards(id) on delete cascade,
  quality integer check (quality >= 0 and quality <= 5),
  reviewed_at timestamp with time zone default now()
);

-- Mastery (SRS state per card)
create table if not exists mastery (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  card_id uuid references cards(id) on delete cascade,
  interval_days integer default 1,
  ease real default 2.5,
  reps integer default 0,
  lapses integer default 0,
  due_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, card_id)
);

-- Sessions (study sessions)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  block_id uuid references blocks(id) on delete cascade,
  started_at timestamp with time zone default now(),
  ended_at timestamp with time zone,
  cards_reviewed integer default 0
);

-- Attempts (detailed attempt tracking)
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  card_id uuid references cards(id) on delete cascade,
  quality integer check (quality >= 0 and quality <= 5),
  response_time_ms integer,
  attempted_at timestamp with time zone default now()
);

-- Row Level Security (RLS) - owner_only policy
alter table blocks enable row level security;
alter table lectures enable row level security;
alter table lecture_packs enable row level security;
alter table materials enable row level security;
alter table material_packs enable row level security;
alter table cards enable row level security;
alter table reviews enable row level security;
alter table mastery enable row level security;
alter table sessions enable row level security;
alter table attempts enable row level security;

-- RLS Policies (allow users to access only their own data)
create policy "Users can access own blocks" on blocks for all using (auth.uid()::text = user_id);
create policy "Users can access own lectures" on lectures for all using (auth.uid()::text = user_id);
create policy "Users can access own lecture_packs" on lecture_packs for all using (
  lecture_id in (select id from lectures where user_id = auth.uid()::text)
);
create policy "Users can access own materials" on materials for all using (auth.uid()::text = user_id);
create policy "Users can access own material_packs" on material_packs for all using (
  material_id in (select id from materials where user_id = auth.uid()::text)
);
create policy "Users can access own cards" on cards for all using (auth.uid()::text = user_id);
create policy "Users can access own reviews" on reviews for all using (auth.uid()::text = user_id);
create policy "Users can access own mastery" on mastery for all using (auth.uid()::text = user_id);
create policy "Users can access own sessions" on sessions for all using (auth.uid()::text = user_id);
create policy "Users can access own attempts" on attempts for all using (
  session_id in (select id from sessions where user_id = auth.uid()::text)
);

-- Indexes for performance
create index idx_lectures_user_block on lectures(user_id, block_id);
create index idx_lectures_block on lectures(block_id);
create index idx_lecture_packs_lecture on lecture_packs(lecture_id);
create index idx_materials_user_block on materials(user_id, block_id);
create index idx_material_packs_material on material_packs(material_id);
create index idx_cards_user_block on cards(user_id, block_id);
create index idx_cards_lecture on cards(lecture_id);
create index idx_cards_material on cards(material_id);
create index idx_reviews_user_card on reviews(user_id, card_id);
create index idx_mastery_user_due on mastery(user_id, due_at);
create index idx_sessions_user_block on sessions(user_id, block_id);
create index idx_attempts_session on attempts(session_id);

-- Updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger update_blocks_updated_at before update on blocks
  for each row execute function update_updated_at_column();
create trigger update_lectures_updated_at before update on lectures
  for each row execute function update_updated_at_column();
create trigger update_lecture_packs_updated_at before update on lecture_packs
  for each row execute function update_updated_at_column();
create trigger update_materials_updated_at before update on materials
  for each row execute function update_updated_at_column();
create trigger update_material_packs_updated_at before update on material_packs
  for each row execute function update_updated_at_column();
create trigger update_mastery_updated_at before update on mastery
  for each row execute function update_updated_at_column();
