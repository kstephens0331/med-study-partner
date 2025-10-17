-- Optimize RLS Policies for Better Query Performance
-- This migration replaces auth.uid() with (select auth.uid()) in all RLS policies
-- to prevent unnecessary re-evaluation for each row.

-- Drop and recreate policies for blocks table
drop policy if exists "Users can manage own blocks" on blocks;
create policy "Users can manage own blocks" on blocks
  for all using ((select auth.uid()) = user_id);

-- Drop and recreate policies for lectures table
drop policy if exists "Users can manage own lectures" on lectures;
create policy "Users can manage own lectures" on lectures
  for all using ((select auth.uid()) = user_id);

-- Drop and recreate policies for lecture_packs table
drop policy if exists "Users can manage own lecture_packs" on lecture_packs;
create policy "Users can manage own lecture_packs" on lecture_packs
  for all using (
    exists (
      select 1 from lectures
      where lectures.id = lecture_packs.lecture_id
      and lectures.user_id = (select auth.uid())
    )
  );

-- Drop and recreate policies for materials table
drop policy if exists "Users can manage own materials" on materials;
create policy "Users can manage own materials" on materials
  for all using ((select auth.uid()) = user_id);

-- Drop and recreate policies for material_packs table
drop policy if exists "Users can manage own material_packs" on material_packs;
create policy "Users can manage own material_packs" on material_packs
  for all using (
    exists (
      select 1 from materials
      where materials.id = material_packs.material_id
      and materials.user_id = (select auth.uid())
    )
  );

-- Drop and recreate policies for cards table
drop policy if exists "Users can manage own cards" on cards;
create policy "Users can manage own cards" on cards
  for all using ((select auth.uid()) = user_id);

-- Drop and recreate policies for reviews table
drop policy if exists "Users can manage own reviews" on reviews;
create policy "Users can manage own reviews" on reviews
  for all using ((select auth.uid()) = user_id);

-- Drop and recreate policies for mastery table
drop policy if exists "Users can manage own mastery" on mastery;
create policy "Users can manage own mastery" on mastery
  for all using ((select auth.uid()) = user_id);

-- Drop and recreate policies for sessions table
drop policy if exists "Users can manage own sessions" on sessions;
create policy "Users can manage own sessions" on sessions
  for all using ((select auth.uid()) = user_id);

-- Drop and recreate policies for attempts table
drop policy if exists "Users can manage own attempts" on attempts;
create policy "Users can manage own attempts" on attempts
  for all using (
    exists (
      select 1 from sessions
      where sessions.id = attempts.session_id
      and sessions.user_id = (select auth.uid())
    )
  );

-- Drop and recreate policies for skill_progress table
drop policy if exists "Users can access own skill_progress" on skill_progress;
create policy "Users can access own skill_progress" on skill_progress
  for all using ((select auth.uid()) = user_id);
