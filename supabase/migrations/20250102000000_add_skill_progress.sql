-- Skill Progress Table
-- Tracks user performance across medical topic tags

create table if not exists skill_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_tag text not null,
  correct_count integer default 0,
  incorrect_count integer default 0,
  last_reviewed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, topic_tag)
);

-- Enable RLS
alter table skill_progress enable row level security;

-- RLS Policy
create policy "Users can access own skill_progress" on skill_progress
  for all using (auth.uid() = user_id);

-- Index for performance
create index idx_skill_progress_user_tag on skill_progress(user_id, topic_tag);
create index idx_skill_progress_user on skill_progress(user_id);

-- Updated_at trigger (function already exists from initial schema)
create trigger update_skill_progress_updated_at before update on skill_progress
  for each row execute function update_updated_at_column();
