-- Video Review System
-- Segmented lectures with filtering by topic, system, and difficulty

-- Video Sources Table (uploaded lectures, PowerPoints, recordings)
create table if not exists video_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,

  -- Video metadata
  title text not null,
  description text,
  original_filename text not null,
  video_url text not null, -- Supabase Storage URL or external URL
  thumbnail_url text,
  duration_seconds integer not null,
  file_size_bytes bigint,

  -- Classification
  system text, -- heme, renal, cards, etc. (nullable - can be unclassified)
  topics text[], -- Array of topics covered
  difficulty text check (difficulty in ('easy', 'moderate', 'hard', 'mixed')),

  -- Source type
  source_type text not null check (source_type in ('lecture', 'powerpoint', 'recording', 'screencapture', 'other')),

  -- Processing status
  is_processed boolean default false,
  is_segmented boolean default false,

  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Video Segments Table (5-7 minute chunks)
create table if not exists video_segments (
  id uuid primary key default gen_random_uuid(),
  video_source_id uuid references video_sources(id) on delete cascade,

  -- Segment metadata
  title text not null,
  description text,
  segment_number integer not null, -- Order within parent video

  -- Time boundaries
  start_time_seconds integer not null,
  end_time_seconds integer not null,
  duration_seconds integer not null,

  -- Classification (can differ from parent video)
  system text,
  topics text[],
  difficulty text check (difficulty in ('easy', 'moderate', 'hard')),
  keywords text[], -- Searchable keywords

  -- AI-generated summary
  summary text,
  key_concepts text[],

  -- Direct playback URL (with timestamp params)
  playback_url text,

  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  -- Constraints
  unique(video_source_id, segment_number)
);

-- Video Watch Progress (track what students have watched)
create table if not exists video_watch_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  video_segment_id uuid references video_segments(id) on delete cascade not null,

  -- Progress tracking
  last_position_seconds integer default 0,
  is_completed boolean default false,
  watch_count integer default 0,

  -- Timestamps
  first_watched_at timestamp with time zone default now(),
  last_watched_at timestamp with time zone default now(),
  completed_at timestamp with time zone,

  unique(user_id, video_segment_id)
);

-- Indexes for performance
create index if not exists idx_video_sources_user on video_sources(user_id);
create index if not exists idx_video_sources_system on video_sources(system);
create index if not exists idx_video_sources_topics on video_sources using gin(topics);

create index if not exists idx_video_segments_source on video_segments(video_source_id);
create index if not exists idx_video_segments_system on video_segments(system);
create index if not exists idx_video_segments_topics on video_segments using gin(topics);
create index if not exists idx_video_segments_keywords on video_segments using gin(keywords);

create index if not exists idx_video_watch_progress_user on video_watch_progress(user_id);
create index if not exists idx_video_watch_progress_segment on video_watch_progress(video_segment_id);
create index if not exists idx_video_watch_progress_completed on video_watch_progress(is_completed);

-- RLS Policies
alter table video_sources enable row level security;
alter table video_segments enable row level security;
alter table video_watch_progress enable row level security;

-- Video Sources: Users can read all, but only manage their own
create policy "Anyone can view video sources" on video_sources
  for select using (true);

create policy "Users can insert their own video sources" on video_sources
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own video sources" on video_sources
  for update using (auth.uid() = user_id);

create policy "Users can delete their own video sources" on video_sources
  for delete using (auth.uid() = user_id);

-- Video Segments: All authenticated users can view
create policy "Anyone can view video segments" on video_segments
  for select using (true);

create policy "Service role can manage video segments" on video_segments
  for all using (auth.role() = 'service_role');

-- Watch Progress: Users can only see and manage their own
create policy "Users can view their own watch progress" on video_watch_progress
  for select using (auth.uid() = user_id);

create policy "Users can insert their own watch progress" on video_watch_progress
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own watch progress" on video_watch_progress
  for update using (auth.uid() = user_id);

-- Updated_at triggers
do $$ begin
  if exists (select 1 from pg_proc where proname = 'update_updated_at_column') then
    if not exists (select 1 from pg_trigger where tgname = 'update_video_sources_updated_at') then
      create trigger update_video_sources_updated_at before update on video_sources
        for each row execute function update_updated_at_column();
    end if;

    if not exists (select 1 from pg_trigger where tgname = 'update_video_segments_updated_at') then
      create trigger update_video_segments_updated_at before update on video_segments
        for each row execute function update_updated_at_column();
    end if;
  end if;
end $$;

-- Statistics view
create or replace view video_review_stats as
select
  vs.system,
  count(distinct vs.id) as total_videos,
  count(distinct vseg.id) as total_segments,
  sum(vs.duration_seconds) / 60 as total_minutes,
  count(distinct vwp.user_id) as unique_viewers,
  avg(case when vwp.is_completed then 1 else 0 end) as completion_rate
from video_sources vs
left join video_segments vseg on vseg.video_source_id = vs.id
left join video_watch_progress vwp on vwp.video_segment_id = vseg.id
group by vs.system
order by vs.system;
